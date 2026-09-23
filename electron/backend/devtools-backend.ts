import * as NodeSocketServer from "@effect/platform-node/NodeSocketServer"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as FiberHandle from "effect/FiberHandle"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import * as DevToolsServer from "effect/unstable/devtools/DevToolsServer"
import type * as DevToolsSchema from "effect/unstable/devtools/DevToolsSchema"
import * as SocketServer from "effect/unstable/socket/SocketServer"
import path from "node:path"
import { shell } from "electron"
import type { BackendCommand, BackendSnapshot } from "../../src/lib/contracts/backend.js"
import type { ClientRecord, RunningState } from "../../src/lib/contracts/clients.js"
import type { DebugStateSnapshot, LocationRecord, VariableRecord } from "../../src/lib/contracts/debug.js"
import type { MetricRecord } from "../../src/lib/contracts/metrics.js"
import type { TraceEventRecord, TraceSpanRecord } from "../../src/lib/contracts/tracer.js"
import { DebugSessionAdapter } from "./debug-session-adapter.js"

interface InternalSpanRecord {
  id: string
  traceId: string
  spanId: string
  name: string
  external: boolean
  parentId?: string
  attributes: Map<string, unknown>
  status?: DevToolsSchema.Span["status"]
  events: DevToolsSchema.SpanEvent[]
}

interface ClientState {
  id: number
  name: string
  connectedAt: number
  lastSeenAt: number
  status: "connected" | "disconnected"
  disconnectSignal: Deferred.Deferred<void>
  send: (response: DevToolsSchema.Response.WithoutPong) => Effect.Effect<void>
  metrics: MetricRecord[]
  spans: Map<string, InternalSpanRecord>
}

interface BackendState {
  nextClientId: number
  activeClientId: number | null
  runningState: RunningState
  clients: Map<number, ClientState>
}

const APP_NAME = "Effect DevTools"
const APP_VERSION = "1.0.0"
const DEFAULT_PORT = 34437
const METRICS_POLL_INTERVAL = 500
const CLIENT_SWEEP_INTERVAL = 1000
const STALE_CLIENT_TIMEOUT = 10_000

const makeDevtoolsBackendService = Effect.gen(function*() {
    const stateRef = yield* SubscriptionRef.make(makeInitialBackendState())
    const serverHandle = yield* FiberHandle.make<void, never>()
    const metricsHandle = yield* FiberHandle.make<void, never>()
    const sweepHandle = yield* FiberHandle.make<void, never>()

    const updateState = (update: (state: BackendState) => BackendState) => SubscriptionRef.update(stateRef, update)

    function refreshMetricsPolling(): Effect.Effect<void> {
      return Effect.gen(function*() {
        const state = yield* SubscriptionRef.get(stateRef)
        const activeClient = getActiveClient(state)

        if (!state.runningState.running || !activeClient) {
          yield* FiberHandle.clear(metricsHandle)
          return
        }

        const loop = Effect.gen(function*() {
          while (true) {
            const currentState = yield* SubscriptionRef.get(stateRef)
            const currentClient = getActiveClient(currentState)

            if (!currentState.runningState.running || !currentClient || currentClient.id !== activeClient.id) {
              return
            }

            yield* requestMetrics(currentClient.id)
            yield* Effect.sleep(METRICS_POLL_INTERVAL)
          }
        })

        yield* FiberHandle.run(metricsHandle, loop).pipe(Effect.asVoid)
      })
    }

    function refreshClientSweep(): Effect.Effect<void> {
      return Effect.gen(function*() {
        const state = yield* SubscriptionRef.get(stateRef)
        if (!state.runningState.running) {
          yield* FiberHandle.clear(sweepHandle)
          return
        }

        const loop = Effect.gen(function*() {
          while (true) {
            const currentState = yield* SubscriptionRef.get(stateRef)
            if (!currentState.runningState.running) {
              return
            }

            yield* sweepStaleClients()
            yield* Effect.sleep(CLIENT_SWEEP_INTERVAL)
          }
        })

        yield* FiberHandle.run(sweepHandle, loop).pipe(Effect.asVoid)
      })
    }

    function reconcileBackgroundFibers(): Effect.Effect<void> {
      return Effect.gen(function*() {
        yield* refreshMetricsPolling()
        yield* refreshClientSweep()
      })
    }

    function requestMetrics(clientId: number): Effect.Effect<void> {
      return Effect.gen(function*() {
        const state = yield* SubscriptionRef.get(stateRef)
        const client = state.clients.get(clientId)

        if (!client || !isClientConnected(client)) {
          return
        }

        yield* client.send({ _tag: "MetricsRequest" }).pipe(
          Effect.catchCause((cause) =>
            Cause.hasInterruptsOnly(cause)
              ? Effect.void
              : Effect.gen(function*() {
                  yield* Effect.logError(Cause.pretty(cause))
                  const changed = yield* SubscriptionRef.modify(stateRef, (currentState) => markClientDisconnected(currentState, clientId))
                  if (changed) {
                    yield* reconcileBackgroundFibers()
                  }
                }))
        )
      })
    }

    function sweepStaleClients(): Effect.Effect<void> {
      return Effect.gen(function*() {
        const changed = yield* SubscriptionRef.modify(stateRef, sweepDisconnectedClients)
        if (changed) {
          yield* refreshMetricsPolling()
        }
      })
    }

    function ingestClientMessage(clientId: number, message: DevToolsSchema.Request.WithoutPing): Effect.Effect<void> {
      return Effect.gen(function*() {
        const shouldRefreshMetrics = yield* SubscriptionRef.modify(stateRef, (state) => {
          const client = state.clients.get(clientId)
          if (!client) {
            return [false, state] as const
          }

          const selectedBefore = getActiveClient(state)?.id ?? null
          const wasConnected = isClientConnected(client)
          const nextState = applyClientMessage(state, clientId, message)
          const selectedAfter = getActiveClient(nextState)?.id ?? null

          return [selectedBefore !== selectedAfter || !wasConnected, nextState] as const
        })

        if (shouldRefreshMetrics) {
          yield* refreshMetricsPolling()
        }
      })
    }

    function addClient(client: DevToolsServer.Client, disconnectSignal: Deferred.Deferred<void>): Effect.Effect<number> {
      return Effect.gen(function*() {
        const id = yield* SubscriptionRef.modify(stateRef, (state) => {
          const nextId = state.nextClientId
          const now = Date.now()
          const nextClient: ClientState = {
            id: nextId,
            name: `Client #${nextId}`,
            connectedAt: now,
            lastSeenAt: now,
            status: "connected",
            disconnectSignal,
            send: client.send,
            metrics: [],
            spans: new Map()
          }

          const nextState = ensureActiveClientSelection({
            ...state,
            nextClientId: nextId + 1,
            clients: setClient(state.clients, nextClient)
          })

          return [nextId, nextState] as const
        })

        yield* reconcileBackgroundFibers()
        return id
      })
    }

    function handleClient(client: DevToolsServer.Client) {
      return Effect.gen(function*() {
        const disconnectSignal = yield* Deferred.make<void>()
        const clientId = yield* addClient(client, disconnectSignal)

        yield* Effect.addFinalizer(() =>
          Effect.gen(function*() {
            const changed = yield* SubscriptionRef.modify(stateRef, (state) => markClientDisconnected(state, clientId))
            if (changed) {
              yield* reconcileBackgroundFibers()
            }
          }))

        yield* Queue.take(client.queue).pipe(
          Effect.flatMap((message) => ingestClientMessage(clientId, message)),
          Effect.forever,
          Effect.race(Deferred.await(disconnectSignal)),
          Effect.catchCause((cause) => Cause.hasInterruptsOnly(cause) ? Effect.void : Effect.logError(Cause.pretty(cause)))
        )
      })
    }

    return {
      changes: SubscriptionRef.changes(stateRef).pipe(Stream.map((state) => createBackendSnapshot(state))),
      snapshot: SubscriptionRef.get(stateRef).pipe(Effect.map((state) => createBackendSnapshot(state))),
      startServer: Effect.gen(function*() {
        const state = yield* SubscriptionRef.get(stateRef)
        if (state.runningState.running || state.runningState.message.startsWith("Starting server on port ")) {
          return
        }

        const port = state.runningState.port

        yield* updateState((currentState) => ({
          ...currentState,
          runningState: {
            ...currentState.runningState,
            error: undefined,
            message: `Starting server on port ${currentState.runningState.port}`
          }
        }))

        const serverProgram = DevToolsServer.run(handleClient).pipe(
          Effect.provideServiceEffect(
            SocketServer.SocketServer,
            NodeSocketServer.makeWebSocket({ port }).pipe(
              Effect.tap(() =>
                updateState((currentState) => ({
                  ...currentState,
                  runningState: {
                    ...currentState.runningState,
                    running: true,
                    error: undefined,
                    message: `Server listening on port ${currentState.runningState.port}`
                  }
                })).pipe(Effect.andThen(reconcileBackgroundFibers()))
              )
            )
          ),
          Effect.scoped,
          Effect.catchCause((cause) =>
            Cause.hasInterruptsOnly(cause)
              ? Effect.void
              : Effect.gen(function*() {
                  yield* Effect.logError(Cause.pretty(cause))
                  yield* updateState((currentState) => ({
                    ...currentState,
                    runningState: {
                      ...currentState.runningState,
                      running: false,
                      error: formatServerStartError(cause, currentState.runningState.port),
                      message: `Error starting server on port ${currentState.runningState.port}`
                    }
                  }))
                  yield* reconcileBackgroundFibers()
                }))
        )

        yield* FiberHandle.run(serverHandle, serverProgram).pipe(Effect.asVoid)
      }),
      stopServer: Effect.gen(function*() {
        yield* FiberHandle.clear(serverHandle)
        yield* FiberHandle.clear(metricsHandle)
        yield* FiberHandle.clear(sweepHandle)
        yield* updateState((state) => ({
          nextClientId: 1,
          activeClientId: null,
          clients: new Map(),
          runningState: {
            running: false,
            port: state.runningState.port,
            message: "Server disabled"
          }
        }))
      }),
      selectClient: (clientId: number) =>
        updateState((state) => {
          const client = state.clients.get(clientId)
          return ensureActiveClientSelection({
            ...state,
            activeClientId: client && isClientConnected(client) ? clientId : state.activeClientId
          })
        }).pipe(Effect.andThen(refreshMetricsPolling())),
      disconnectClient: (clientId: number) =>
        Effect.gen(function*() {
          const disconnectSignal = yield* SubscriptionRef.modify(stateRef, (state) => {
            const client = state.clients.get(clientId)
            if (!client) {
              return [undefined, state] as const
            }

            const [, nextState] = markClientDisconnected(state, clientId)
            return [client.disconnectSignal, nextState] as const
          })

          if (disconnectSignal) {
            yield* Deferred.succeed(disconnectSignal, void 0).pipe(
              Effect.catchCause((cause) => Cause.hasInterruptsOnly(cause) ? Effect.void : Effect.logWarning(Cause.pretty(cause)))
            )
            yield* reconcileBackgroundFibers()
          }
        }),
      removeClient: (clientId: number) =>
        updateState((state) => removeClientById(state, clientId)).pipe(Effect.andThen(refreshMetricsPolling())),
      resetMetrics: Effect.gen(function*() {
        const clientId = yield* SubscriptionRef.modify(stateRef, (state) => {
          const selectedClient = getSelectedClient(state)
          if (!selectedClient) {
            return [undefined, state] as const
          }

          const nextState = setClientState(state, {
            ...selectedClient,
            metrics: []
          })

          return [isClientConnected(selectedClient) ? selectedClient.id : undefined, nextState] as const
        })

        if (clientId !== undefined) {
          yield* requestMetrics(clientId)
        }
      }),
      resetTracer: updateState((state) => {
        const selectedClient = getSelectedClient(state)
        if (!selectedClient) {
          return state
        }

        return setClientState(state, {
          ...selectedClient,
          spans: new Map()
        })
      })
    }
  })

type DevtoolsBackendServiceApi = Effect.Success<typeof makeDevtoolsBackendService>

class DevtoolsBackendService extends Context.Service<DevtoolsBackendService, DevtoolsBackendServiceApi>()(
  "DevtoolsBackendService",
  { make: makeDevtoolsBackendService }
) {}

const DevtoolsBackendServiceLayer = Layer.effect(DevtoolsBackendService, DevtoolsBackendService.make)

export class DevtoolsBackend {
  private readonly listeners = new Set<(snapshot: BackendSnapshot) => void>()
  private readonly runtime = ManagedRuntime.make(DevtoolsBackendServiceLayer)
  private readonly debugAdapter = new DebugSessionAdapter()
  private latestSnapshot = createBackendSnapshot(makeInitialBackendState(), this.debugAdapter.getSnapshot())

  constructor() {
    this.debugAdapter.subscribe((debug) => {
      this.latestSnapshot = { ...this.latestSnapshot, debug }
      this.emitSnapshot()
    })
    this.debugAdapter.start()
    this.runtime.runFork(
      Stream.unwrap(
        Effect.map(DevtoolsBackendService, (service) => service.changes)
      ).pipe(
        Stream.runForEach((snapshot) =>
          Effect.sync(() => {
            this.latestSnapshot = { ...snapshot, debug: this.debugAdapter.getSnapshot() }
            this.emitSnapshot()
          }))
      )
    )
  }

  subscribe(listener: (snapshot: BackendSnapshot) => void): () => void {
    this.listeners.add(listener)
    listener(this.latestSnapshot)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot(): BackendSnapshot {
    return this.latestSnapshot
  }

  async dispatch(command: BackendCommand): Promise<void> {
    switch (command.type) {
      case "server:start": {
        await this.runCommand((service) => service.startServer)
        return
      }
      case "server:stop": {
        await this.runCommand((service) => service.stopServer)
        return
      }
      case "client:select": {
        await this.runCommand((service) => service.selectClient(command.clientId))
        return
      }
      case "client:disconnect": {
        await this.runCommand((service) => service.disconnectClient(command.clientId))
        return
      }
      case "client:remove": {
        await this.runCommand((service) => service.removeClient(command.clientId))
        return
      }
      case "metrics:reset": {
        await this.runCommand((service) => service.resetMetrics)
        return
      }
      case "tracer:reset":
      case "timeline:reset": {
        await this.runCommand((service) => service.resetTracer)
        return
      }
      case "reveal-location": {
        await this.revealLocation(command.location)
        return
      }
      case "debug:variables:load": {
        await this.debugAdapter.loadVariables(command.variableId)
        return
      }
      case "debug:fiber:interrupt": {
        await this.debugAdapter.interruptFiber(command.fiberId)
        return
      }
      case "debug:breakpoints:toggle-pause-on-defects": {
        await this.debugAdapter.togglePauseOnDefects()
        return
      }
      case "debug:span-stack:set-ignore-list-enabled": {
        this.debugAdapter.setSpanStackIgnoreListEnabled(command.enabled)
        return
      }
      case "debug:snapshot:refresh": {
        await this.debugAdapter.refresh()
      }
    }
  }

  async dispose(): Promise<void> {
    await Promise.all([this.runtime.dispose(), this.debugAdapter.dispose()])
  }

  private async runCommand(run: (service: DevtoolsBackendServiceApi) => Effect.Effect<void>): Promise<void> {
    await this.runtime.runPromise(Effect.flatMap(DevtoolsBackendService, run))
    const snapshot = await this.runtime.runPromise(Effect.flatMap(DevtoolsBackendService, (service) => service.snapshot))
    this.latestSnapshot = { ...snapshot, debug: this.debugAdapter.getSnapshot() }
  }

  private async revealLocation(location: LocationRecord): Promise<void> {
    const absolutePath = path.isAbsolute(location.path)
      ? location.path
      : path.resolve(process.cwd(), location.path)

    const openResult = await shell.openPath(absolutePath)
    if (openResult) {
      shell.showItemInFolder(absolutePath)
    }
  }

  private emitSnapshot(): void {
    for (const listener of this.listeners) listener(this.latestSnapshot)
  }
}

function makeInitialBackendState(): BackendState {
  return {
    nextClientId: 1,
    activeClientId: null,
    clients: new Map(),
    runningState: {
      running: false,
      port: DEFAULT_PORT,
      message: "Server disabled"
    }
  }
}

function createBackendSnapshot(state: BackendState, debug?: DebugStateSnapshot): BackendSnapshot {
  const selectedClient = getSelectedClient(state)

  return {
    appName: APP_NAME,
    version: APP_VERSION,
    clients: {
      runningState: { ...state.runningState },
      clients: [...state.clients.values()]
        .sort((left, right) => left.id - right.id)
        .map((client) => toClientRecord(client, state.activeClientId))
    },
    metrics: {
      metrics: selectedClient?.metrics ?? []
    },
    tracer: createTracerSnapshot(selectedClient),
    debug: debug ?? {
      status: "unavailable",
      message: "Starting debug-session bridge...",
      bridgePort: 34438,
      context: [],
      spanStack: [],
      spanStackIgnoreListEnabled: true,
      fibers: [],
      breakpoints: { pauseOnDefects: false, values: [] }
    }
  }
}

function setClient(clients: Map<number, ClientState>, client: ClientState): Map<number, ClientState> {
  const nextClients = new Map(clients)
  nextClients.set(client.id, client)
  return nextClients
}

function setClientState(state: BackendState, client: ClientState): BackendState {
  return {
    ...state,
    clients: setClient(state.clients, client)
  }
}

function removeClientById(state: BackendState, clientId: number): BackendState {
  if (!state.clients.has(clientId)) {
    return state
  }

  const nextClients = new Map(state.clients)
  nextClients.delete(clientId)

  return ensureActiveClientSelection({
    ...state,
    clients: nextClients,
    activeClientId: state.activeClientId === clientId ? null : state.activeClientId
  })
}

function getSelectedClient(state: BackendState): ClientState | undefined {
  return state.activeClientId === null ? undefined : state.clients.get(state.activeClientId)
}

function getActiveClient(state: BackendState): ClientState | undefined {
  const client = getSelectedClient(state)
  return client && isClientConnected(client) ? client : undefined
}

function ensureActiveClientSelection(state: BackendState): BackendState {
  const selected = getSelectedClient(state)
  if (selected && isClientConnected(selected)) {
    return state
  }

  const firstConnected = [...state.clients.values()].find((client) => isClientConnected(client))
  if (firstConnected) {
    return {
      ...state,
      activeClientId: firstConnected.id
    }
  }

  return {
    ...state,
    activeClientId: null
  }
}

function isClientConnected(client: ClientState): boolean {
  return client.status === "connected" && !isClientStale(client)
}

function isClientStale(client: ClientState): boolean {
  return client.status === "connected" && Date.now() - client.lastSeenAt > STALE_CLIENT_TIMEOUT
}

function markClientDisconnected(state: BackendState, clientId: number): readonly [boolean, BackendState] {
  const client = state.clients.get(clientId)
  if (!client || client.status === "disconnected") {
    return [false, state] as const
  }

  return [
    true,
    ensureActiveClientSelection(setClientState(state, {
      ...client,
      status: "disconnected"
    }))
  ] as const
}

function sweepDisconnectedClients(state: BackendState): readonly [boolean, BackendState] {
  let nextState = state
  let changed = false

  for (const client of state.clients.values()) {
    if (isClientStale(client)) {
      const [didChange, updatedState] = markClientDisconnected(nextState, client.id)
      changed = changed || didChange
      nextState = updatedState
    }
  }

  return [changed, nextState] as const
}

function applyClientMessage(
  state: BackendState,
  clientId: number,
  message: DevToolsSchema.Request.WithoutPing
): BackendState {
  const client = state.clients.get(clientId)
  if (!client) {
    return state
  }

  let spans = client.spans
  let metrics = client.metrics

  switch (message._tag) {
    case "MetricsSnapshot": {
      metrics = message.metrics.map(toMetricRecord)
      break
    }
    case "Span": {
      spans = registerSpan(client.spans, message)
      break
    }
    case "SpanEvent": {
      spans = registerSpanEvent(client.spans, message)
      break
    }
  }

  return ensureActiveClientSelection(setClientState(state, {
    ...client,
    lastSeenAt: Date.now(),
    status: "connected",
    metrics,
    spans
  }))
}

function toClientRecord(client: ClientState, activeClientId: number | null): ClientRecord {
  return {
    id: client.id,
    name: client.name,
    transport: "websocket",
    active: client.id === activeClientId,
    status: isClientConnected(client) ? "connected" : "disconnected",
    lastSeen: formatRelativeTime(client.lastSeenAt)
  }
}

function createTracerSnapshot(client: ClientState | undefined): BackendSnapshot["tracer"] {
  if (!client) {
    return { spans: [], events: [] }
  }

  const roots = buildTraceTree(client.spans)
  const events = buildTraceEvents(client.spans)
  return { spans: roots, events }
}

function toMetricRecord(metric: DevToolsSchema.Metric): MetricRecord {
  const tags = Object.entries(metric.attributes ?? {}).map(([key, value]) => ({ key, value }))
  const unit = metric.attributes?.unit ?? metric.attributes?.time_unit
  const unitSuffix = unit ? ` ${unit}` : ""

  switch (metric.type) {
    case "Counter":
      return {
        id: metric.id,
        name: metric.id,
        kind: metric.type,
        description: `${formatMetricNumber(metric.state.count)}${unitSuffix}`,
        tags,
        details: [{ key: "Count", value: `${formatMetricNumber(metric.state.count)}${unitSuffix}` }]
      }
    case "Gauge":
      return {
        id: metric.id,
        name: metric.id,
        kind: metric.type,
        description: `${formatMetricNumber(metric.state.value)}${unitSuffix}`,
        tags,
        details: [{ key: "Value", value: `${formatMetricNumber(metric.state.value)}${unitSuffix}` }]
      }
    case "Frequency":
      return {
        id: metric.id,
        name: metric.id,
        kind: metric.type,
        description: `${metric.state.occurrences.size} buckets`,
        tags,
        details: [...metric.state.occurrences.entries()]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, value]) => ({ key, value: String(value) }))
      }
    case "Histogram":
      return {
        id: metric.id,
        name: metric.id,
        kind: metric.type,
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
        value: `${formatMetricNumber(value ?? 0)}${unitSuffix}`
      }))

      return {
        id: metric.id,
        name: metric.id,
        kind: metric.type,
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

function registerSpan(spans: Map<string, InternalSpanRecord>, span: DevToolsSchema.Span): Map<string, InternalSpanRecord> {
  const parentState = span.parent._tag === "Some" ? registerParentSpan(spans, span.parent.value) : [spans, undefined] as const
  const nextSpans = new Map(parentState[0])
  const current = nextSpans.get(span.spanId)

  nextSpans.set(span.spanId, {
    id: span.spanId,
    traceId: span.traceId,
    spanId: span.spanId,
    name: span.name,
    external: false,
    parentId: parentState[1],
    attributes: new Map(span.attributes),
    status: span.status,
    events: current?.events ?? []
  })

  return nextSpans
}

function registerParentSpan(
  spans: Map<string, InternalSpanRecord>,
  span: DevToolsSchema.ParentSpan
): readonly [Map<string, InternalSpanRecord>, string] {
  if (span._tag === "ExternalSpan") {
    const nextSpans = new Map(spans)
    const current = nextSpans.get(span.spanId)
    nextSpans.set(span.spanId, {
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
    return [nextSpans, span.spanId] as const
  }

  return [registerSpan(spans, span), span.spanId] as const
}

function registerSpanEvent(spans: Map<string, InternalSpanRecord>, event: DevToolsSchema.SpanEvent): Map<string, InternalSpanRecord> {
  const nextSpans = new Map(spans)
  const current = nextSpans.get(event.spanId)
  if (!current) {
    nextSpans.set(event.spanId, {
      id: event.spanId,
      traceId: event.traceId,
      spanId: event.spanId,
      name: event.name,
      external: false,
      parentId: undefined,
      attributes: new Map(),
      events: [event]
    })
    return nextSpans
  }

  nextSpans.set(event.spanId, {
    ...current,
    events: [...current.events, event].sort((left, right) => bigintToNumber(left.startTime - right.startTime))
  })
  return nextSpans
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
      attributes: Object.entries(event.attributes ?? {}).map(([name, value]) => toVariableRecord(`${span.id}-${event.name}-${name}`, name, value))
    })),
    children
  }
}

function buildTraceEvents(spans: Map<string, InternalSpanRecord>): TraceEventRecord[] {
  const timedSpans = [...spans.values()]
    .filter((span): span is InternalSpanRecord & { status: DevToolsSchema.Span["status"] } => span.status !== undefined)
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

function formatEventOffset(span: InternalSpanRecord, event: DevToolsSchema.SpanEvent): string {
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

function formatServerStartError(cause: Cause.Cause<unknown>, port: number): string {
  const detail = Cause.pretty(cause)
  if (detail.includes("EADDRINUSE")) {
    return `Could not start the server because port ${port} is already in use. Stop the other DevTools server or change this app's port, then try again.`
  }

  return `Could not start the server on port ${port}. ${summarizeCause(detail)}`
}

function summarizeCause(detail: string): string {
  return detail
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== "Error")
    .find((line) => !line.startsWith("at "))
    ?? "Check the app logs for more details."
}

const TRACE_COLORS = ["#2f81f7", "#238636", "#db6d28", "#d29922", "#f85149"]

function isEndedSpan(
  span: InternalSpanRecord & { status: DevToolsSchema.Span["status"] }
): span is InternalSpanRecord & { status: Extract<DevToolsSchema.Span["status"], { _tag: "Ended" }> } {
  return span.status._tag === "Ended"
}
