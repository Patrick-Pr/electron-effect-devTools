import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import type { BackendSnapshot } from "../../lib/contracts/backend"
import type { TraceEventRecord, TraceSpanRecord } from "../../lib/contracts/tracer"
import { TracerTimelineView } from "./TracerTimelineView"

const state = vi.hoisted(() => ({ snapshot: undefined as BackendSnapshot | undefined }))
vi.mock("../../lib/backend/BackendProvider", () => ({ useBackendSnapshot: () => state.snapshot }))

const event = (id: string, name: string, startTime: number, endTime: number): TraceEventRecord => ({
  id, name, startTime, endTime, depth: 0, color: "#fff"
})
const span = (id: string, name: string): TraceSpanRecord => ({
  id, name, traceId: "trace", spanId: id, attributes: [], events: [], children: []
})
const snapshot = (clientId: number, events: TraceEventRecord[], spans: TraceSpanRecord[]): BackendSnapshot => ({
  appName: "Effect DevTools", version: "1",
  clients: {
    runningState: { running: true, port: 34437, message: "ready" },
    clients: [{ id: clientId, name: `client ${clientId}`, transport: "websocket", active: true, status: "connected" }]
  },
  metrics: { metrics: [] }, tracer: { events, spans },
  debug: {
    status: "waiting", message: "waiting", bridgePort: 34438, context: [], spanStack: [],
    spanStackIgnoreListEnabled: true, fibers: [], breakpoints: { pauseOnDefects: false, values: [] }
  }
})

describe("TracerTimelineView snapshot reconciliation", () => {
  it("clears stale selection on client failover", async () => {
    const user = userEvent.setup()
    state.snapshot = snapshot(1, [event("one", "first span", 0, 10)], [span("one", "first span")])
    const view = render(<TracerTimelineView />)
    await user.click(screen.getByRole("button", { name: /first span, 10ms/i }))
    expect(screen.getByRole("heading", { name: "first span" })).toBeInTheDocument()

    state.snapshot = snapshot(2, [event("two", "second span", 0, 20)], [span("two", "second span")])
    view.rerender(<TracerTimelineView />)
    await waitFor(() => expect(screen.queryByRole("heading", { name: "first span" })).not.toBeInTheDocument())
    expect(screen.getByText("Click a span to see details")).toBeInTheDocument()
  })

  it("preserves selection and navigation for incremental events from the same client", async () => {
    const user = userEvent.setup()
    state.snapshot = snapshot(1, [event("one", "first span", 0, 10)], [span("one", "first span")])
    const view = render(<TracerTimelineView />)
    await user.click(screen.getByRole("button", { name: /first span, 10ms/i }))
    const canvas = screen.getByRole("application", { name: /Trace timeline/i })
    canvas.focus()
    await user.keyboard("+")
    const centerBefore = screen.getByRole("slider", { name: "Timeline viewport" }).getAttribute("aria-valuenow")

    state.snapshot = snapshot(
      1,
      [event("one", "first span", 0, 10), event("two", "later span", 100, 110)],
      [span("one", "first span"), span("two", "later span")]
    )
    view.rerender(<TracerTimelineView />)
    await waitFor(() => expect(screen.getByRole("heading", { name: "first span" })).toBeInTheDocument())
    expect(screen.getByRole("slider", { name: "Timeline viewport" })).toHaveAttribute("aria-valuenow", centerBefore)
  })
})
