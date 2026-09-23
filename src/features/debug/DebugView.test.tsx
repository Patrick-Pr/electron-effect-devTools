import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { BackendSnapshot } from "../../lib/contracts/backend"
import { DebugView } from "./DebugView"

const state = vi.hoisted(() => ({ snapshot: undefined as BackendSnapshot | undefined }))
vi.mock("../../lib/backend/BackendProvider", () => ({ useBackendSnapshot: () => state.snapshot }))

describe("DebugView", () => {
  beforeEach(() => {
    vi.mocked(window.electronAPI.dispatch).mockClear()
    vi.mocked(window.electronAPI.revealLocation).mockClear()
    state.snapshot = {
      appName: "Effect DevTools", version: "1",
      clients: { runningState: { running: true, port: 34437, message: "ready" }, clients: [] },
      metrics: { metrics: [] }, tracer: { spans: [], events: [] },
      debug: {
        status: "paused", message: "captured", bridgePort: 34438, sessionId: "session", sessionName: "node",
        context: [{ id: "tag", tag: "Clock", preview: "Clock", children: [{ id: "service", name: "service", value: "Object", isContainer: true }] }],
        spanStack: [{ id: "span", name: "operation", stackIndex: 0, attributes: [], location: { path: "/tmp/app.ts", line: 3, column: 1 } }],
        spanStackIgnoreListEnabled: true,
        fibers: [{
          id: "7", current: true, interrupted: false, interruptible: true, startedAt: "now", lifetime: "1s", attributes: [],
          currentSpan: "operation", location: { path: "/tmp/app.ts", line: 3, column: 1 }
        }],
        breakpoints: { pauseOnDefects: false, values: [] }
      }
    }
  })

  it("operates live debugger actions and lazy variable expansion by keyboard", async () => {
    const user = userEvent.setup()
    render(<DebugView />)
    const context = screen.getByRole("button", { name: /Clock:/ })
    context.focus()
    await user.keyboard("{Enter}")
    const variable = screen.getByRole("button", { name: /service/ })
    variable.focus()
    await user.keyboard("{Enter}")
    expect(window.electronAPI.dispatch).toHaveBeenCalledWith({ type: "debug:variables:load", variableId: "service" })

    const reveal = screen.getByRole("button", { name: "Reveal operation" })
    reveal.focus()
    await user.keyboard("{Enter}")
    expect(window.electronAPI.revealLocation).toHaveBeenCalledWith({ path: "/tmp/app.ts", line: 3, column: 1 })

    const interrupt = screen.getByRole("button", { name: "Interrupt Fiber 7" })
    interrupt.focus()
    await user.keyboard("{Enter}")
    expect(window.electronAPI.dispatch).toHaveBeenCalledWith({ type: "debug:fiber:interrupt", fiberId: "7" })

    const pause = screen.getByRole("button", { name: /Pause on defects/ })
    pause.focus()
    await user.keyboard("{Enter}")
    expect(window.electronAPI.dispatch).toHaveBeenCalledWith({ type: "debug:breakpoints:toggle-pause-on-defects" })
  })
})
