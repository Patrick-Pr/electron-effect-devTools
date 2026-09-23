export interface LocationRecord {
  path: string
  line: number
  column: number
}

export interface VariableRecord {
  id: string
  name: string
  value: string
  isContainer?: boolean
  children?: VariableRecord[]
  childrenLoaded?: boolean
}

export interface ContextTagRecord {
  id: string
  tag: string
  preview: string
  children: VariableRecord[]
}

export interface SpanStackRecord {
  id: string
  name: string
  location?: LocationRecord
  stackIndex: number
  ignored?: boolean
  attributes: VariableRecord[]
}

export interface FiberRecord {
  id: string
  current: boolean
  interrupted: boolean
  interruptible: boolean
  interruptionRequested?: boolean
  currentSpan?: string
  location?: LocationRecord
  tooltip?: string
  startedAt: string
  lifetime: string
  attributes: VariableRecord[]
  children?: FiberRecord[]
}

export interface BreakpointRecord {
  pauseOnDefects: boolean
  values: VariableRecord[]
}

export type DebugSessionStatus = "unavailable" | "waiting" | "running" | "paused" | "error"

export interface DebugStateSnapshot {
  status: DebugSessionStatus
  message: string
  bridgePort: number
  sessionId?: string
  sessionName?: string
  threadId?: number
  context: ContextTagRecord[]
  spanStack: SpanStackRecord[]
  spanStackIgnoreListEnabled: boolean
  fibers: FiberRecord[]
  breakpoints: BreakpointRecord
}

export type DebugAdapterCommand =
  | { type: "variables"; variableId: string }
  | { type: "fiber:interrupt"; fiberId: string; threadId?: number }
  | { type: "breakpoints:toggle-pause-on-defects"; threadId?: number }
  | { type: "snapshot:refresh"; threadId?: number }

export type DebugBridgeClientMessage =
  | { type: "debug:attach"; sessionId: string; sessionName?: string }
  | { type: "debug:snapshot"; sessionId: string; snapshot: Omit<DebugStateSnapshot, "bridgePort" | "message" | "sessionId" | "sessionName" | "spanStackIgnoreListEnabled"> }
  | { type: "debug:continued"; sessionId: string; threadId?: number }
  | { type: "debug:detach"; sessionId: string }
  | { type: "debug:response"; requestId: string; ok: boolean; variables?: VariableRecord[]; message?: string }

export type DebugBridgeServerMessage = {
  type: "debug:command"
  requestId: string
  command: DebugAdapterCommand
}
