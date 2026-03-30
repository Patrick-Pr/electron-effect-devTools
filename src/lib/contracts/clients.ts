export interface ClientRecord {
  id: number
  name: string
  transport: string
  pid: number
  active: boolean
  lastSeen: string
}

export interface RunningState {
  running: boolean
  port: number
  message: string
  error?: string
}
