// @vitest-environment node
import { describe, expect, it } from "vitest"
import { WebSocket, WebSocketServer } from "ws"
import { MAX_DEVTOOLS_PAYLOAD_BYTES, makeDevtoolsWebSocketOptions } from "./devtools-websocket-options.js"

describe("devtools WebSocket options", () => {
  it("binds to loopback with bounded, uncompressed payloads", () => {
    const options = makeDevtoolsWebSocketOptions(0)

    expect(options.host).toBe("127.0.0.1")
    expect(options.maxPayload).toBe(MAX_DEVTOOLS_PAYLOAD_BYTES)
    expect(options.perMessageDeflate).toBe(false)
  })

  it("rejects browser origins while accepting non-browser clients", async () => {
    const server = new WebSocketServer(makeDevtoolsWebSocketOptions(0))
    try {
      const address = await waitForListening(server)
      expect(address.address).toBe("127.0.0.1")
      const url = `ws://127.0.0.1:${address.port}`

      await expectRejectedUpgrade(new WebSocket(url, { origin: "https://untrusted.example" }))

      const socket = new WebSocket(url)
      await new Promise<void>((resolve, reject) => {
        socket.once("open", resolve)
        socket.once("error", reject)
      })
      socket.close()
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    }
  })
})

function waitForListening(server: WebSocketServer): Promise<Exclude<ReturnType<WebSocketServer["address"]>, string | null>> {
  return new Promise((resolve, reject) => {
    server.once("listening", () => {
      const address = server.address()
      if (!address || typeof address === "string") reject(new Error("Expected an IP socket address"))
      else resolve(address)
    })
    server.once("error", reject)
  })
}

function expectRejectedUpgrade(socket: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("unexpected-response", (_request, response) => {
      const statusCode = response.statusCode
      response.resume()
      if (statusCode === 403) resolve()
      else reject(new Error(`Expected 403, received ${statusCode}`))
    })
    socket.once("open", () => reject(new Error("Browser-originated WebSocket unexpectedly opened")))
    socket.once("error", () => {})
  })
}
