import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { BackendSnapshot } from "../lib/contracts/backend"
import { ClientsView } from "./clients/ClientsView"
import { MetricsView } from "./metrics/MetricsView"
import { TracerTreeView } from "./tracer/TracerTreeView"

const state = vi.hoisted(() => ({ snapshot: undefined as BackendSnapshot | undefined }))
vi.mock("../lib/backend/BackendProvider", () => ({ useBackendSnapshot: () => state.snapshot }))

const baseSnapshot = (): BackendSnapshot => ({
  appName: "Effect DevTools",
  version: "1",
  clients: { runningState: { running: true, port: 34437, message: "ready" }, clients: [] },
  metrics: { metrics: [] },
  tracer: { spans: [], events: [] },
  debug: {
    status: "waiting", message: "waiting", bridgePort: 34438, context: [], spanStack: [],
    spanStackIgnoreListEnabled: true, fibers: [], breakpoints: { pauseOnDefects: false, values: [] }
  }
})

describe("keyboard-operable rows", () => {
  beforeEach(() => {
    vi.mocked(window.electronAPI.dispatch).mockClear()
    vi.mocked(window.electronAPI.revealLocation).mockClear()
  })

  it("selects a client and invokes its disclosed actions from the keyboard", async () => {
    const user = userEvent.setup()
    const snapshot = baseSnapshot()
    snapshot.clients.clients = [{ id: 1, name: "worker", transport: "websocket", active: false, status: "connected" }]
    state.snapshot = snapshot
    render(<ClientsView />)
    const select = screen.getByRole("button", { name: "worker, connected" })
    select.focus()
    await user.keyboard("{Enter}")
    expect(window.electronAPI.dispatch).toHaveBeenCalledWith({ type: "client:select", clientId: 1 })
    const disconnect = screen.getByRole("button", { name: "Disconnect worker" })
    disconnect.focus()
    await user.keyboard("{Enter}")
    expect(window.electronAPI.dispatch).toHaveBeenCalledWith({ type: "client:disconnect", clientId: 1 })
  })

  it("expands metric details with an aria disclosure button", async () => {
    const user = userEvent.setup()
    const snapshot = baseSnapshot()
    snapshot.metrics.metrics = [{
      id: "requests", name: "requests", kind: "Counter", description: "2", tags: [{ key: "route", value: "/" }], details: [{ key: "Count", value: "2" }]
    }]
    state.snapshot = snapshot
    render(<MetricsView />)
    const trigger = screen.getByRole("button", { name: /requests/i })
    expect(trigger).toHaveAttribute("aria-expanded", "false")
    trigger.focus()
    await user.keyboard("{Enter}")
    expect(trigger).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByText("route")).toBeInTheDocument()
  })

  it("expands spans and events and reveals a location by keyboard", async () => {
    const user = userEvent.setup()
    const snapshot = baseSnapshot()
    snapshot.tracer.spans = [{
      id: "root", traceId: "trace", spanId: "root", name: "root span",
      location: { path: "/tmp/app.ts", line: 4, column: 2 },
      attributes: [],
      events: [{ id: "evt", name: "annotation", offsetLabel: "+1ms", attributes: [{ id: "value", name: "answer", value: "42" }] }],
      children: []
    }]
    state.snapshot = snapshot
    render(<TracerTreeView />)
    const spanTrigger = screen.getByRole("button", { name: "root span" })
    spanTrigger.focus()
    await user.keyboard("{Enter}")
    expect(spanTrigger).toHaveAttribute("aria-expanded", "true")
    const eventTrigger = screen.getByRole("button", { name: /annotation/i })
    eventTrigger.focus()
    await user.keyboard("{Enter}")
    expect(screen.getByText("answer")).toBeInTheDocument()
    const reveal = screen.getByRole("button", { name: /Reveal root span/i })
    reveal.focus()
    await user.keyboard("{Enter}")
    expect(window.electronAPI.revealLocation).toHaveBeenCalledWith({ path: "/tmp/app.ts", line: 4, column: 2 })
  })
})
