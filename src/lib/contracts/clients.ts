export interface ClientRecord {
  id: number
  name: string
  transport: string
  pid?: number
  active: boolean
  status: "connected" | "disconnected"
  lastSeen?: string
}

export interface RunningState {
  running: boolean
  port: number
  message: string
  error?: string
}
