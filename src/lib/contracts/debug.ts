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
