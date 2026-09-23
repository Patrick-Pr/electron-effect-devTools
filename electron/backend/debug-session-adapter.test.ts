// @vitest-environment node
import { describe, expect, it } from "vitest"
import { WebSocket } from "ws"
import { DebugSessionAdapter, decodeDebugBridgeClientMessage } from "./debug-session-adapter.js"

const validSnapshot = {
  status: "paused",
  threadId: 1,
  context: [],
  spanStack: [],
  fibers: [],
  breakpoints: { pauseOnDefects: false, values: [] }
}

describe("debug bridge message decoding", () => {
  it("accepts complete messages and rejects malformed or excessive snapshots", () => {
    expect(decodeDebugBridgeClientMessage({ type: "debug:snapshot", sessionId: "session", snapshot: validSnapshot })).toBeDefined()
    expect(decodeDebugBridgeClientMessage({ type: "debug:snapshot" })).toBeUndefined()
    expect(decodeDebugBridgeClientMessage({ type: "debug:snapshot", sessionId: "session", snapshot: validSnapshot, extra: true })).toBeUndefined()
    expect(decodeDebugBridgeClientMessage({
      type: "debug:snapshot",
      sessionId: "session",
      snapshot: { ...validSnapshot, context: Array.from({ length: 257 }, (_, id) => ({ id: String(id), tag: "tag", preview: "value", children: [] })) }
    })).toBeUndefined()
  })

  it("enforces nested variable depth", () => {
    let variable: Record<string, unknown> = { id: "leaf", name: "leaf", value: "value", isContainer: false }
    for (let depth = 0; depth < 10; depth++) {
      variable = { id: `v-${depth}`, name: "nested", value: "Object", isContainer: true, children: [variable] }
    }
    expect(decodeDebugBridgeClientMessage({
      type: "debug:response",
      requestId: "1",
      ok: true,
      variables: [variable]
    })).toBeUndefined()
  })
})

describe("debug bridge authentication", () => {
  it("rejects missing credentials and browser origins before accepting a validated peer", async () => {
    const protocol = "effect-devtools-debug.test-secret"
    const adapter = new DebugSessionAdapter({ port: 0, protocol })
    try {
      adapter.start()
      await waitForStatus(adapter, "waiting")
      const { port } = adapter.getConnectionOptions()
      const url = `ws://127.0.0.1:${port}`

      await expectRejectedUpgrade(new WebSocket(url))
      await expectRejectedUpgrade(new WebSocket(url, protocol, { origin: "https://untrusted.example" }))

      const socket = new WebSocket(url, protocol)
      await new Promise<void>((resolve, reject) => {
        socket.once("open", resolve)
        socket.once("error", reject)
      })
      expect(socket.protocol).toBe(protocol)

      const closed = new Promise<number>((resolve) => socket.once("close", resolve))
      socket.send(JSON.stringify({ type: "debug:snapshot" }))
      await expect(closed).resolves.toBe(1008)
      expect(adapter.getSnapshot().sessionId).toBeUndefined()
    } finally {
      await adapter.dispose()
    }
  })
})

function waitForStatus(adapter: DebugSessionAdapter, status: string): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = adapter.subscribe((snapshot) => {
      if (snapshot.status !== status) return
      unsubscribe()
      resolve()
    })
  })
}

function expectRejectedUpgrade(socket: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once("unexpected-response", (_request, response) => {
      const statusCode = response.statusCode
      response.resume()
      if (statusCode === 401) resolve()
      else reject(new Error(`Expected 401, received ${statusCode}`))
    })
    socket.once("open", () => reject(new Error("Unauthenticated WebSocket unexpectedly opened")))
    socket.once("error", () => {})
  })
}
