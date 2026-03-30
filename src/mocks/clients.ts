import type { ClientRecord, RunningState } from "../lib/contracts/clients"

export const runningState: RunningState = {
  running: true,
  port: 34437,
  message: "Server listening on port 34437"
}

export const clients: ClientRecord[] = [
  { id: 1, name: "web-app", transport: "browser", pid: 81244, active: true, lastSeen: "2s ago" },
  { id: 2, name: "worker-mailer", transport: "node", pid: 81298, active: false, lastSeen: "11s ago" },
  { id: 3, name: "api-service", transport: "node", pid: 80931, active: false, lastSeen: "16s ago" }
]
