import type { ServerOptions } from "ws"

export const MAX_DEVTOOLS_PAYLOAD_BYTES = 1024 * 1024

export function makeDevtoolsWebSocketOptions(port: number): ServerOptions {
  return {
    host: "127.0.0.1",
    port,
    maxPayload: MAX_DEVTOOLS_PAYLOAD_BYTES,
    perMessageDeflate: false,
    verifyClient: ({ origin }, done) => {
      const allowed = typeof origin !== "string" || origin.length === 0
      done(allowed, allowed ? undefined : 403, allowed ? undefined : "Browser WebSocket origins are not allowed")
    }
  }
}
