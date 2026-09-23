import { randomBytes, timingSafeEqual } from "node:crypto"
import * as Schema from "effect/Schema"
import { WebSocket, WebSocketServer, type RawData } from "ws"
import type {
  DebugAdapterCommand,
  DebugBridgeClientMessage,
  DebugBridgeServerMessage,
  DebugStateSnapshot,
  FiberRecord,
  VariableRecord
} from "../../src/lib/contracts/debug.js"

const DEFAULT_DEBUG_BRIDGE_PORT = 34438
const REQUEST_TIMEOUT_MS = 5_000
const MAX_DEBUG_PAYLOAD_BYTES = 256 * 1024
const MAX_TEXT_LENGTH = 16_384
const MAX_ID_LENGTH = 512
const MAX_VARIABLE_DEPTH = 8
const MAX_FIBER_DEPTH = 8
const MAX_VARIABLES_PER_LEVEL = 256
const MAX_CONTEXT_ENTRIES = 256
const MAX_SPAN_STACK_ENTRIES = 512
const MAX_FIBERS_PER_LEVEL = 512
const DEBUG_PROTOCOL_PREFIX = "effect-devtools-debug"

const BoundedText = Schema.String.check(Schema.isMaxLength(MAX_TEXT_LENGTH))
const BoundedId = Schema.String.check(Schema.isMaxLength(MAX_ID_LENGTH))
const FiniteInteger = Schema.Int
const LocationSchema = Schema.Struct({ path: BoundedText, line: FiniteInteger, column: FiniteInteger })

const boundedArray = (item: any, maximum: number): any =>
  Schema.Array(item).check(Schema.isMaxLength(maximum))

function makeVariableSchema(depth: number): any {
  const children = depth < MAX_VARIABLE_DEPTH
    ? boundedArray(makeVariableSchema(depth + 1), MAX_VARIABLES_PER_LEVEL)
    : boundedArray(Schema.Never, 1)
  return Schema.Struct({
    id: BoundedId,
    name: BoundedText,
    value: BoundedText,
    isContainer: Schema.optional(Schema.Boolean),
    children: Schema.optional(children),
    childrenLoaded: Schema.optional(Schema.Boolean)
  })
}

const VariableSchema = makeVariableSchema(0)
const VariableArraySchema = boundedArray(VariableSchema, MAX_VARIABLES_PER_LEVEL)
const ContextTagSchema = Schema.Struct({ id: BoundedId, tag: BoundedText, preview: BoundedText, children: VariableArraySchema })
const SpanStackSchema = Schema.Struct({
  id: BoundedId,
  name: BoundedText,
  location: Schema.optional(LocationSchema),
  stackIndex: FiniteInteger,
  ignored: Schema.optional(Schema.Boolean),
  attributes: VariableArraySchema
})

function makeFiberSchema(depth: number): any {
  const children = depth < MAX_FIBER_DEPTH
    ? boundedArray(makeFiberSchema(depth + 1), MAX_FIBERS_PER_LEVEL)
    : boundedArray(Schema.Never, 1)
  return Schema.Struct({
    id: BoundedId,
    current: Schema.Boolean,
    interrupted: Schema.Boolean,
    interruptible: Schema.Boolean,
    interruptionRequested: Schema.optional(Schema.Boolean),
    currentSpan: Schema.optional(BoundedText),
    location: Schema.optional(LocationSchema),
    tooltip: Schema.optional(BoundedText),
    startedAt: BoundedText,
    lifetime: BoundedText,
    attributes: VariableArraySchema,
    children: Schema.optional(children)
  })
}

const FiberSchema = makeFiberSchema(0)
const BreakpointSchema = Schema.Struct({ pauseOnDefects: Schema.Boolean, values: VariableArraySchema })
const DebugWireSnapshotSchema = Schema.Struct({
  status: Schema.Literals(["running", "paused"]),
  threadId: Schema.optional(FiniteInteger),
  context: boundedArray(ContextTagSchema, MAX_CONTEXT_ENTRIES),
  spanStack: boundedArray(SpanStackSchema, MAX_SPAN_STACK_ENTRIES),
  fibers: boundedArray(FiberSchema, MAX_FIBERS_PER_LEVEL),
  breakpoints: BreakpointSchema
})

const DebugBridgeClientMessageSchema = Schema.Union([
  Schema.Struct({ type: Schema.Literal("debug:attach"), sessionId: BoundedId, sessionName: Schema.optional(BoundedText) }),
  Schema.Struct({ type: Schema.Literal("debug:snapshot"), sessionId: BoundedId, snapshot: DebugWireSnapshotSchema }),
  Schema.Struct({ type: Schema.Literal("debug:continued"), sessionId: BoundedId, threadId: Schema.optional(FiniteInteger) }),
  Schema.Struct({ type: Schema.Literal("debug:detach"), sessionId: BoundedId }),
  Schema.Struct({
    type: Schema.Literal("debug:response"),
    requestId: BoundedId,
    ok: Schema.Boolean,
    variables: Schema.optional(VariableArraySchema),
    message: Schema.optional(BoundedText)
  })
])

export function decodeDebugBridgeClientMessage(input: unknown): DebugBridgeClientMessage | undefined {
  const result = Schema.decodeUnknownResult(DebugBridgeClientMessageSchema as any, {
    errors: "first",
    onExcessProperty: "error"
  })(input)
  return result._tag === "Success" ? result.success as DebugBridgeClientMessage : undefined
}

interface PendingRequest {
  command: DebugAdapterCommand
  resolve: (message: Extract<DebugBridgeClientMessage, { type: "debug:response" }>) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
}

interface DebugSessionAdapterOptions {
  port?: number
  protocol?: string
}

export class DebugSessionAdapter {
  private readonly listeners = new Set<(snapshot: DebugStateSnapshot) => void>()
  private readonly pending = new Map<string, PendingRequest>()
  private readonly protocol: string
  private readonly configuredPort: number
  private bridgePort: number
  private server: WebSocketServer | undefined
  private socket: WebSocket | undefined
  private nextRequestId = 1
  private snapshot: DebugStateSnapshot

  constructor(options: DebugSessionAdapterOptions = {}) {
    this.configuredPort = options.port ?? DEFAULT_DEBUG_BRIDGE_PORT
    this.bridgePort = this.configuredPort
    this.protocol = options.protocol ?? `${DEBUG_PROTOCOL_PREFIX}.${randomBytes(32).toString("base64url")}`
    this.snapshot = makeInitialSnapshot(this.bridgePort)
  }

  /** Credentials are intended for the trusted debugger relay launched by Electron. */
  getConnectionOptions(): Readonly<{ port: number; protocol: string }> {
    return { port: this.bridgePort, protocol: this.protocol }
  }

  start(): void {
    if (this.server) return
    const server = new WebSocketServer({
      host: "127.0.0.1",
      port: this.configuredPort,
      maxPayload: MAX_DEBUG_PAYLOAD_BYTES,
      perMessageDeflate: false,
      verifyClient: ({ origin, req }, done) => {
        const hasBrowserOrigin = typeof origin === "string" && origin.length > 0
        const authenticated = !hasBrowserOrigin && hasRequestedProtocol(req.headers["sec-websocket-protocol"], this.protocol)
        done(authenticated, authenticated ? undefined : 401, authenticated ? undefined : "Unauthorized debug bridge")
      },
      handleProtocols: (protocols) => protocols.has(this.protocol) ? this.protocol : false
    })
    this.server = server
    server.on("listening", () => {
      const address = server.address()
      if (address && typeof address !== "string") this.bridgePort = address.port
      this.update({
        ...this.snapshot,
        bridgePort: this.bridgePort,
        status: "waiting",
        message: `Waiting for a supported debug session on loopback port ${this.bridgePort}`
      })
    })
    server.on("error", (error) => {
      this.update({ ...makeInitialSnapshot(this.bridgePort), status: "error", message: `Debug bridge could not start: ${error.message}` })
    })
    // This event is emitted only after origin and subprotocol authentication.
    server.on("connection", (socket) => this.acceptConnection(socket))
  }

  subscribe(listener: (snapshot: DebugStateSnapshot) => void): () => void {
    this.listeners.add(listener)
    listener(this.snapshot)
    return () => this.listeners.delete(listener)
  }

  getSnapshot(): DebugStateSnapshot {
    return this.snapshot
  }

  async loadVariables(variableId: string): Promise<void> {
    const response = await this.request({ type: "variables", variableId })
    if (!response.ok) throw new Error(response.message ?? "The debugger could not load variables")
    this.update(replaceVariableChildren(this.snapshot, variableId, response.variables ?? []))
  }

  async interruptFiber(fiberId: string): Promise<void> {
    const response = await this.request({ type: "fiber:interrupt", fiberId, threadId: this.snapshot.threadId })
    if (!response.ok) throw new Error(response.message ?? "The debugger could not interrupt the fiber")
    this.update({ ...this.snapshot, fibers: markFiberInterruptionRequested(this.snapshot.fibers, fiberId) })
  }

  async togglePauseOnDefects(): Promise<void> {
    const response = await this.request({ type: "breakpoints:toggle-pause-on-defects", threadId: this.snapshot.threadId })
    if (!response.ok) throw new Error(response.message ?? "The debugger could not update pause-on-defect state")
    this.update({
      ...this.snapshot,
      breakpoints: { ...this.snapshot.breakpoints, pauseOnDefects: !this.snapshot.breakpoints.pauseOnDefects }
    })
  }

  setSpanStackIgnoreListEnabled(enabled: boolean): void {
    this.update({ ...this.snapshot, spanStackIgnoreListEnabled: enabled })
  }

  async refresh(): Promise<void> {
    const response = await this.request({ type: "snapshot:refresh", threadId: this.snapshot.threadId })
    if (!response.ok) throw new Error(response.message ?? "The debugger could not refresh its snapshot")
  }

  async dispose(): Promise<void> {
    this.rejectPending(new Error("Debug bridge disposed"))
    this.socket?.terminate()
    const server = this.server
    this.server = undefined
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()))
  }

  private acceptConnection(socket: WebSocket): void {
    this.socket?.close(1008, "Replaced by an authenticated debug session")
    this.socket = socket
    this.update({ ...makeInitialSnapshot(this.bridgePort), status: "waiting", message: "Debug bridge authenticated; waiting for a session" })
    socket.on("message", (data, isBinary) => {
      try {
        this.handleRawMessage(socket, data, isBinary)
      } catch {
        socket.close(1011, "Failed to process debug message")
      }
    })
    socket.on("close", () => {
      if (this.socket !== socket) return
      this.socket = undefined
      this.rejectPending(new Error("Debug session disconnected"))
      this.update({
        ...makeInitialSnapshot(this.bridgePort),
        status: "waiting",
        message: `Waiting for a supported debug session on loopback port ${this.bridgePort}`
      })
    })
    socket.on("error", () => {
      if (this.socket === socket) socket.terminate()
    })
  }

  private handleRawMessage(socket: WebSocket, data: RawData, isBinary: boolean): void {
    if (socket !== this.socket) return
    if (isBinary) {
      socket.close(1003, "Binary debug messages are not supported")
      return
    }
    const raw = rawDataToString(data)
    if (Buffer.byteLength(raw, "utf8") > MAX_DEBUG_PAYLOAD_BYTES) {
      socket.close(1009, "Debug message too large")
      return
    }

    let input: unknown
    try {
      input = JSON.parse(raw)
    } catch {
      socket.close(1008, "Invalid debug message")
      return
    }
    const message = decodeDebugBridgeClientMessage(input)
    if (!message) {
      socket.close(1008, "Invalid debug message")
      return
    }

    try {
      this.handleMessage(message)
    } catch {
      socket.close(1011, "Failed to process debug message")
    }
  }

  private handleMessage(message: DebugBridgeClientMessage): void {
    switch (message.type) {
      case "debug:attach":
        this.update({
          ...makeInitialSnapshot(this.bridgePort),
          status: "running",
          message: `Attached to ${message.sessionName ?? "debug session"}`,
          sessionId: message.sessionId,
          sessionName: message.sessionName
        })
        return
      case "debug:snapshot":
        if (this.snapshot.sessionId && message.sessionId !== this.snapshot.sessionId) return
        this.update({
          ...message.snapshot,
          bridgePort: this.bridgePort,
          message: message.snapshot.status === "paused" ? "Debugger paused; captured live Effect state" : "Debugger running",
          sessionId: message.sessionId,
          sessionName: this.snapshot.sessionName,
          spanStackIgnoreListEnabled: this.snapshot.spanStackIgnoreListEnabled
        })
        return
      case "debug:continued":
        if (message.sessionId !== this.snapshot.sessionId) return
        this.update({
          ...this.snapshot,
          status: "running",
          message: "Debugger running",
          threadId: message.threadId,
          context: [],
          spanStack: [],
          fibers: [],
          breakpoints: { ...this.snapshot.breakpoints, values: [] }
        })
        return
      case "debug:detach":
        if (message.sessionId !== this.snapshot.sessionId) return
        this.update({
          ...makeInitialSnapshot(this.bridgePort),
          status: "waiting",
          message: `Waiting for a supported debug session on loopback port ${this.bridgePort}`
        })
        return
      case "debug:response": {
        const pending = this.pending.get(message.requestId)
        if (!pending) return
        clearTimeout(pending.timeout)
        this.pending.delete(message.requestId)
        pending.resolve(message)
      }
    }
  }

  private request(command: DebugAdapterCommand): Promise<Extract<DebugBridgeClientMessage, { type: "debug:response" }>> {
    const socket = this.socket
    if (!socket || socket.readyState !== WebSocket.OPEN || !this.snapshot.sessionId) {
      return Promise.reject(new Error("No supported debug session is attached"))
    }
    const requestId = String(this.nextRequestId++)
    const message: DebugBridgeServerMessage = { type: "debug:command", requestId, command }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId)
        reject(new Error(`Debug command timed out: ${command.type}`))
      }, REQUEST_TIMEOUT_MS)
      this.pending.set(requestId, { command, resolve, reject, timeout })
      socket.send(JSON.stringify(message), (error) => {
        if (!error) return
        clearTimeout(timeout)
        this.pending.delete(requestId)
        reject(error)
      })
    })
  }

  private rejectPending(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout)
      pending.reject(error)
    }
    this.pending.clear()
  }

  private update(snapshot: DebugStateSnapshot): void {
    this.snapshot = snapshot
    for (const listener of this.listeners) listener(snapshot)
  }
}

function makeInitialSnapshot(bridgePort: number): DebugStateSnapshot {
  return {
    status: "unavailable",
    message: "Starting debug-session bridge...",
    bridgePort,
    context: [],
    spanStack: [],
    spanStackIgnoreListEnabled: true,
    fibers: [],
    breakpoints: { pauseOnDefects: false, values: [] }
  }
}

function hasRequestedProtocol(header: string | string[] | undefined, expected: string): boolean {
  const values = Array.isArray(header) ? header : header?.split(",") ?? []
  const expectedBytes = Buffer.from(expected)
  return values.some((value) => {
    const candidate = Buffer.from(value.trim())
    return candidate.length === expectedBytes.length && timingSafeEqual(candidate, expectedBytes)
  })
}

function rawDataToString(data: RawData): string {
  if (typeof data === "string") return data
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8")
  if (Array.isArray(data)) return Buffer.concat(data).toString("utf8")
  return data.toString("utf8")
}

function replaceVariableChildren(snapshot: DebugStateSnapshot, variableId: string, children: VariableRecord[]): DebugStateSnapshot {
  const mapVariables = (variables: VariableRecord[]): VariableRecord[] => variables.map((variable) =>
    variable.id === variableId
      ? { ...variable, children, childrenLoaded: true }
      : { ...variable, children: variable.children ? mapVariables(variable.children) : undefined }
  )
  const mapFibers = (fibers: FiberRecord[]): FiberRecord[] => fibers.map((fiber) => ({
    ...fiber,
    attributes: mapVariables(fiber.attributes),
    children: fiber.children ? mapFibers(fiber.children) : undefined
  }))
  return {
    ...snapshot,
    context: snapshot.context.map((entry) => ({ ...entry, children: mapVariables(entry.children) })),
    spanStack: snapshot.spanStack.map((span) => ({ ...span, attributes: mapVariables(span.attributes) })),
    fibers: mapFibers(snapshot.fibers),
    breakpoints: { ...snapshot.breakpoints, values: mapVariables(snapshot.breakpoints.values) }
  }
}

function markFiberInterruptionRequested(fibers: FiberRecord[], fiberId: string): FiberRecord[] {
  return fibers.map((fiber) => ({
    ...fiber,
    interruptionRequested: fiber.id === fiberId || fiber.interruptionRequested,
    children: fiber.children ? markFiberInterruptionRequested(fiber.children, fiberId) : undefined
  }))
}
