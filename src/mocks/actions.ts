import type { BackendCommand } from "../lib/contracts/backend"

export function invokePreviewAction(action: BackendCommand | string, payload?: unknown) {
  if (typeof action !== "string") {
    return window.electronAPI.dispatch(action)
  }

  const command = toBackendCommand(action, payload)
  if (command) {
    return window.electronAPI.dispatch(command)
  }

  console.info(`Backend action '${action}' is not implemented yet.`, payload)
  return Promise.resolve()
}

export function revealPreviewLocation(path: string, line: number, column: number) {
  return window.electronAPI.revealLocation({ path, line, column })
}

function toBackendCommand(action: string, payload?: unknown): BackendCommand | undefined {
  switch (action) {
    case "server:start":
      return { type: "server:start" }
    case "server:stop":
      return { type: "server:stop" }
    case "metrics:reset":
      return { type: "metrics:reset" }
    case "tracer:reset":
      return { type: "tracer:reset" }
    case "timeline:reset":
      return { type: "timeline:reset" }
    case "client:select":
      return typeof payload === "number" ? { type: "client:select", clientId: payload } : undefined
    case "client:disconnect":
      return typeof payload === "number" ? { type: "client:disconnect", clientId: payload } : undefined
    case "client:remove":
      return typeof payload === "number" ? { type: "client:remove", clientId: payload } : undefined
    default:
      return undefined
  }
}
