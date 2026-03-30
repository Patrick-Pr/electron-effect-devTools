import * as Server from "@effect/experimental/DevTools/Server"
import type * as Domain from "@effect/experimental/DevTools/Domain"
import * as NodeSocketServer from "@effect/platform-node/NodeSocketServer"
import * as SocketServer from "@effect/platform/SocketServer"
import * as Cause from "effect/Cause"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import path from "node:path"
import { shell } from "electron"
import type { BackendCommand, BackendSnapshot } from "../../src/lib/contracts/backend.js"
import type { ClientRecord, RunningState } from "../../src/lib/contracts/clients.js"
import type { LocationRecord, VariableRecord } from "../../src/lib/contracts/debug.js"
import type { MetricRecord } from "../../src/lib/contracts/metrics.js"
import type { TraceEventRecord, TraceSpanRecord } from "../../src/lib/contracts/tracer.js"

interface InternalSpanRecord {
  id: string
  traceId: string
  spanId: string
  name: string
  external: boolean
  parentId?: string
  attributes: Map<string, unknown>
  status?: Domain.Span["status"]
  events: Domain.SpanEvent[]
}

interface ClientState {
  id: number
  name: string
  connectedAt: number
  lastSeenAt: number
  status: "connected" | "disconnected"
  disconnectSignal: Deferred.Deferred<void>
  request: (response: Domain.Response.WithoutPong) => Effect.Effect<void>
  metrics: MetricRecord[]
  spans: Map<string, InternalSpanRecord>
}

const APP_NAME = "Effect DevTools"
const APP_VERSION = "1.0.0"
const DEFAULT_PORT = 34437
const METRICS_POLL_INTERVAL = 500
const CLIENT_SWEEP_INTERVAL = 1000
const STALE_CLIENT_TIMEOUT = 10_000

export class DevtoolsBackend {
  private readonly listeners = new Set<(snapshot: BackendSnapshot) => void>()
  private readonly clients = new Map<number, ClientState>()
  private serverFiber: Fiber.RuntimeFiber<void, unknown> | null = null
  private metricsInterval: NodeJS.Timeout | null = null
  private clientSweepInterval: NodeJS.Timeout | null = null
  private nextClientId = 1
  private activeClientId: number | null = null
  private readonly runningState: RunningState = {
    running: false,
    port: DEFAULT_PORT,
    message: "Server disabled"
  }

  subscribe(listener: (snapshot: BackendSnapshot) => void): () => void {
    this.listeners.add(listener)
    listener(this.getSnapshot())
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot(): BackendSnapshot {
    const activeClient = this.getActiveClient()

    return {
      appName: APP_NAME,
      version: APP_VERSION,
      clients: {
        runningState: { ...this.runningState },
        clients: [...this.clients.values()]
          .sort((left, right) => left.id - right.id)
          .map((client) => this.toClientRecord(client))
      },
      metrics: {
        metrics: activeClient?.metrics ?? []
      },
      tracer: this.createTracerSnapshot(activeClient)
    }
  }

  async dispatch(command: BackendCommand): Promise<void> {
    switch (command.type) {
      case "server:start": {
        await this.startServer()
        return
      }
      case "server:stop": {
        await this.stopServer()
        return
      }
      case "client:select": {
        const client = this.clients.get(command.clientId)
        this.activeClientId = client && this.isClientConnected(client) ? command.clientId : this.activeClientId
        this.refreshMetricsPolling()
        this.emit()
        return
      }
      case "client:disconnect": {
        await this.disconnectClient(command.clientId)
        this.refreshMetricsPolling()
        this.emit()
        return
      }
      case "client:remove": {
        this.removeClient(command.clientId)
        this.refreshMetricsPolling()
        this.emit()
        return
      }
      case "metrics:reset": {
        const activeClient = this.getActiveClient()
        if (activeClient) {
          activeClient.metrics = []
          this.emit()
          await this.requestMetrics(activeClient)
        }
        return
      }
      case "tracer:reset":
      case "timeline:reset": {
        const activeClient = this.getActiveClient()
        if (activeClient) {
          activeClient.spans.clear()
          this.emit()
        }
        return
      }
      case "reveal-location": {
        await this.revealLocation(command.location)
      }
    }
  }

  async revealLocation(location: LocationRecord): Promise<void> {
    const absolutePath = path.isAbsolute(location.path)
      ? location.path
      : path.resolve(process.cwd(), location.path)

    const openResult = await shell.openPath(absolutePath)
    if (openResult) {
      shell.showItemInFolder(absolutePath)
    }
  }

  private async startServer(): Promise<void> {
    if (this.serverFiber !== null) {
      return
    }

    this.runningState.error = undefined
    this.runningState.message = `Starting server on port ${this.runningState.port}`
    this.startClientSweep()
    this.emit()

    const program = Server.run((client) => this.handleClient(client)).pipe(
      Effect.provideServiceEffect(
        SocketServer.SocketServer,
        NodeSocketServer.makeWebSocket({ port: this.runningState.port }).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              this.runningState.running = true
              this.runningState.error = undefined
              this.runningState.message = `Server listening on port ${this.runningState.port}`
              this.emit()
            }))
        )
      ),
      Effect.scoped,
      Effect.catchAllCause((cause) =>
        Effect.sync(() => {
          this.serverFiber = null
          this.runningState.running = false
          this.runningState.error = Cause.pretty(cause)
          this.runningState.message = `Error starting server on port ${this.runningState.port}`
          this.stopClientSweep()
          this.refreshMetricsPolling()
          this.emit()
        }))
    )

    this.serverFiber = Effect.runFork(program)
  }

  private async stopServer(): Promise<void> {
    const fiber = this.serverFiber
    this.serverFiber = null

    if (fiber) {
      await Effect.runPromise(Fiber.interrupt(fiber))
    }

    this.runningState.running = false
    this.runningState.error = undefined
    this.runningState.message = "Server disabled"
    this.stopClientSweep()
    this.clients.clear()
    this.activeClientId = null
    this.refreshMetricsPolling()
    this.emit()
  }

  private handleClient(client: Server.Client) {
    return Effect.gen(this, function*() {
      const id = this.nextClientId++
      const now = Date.now()
      const disconnectSignal = yield* Deferred.make<void>()
      const state: ClientState = {
        id,
        name: `Client #${id}`,
        connectedAt: now,
        lastSeenAt: now,
        status: "connected",
        disconnectSignal,
        request: client.request,
        metrics: [],
        spans: new Map()
      }

      this.clients.set(id, state)
      this.ensureActiveClientSelection()
      this.refreshMetricsPolling()
      this.emit()

      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          this.markClientDisconnected(state)
          this.ensureActiveClientSelection()
          this.refreshMetricsPolling()
          this.emit()
        }))

      yield* client.queue.take.pipe(
        Effect.tap((message) =>
          Effect.sync(() => {
            state.lastSeenAt = Date.now()
            state.status = "connected"
            this.handleClientMessage(state, message)
            this.ensureActiveClientSelection()
            this.emit()
          })),
        Effect.forever,
        Effect.race(Deferred.await(disconnectSignal)),
        Effect.catchAll(() => Effect.void)
      )
    })
  }

  private handleClientMessage(client: ClientState, message: Domain.Request.WithoutPing): void {
    switch (message._tag) {
      case "MetricsSnapshot": {
        client.metrics = message.metrics.map(toMetricRecord)
        return
      }
      case "Span": {
        registerSpan(client.spans, message)
        return
      }
      case "SpanEvent": {
        registerSpanEvent(client.spans, message)
      }
    }
  }

  private refreshMetricsPolling(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = null
    }

    const activeClient = this.getActiveClient()
    if (!this.runningState.running || !activeClient) {
      return
    }

    void this.requestMetrics(activeClient)
    this.metricsInterval = setInterval(() => {
      const currentActiveClient = this.getActiveClient()
      if (currentActiveClient) {
        void this.requestMetrics(currentActiveClient)
      }
    }, METRICS_POLL_INTERVAL)
  }

  private async requestMetrics(client: ClientState): Promise<void> {
    try {
      await Effect.runPromise(client.request({ _tag: "MetricsRequest" }))
    } catch {
      if (this.markClientDisconnected(client)) {
        this.ensureActiveClientSelection()
        this.refreshMetricsPolling()
        this.emit()
      }
    }
  }

  private getActiveClient(): ClientState | undefined {
    if (this.activeClientId === null) {
      return undefined
    }

    const client = this.clients.get(this.activeClientId)
    return client && this.isClientConnected(client) ? client : undefined
  }

  private startClientSweep(): void {
    if (this.clientSweepInterval) {
      return
    }

    this.clientSweepInterval = setInterval(() => {
      this.sweepStaleClients()
    }, CLIENT_SWEEP_INTERVAL)
  }

  private stopClientSweep(): void {
    if (this.clientSweepInterval) {
      clearInterval(this.clientSweepInterval)
      this.clientSweepInterval = null
    }
  }

  private sweepStaleClients(): void {
    let changed = false

    for (const client of this.clients.values()) {
      if (this.isClientStale(client) && this.markClientDisconnected(client)) {
        changed = true
      }
    }

    if (changed) {
      this.ensureActiveClientSelection()
      this.refreshMetricsPolling()
      this.emit()
    }
  }

  private ensureActiveClientSelection(): void {
    const activeClient = this.activeClientId === null ? undefined : this.clients.get(this.activeClientId)
    if (activeClient && this.isClientConnected(activeClient)) {
      return
    }

    this.activeClientId = this.getFirstConnectedClient()?.id ?? null
  }

  private getFirstConnectedClient(): ClientState | undefined {
    return [...this.clients.values()].find((client) => this.isClientConnected(client))
  }

  private isClientConnected(client: ClientState): boolean {
    return client.status === "connected" && !this.isClientStale(client)
  }

  private isClientStale(client: ClientState): boolean {
    return client.status === "connected" && Date.now() - client.lastSeenAt > STALE_CLIENT_TIMEOUT
  }

  private markClientDisconnected(client: ClientState): boolean {
    if (client.status === "disconnected") {
      return false
    }

    client.status = "disconnected"
    return true
  }

  private async disconnectClient(clientId: number): Promise<void> {
    const client = this.clients.get(clientId)
    if (!client) {
      return
    }

    const changed = this.markClientDisconnected(client)
    this.ensureActiveClientSelection()

    await Effect.runPromise(
      Deferred.succeed(client.disconnectSignal, void 0).pipe(
        Effect.catchAll(() => Effect.void)
      )
    )

    if (changed) {
      this.refreshMetricsPolling()
      this.emit()
    }
  }

  private removeClient(clientId: number): void {
    const client = this.clients.get(clientId)
    if (!client) {
      return
    }

    this.clients.delete(clientId)
    if (this.activeClientId === clientId) {
      this.activeClientId = null
    }
    this.ensureActiveClientSelection()
  }

  private emit(): void {
    const snapshot = this.getSnapshot()
    for (const listener of this.listeners) {
      listener(snapshot)
    }
  }

  private toClientRecord(client: ClientState): ClientRecord {
    return {
      id: client.id,
      name: client.name,
      transport: "websocket",
      active: client.id === this.activeClientId && this.isClientConnected(client),
      status: this.isClientConnected(client) ? "connected" : "disconnected",
      lastSeen: formatRelativeTime(client.lastSeenAt)
    }
  }

  private createTracerSnapshot(client: ClientState | undefined): BackendSnapshot["tracer"] {
    if (!client) {
      return { spans: [], events: [] }
    }

    const roots = buildTraceTree(client.spans)
    const events = buildTraceEvents(client.spans)
    return { spans: roots, events }
  }
}

function toMetricRecord(metric: Domain.Metric): MetricRecord {
  const tags = metric.tags.map((tag) => ({ key: tag.key, value: tag.value }))
  const unit = metric.tags.find((tag) => tag.key === "unit" || tag.key === "time_unit")?.value
  const unitSuffix = unit ? ` ${unit}` : ""

  switch (metric._tag) {
    case "Counter":
      return {
        id: metric.name,
        name: metric.name,
        kind: metric._tag,
        description: `${formatMetricNumber(metric.state.count)}${unitSuffix}`,
        tags,
        details: [{ key: "Count", value: `${formatMetricNumber(metric.state.count)}${unitSuffix}` }]
      }
    case "Gauge":
      return {
        id: metric.name,
        name: metric.name,
        kind: metric._tag,
        description: `${formatMetricNumber(metric.state.value)}${unitSuffix}`,
        tags,
        details: [{ key: "Value", value: `${formatMetricNumber(metric.state.value)}${unitSuffix}` }]
      }
    case "Frequency":
      return {
        id: metric.name,
        name: metric.name,
        kind: metric._tag,
        description: `${Object.keys(metric.state.occurrences).length} buckets`,
        tags,
        details: Object.entries(metric.state.occurrences)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, value]) => ({ key, value: String(value) }))
      }
    case "Histogram":
      return {
        id: metric.name,
        name: metric.name,
        kind: metric._tag,
        description: `${formatMetricNumber(metric.state.count)} samples`,
        tags,
        details: [
          { key: "Count", value: String(metric.state.count) },
          { key: "Min", value: `${formatMetricNumber(metric.state.min)}${unitSuffix}` },
          { key: "Max", value: `${formatMetricNumber(metric.state.max)}${unitSuffix}` },
          { key: "Sum", value: `${formatMetricNumber(metric.state.sum)}${unitSuffix}` }
        ]
      }
    case "Summary": {
      const quantiles = metric.state.quantiles.map(([quantile, value]) => ({
        key: `p${quantile * 100}`,
        value: `${formatMetricNumber(value._tag === "Some" ? value.value : 0)}${unitSuffix}`
      }))

      return {
        id: metric.name,
        name: metric.name,
        kind: metric._tag,
        description: quantiles[Math.floor(quantiles.length / 2)]?.value ?? `${formatMetricNumber(metric.state.count)} samples`,
        tags,
        details: [
          ...quantiles,
          { key: "Count", value: String(metric.state.count) },
          { key: "Min", value: `${formatMetricNumber(metric.state.min)}${unitSuffix}` },
          { key: "Max", value: `${formatMetricNumber(metric.state.max)}${unitSuffix}` },
          { key: "Sum", value: `${formatMetricNumber(metric.state.sum)}${unitSuffix}` }
        ]
      }
    }
  }
}

function registerSpan(spans: Map<string, InternalSpanRecord>, span: Domain.Span): void {
  const parentId = span.parent._tag === "Some" ? registerParentSpan(spans, span.parent.value) : undefined
  const current = spans.get(span.spanId)

  spans.set(span.spanId, {
    id: span.spanId,
    traceId: span.traceId,
    spanId: span.spanId,
    name: span.name,
    external: false,
    parentId,
    attributes: new Map(span.attributes),
    status: span.status,
    events: current?.events ?? []
  })
}

function registerParentSpan(spans: Map<string, InternalSpanRecord>, span: Domain.ParentSpan): string {
  if (span._tag === "ExternalSpan") {
    const current = spans.get(span.spanId)
    spans.set(span.spanId, {
      id: span.spanId,
      traceId: span.traceId,
      spanId: span.spanId,
      name: "External Span",
      external: true,
      parentId: undefined,
      attributes: current?.attributes ?? new Map(),
      status: current?.status,
      events: current?.events ?? []
    })
    return span.spanId
  }

  registerSpan(spans, span)
  return span.spanId
}

function registerSpanEvent(spans: Map<string, InternalSpanRecord>, event: Domain.SpanEvent): void {
  const current = spans.get(event.spanId)
  if (!current) {
    spans.set(event.spanId, {
      id: event.spanId,
      traceId: event.traceId,
      spanId: event.spanId,
      name: event.name,
      external: false,
      parentId: undefined,
      attributes: new Map(),
      events: [event]
    })
    return
  }

  current.events = [...current.events, event].sort((left, right) => bigintToNumber(left.startTime - right.startTime))
}

function buildTraceTree(spans: Map<string, InternalSpanRecord>): TraceSpanRecord[] {
  const childIdsByParentId = new Map<string, string[]>()
  const rootIds: string[] = []

  for (const span of spans.values()) {
    if (span.parentId) {
      const siblings = childIdsByParentId.get(span.parentId) ?? []
      siblings.push(span.id)
      childIdsByParentId.set(span.parentId, siblings)
    } else {
      rootIds.push(span.id)
    }
  }

  const sortedRootIds = rootIds.sort((left, right) => compareSpanStart(spans.get(left), spans.get(right)))

  return sortedRootIds
    .map((id) => toTraceSpanRecord(id, spans, childIdsByParentId))
    .filter((value): value is TraceSpanRecord => value !== undefined)
}

function toTraceSpanRecord(
  spanId: string,
  spans: Map<string, InternalSpanRecord>,
  childIdsByParentId: Map<string, string[]>
): TraceSpanRecord | undefined {
  const span = spans.get(spanId)
  if (!span) {
    return undefined
  }

  const location = parseTraceLocation(span.name, span.attributes.get("@effect/devtools/trace"))
  const sortedChildIds = [...(childIdsByParentId.get(spanId) ?? [])].sort((left, right) => compareSpanStart(spans.get(left), spans.get(right)))
  const children = sortedChildIds
    .map((id) => toTraceSpanRecord(id, spans, childIdsByParentId))
    .filter((value): value is TraceSpanRecord => value !== undefined)

  return {
    id: span.id,
    traceId: span.traceId,
    spanId: span.spanId,
    name: span.name,
    durationLabel: formatSpanDuration(span),
    location,
    attributes: [...span.attributes.entries()]
      .filter(([name]) => name !== "@effect/devtools/trace")
      .map(([name, value]) => toVariableRecord(`${span.id}-${name}`, name, value)),
    events: span.events.map((event, index) => ({
      id: `${span.id}-event-${index}`,
      name: event.name,
      offsetLabel: formatEventOffset(span, event),
      attributes: Object.entries(event.attributes).map(([name, value]) => toVariableRecord(`${span.id}-${event.name}-${name}`, name, value))
    })),
    children
  }
}

function buildTraceEvents(spans: Map<string, InternalSpanRecord>): TraceEventRecord[] {
  const timedSpans = [...spans.values()]
    .filter((span): span is InternalSpanRecord & { status: Domain.Span["status"] } => span.status !== undefined)
    .filter(isEndedSpan)
    .sort(compareSpanStart)

  if (timedSpans.length === 0) {
    return []
  }

  const minStart = Math.min(...timedSpans.map((span) => bigintToMilliseconds(span.status.startTime)))
  const depthById = new Map<string, number>()

  const computeDepth = (span: InternalSpanRecord): number => {
    const existing = depthById.get(span.id)
    if (existing !== undefined) {
      return existing
    }

    if (!span.parentId) {
      depthById.set(span.id, 0)
      return 0
    }

    const parent = spans.get(span.parentId)
    const depth = parent ? computeDepth(parent) + 1 : 0
    depthById.set(span.id, depth)
    return depth
  }

  return timedSpans.map((span) => {
    const depth = computeDepth(span)
    const startTime = bigintToMilliseconds(span.status.startTime)
    const endTime = bigintToMilliseconds(span.status.endTime)

    return {
      id: span.id,
      name: span.name,
      startTime: startTime - minStart,
      endTime: endTime - minStart,
      depth,
      color: span.name === "External Span" ? "#9e6cff" : TRACE_COLORS[depth % TRACE_COLORS.length]
    }
  })
}

function formatSpanDuration(span: InternalSpanRecord): string | undefined {
  if (!span.status || span.status._tag !== "Ended") {
    return undefined
  }

  return formatMilliseconds(bigintToNumber(span.status.endTime - span.status.startTime) / 1_000_000)
}

function formatEventOffset(span: InternalSpanRecord, event: Domain.SpanEvent): string {
  if (!span.status) {
    return "+0 ms"
  }

  const start = span.status.startTime
  return `+${formatMilliseconds(bigintToNumber(event.startTime - start) / 1_000_000)}`
}

function parseTraceLocation(spanName: string, value: unknown): LocationRecord | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const prefix = `${spanName} (`
  if (!value.startsWith(prefix) || !value.endsWith(")")) {
    return undefined
  }

  const body = value.slice(prefix.length, -1)
  const match = /^(.*):(\d+):(\d+)$/.exec(body)
  if (!match) {
    return undefined
  }

  return {
    path: match[1],
    line: Number(match[2]),
    column: Number(match[3])
  }
}

function toVariableRecord(id: string, name: string, value: unknown): VariableRecord {
  return {
    id,
    name,
    value: typeof value === "string" ? value : JSON.stringify(value)
  }
}

function compareSpanStart(left: InternalSpanRecord | undefined, right: InternalSpanRecord | undefined): number {
  const leftStart = left?.status?.startTime
  const rightStart = right?.status?.startTime

  if (leftStart && rightStart) {
    return bigintToNumber(leftStart - rightStart)
  }

  if (leftStart) {
    return -1
  }

  if (rightStart) {
    return 1
  }

  return (left?.name ?? "").localeCompare(right?.name ?? "")
}

function formatMetricNumber(value: number | bigint): string {
  return typeof value === "bigint" ? value.toString() : Math.round(value * 100) / 100 + ""
}

function formatMilliseconds(value: number): string {
  if (value >= 1000) {
    return `${(Math.round((value / 1000) * 10) / 10).toLocaleString()} s`
  }

  return `${Math.round(value)} ms`
}

function bigintToNumber(value: bigint): number {
  return Number(value)
}

function bigintToMilliseconds(value: bigint): number {
  return Number(value) / 1_000_000
}

function formatRelativeTime(timestamp: number): string {
  const elapsed = Math.max(0, Date.now() - timestamp)
  if (elapsed < 1000) {
    return "just now"
  }

  const seconds = Math.round(elapsed / 1000)
  if (seconds < 60) {
    return `${seconds}s ago`
  }

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m ago`
  }

  const hours = Math.round(minutes / 60)
  return `${hours}h ago`
}

const TRACE_COLORS = ["#2f81f7", "#238636", "#db6d28", "#d29922", "#f85149"]

function isEndedSpan(
  span: InternalSpanRecord & { status: Domain.Span["status"] }
): span is InternalSpanRecord & { status: Extract<Domain.Span["status"], { _tag: "Ended" }> } {
  return span.status._tag === "Ended"
}
