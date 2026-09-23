import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TimelineRow, ViewState } from "./trace-viewer-types"
import TraceViewer from "./TraceViewer"

const row = (index: number, hasChildren = false): TimelineRow => ({
  event: { id: `span-${index}`, name: `span ${index}`, startTime: 0, endTime: 100, depth: 0, color: "#fff" },
  row: index,
  ancestryDepth: index,
  hasChildren,
  expanded: false
})

describe("TraceViewer layout interaction", () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 200, bottom: 80, width: 200, height: 80, toJSON: () => ({})
    })
  })

  it("re-clamps vertical scroll when collapsing rows", async () => {
    const onViewStateChange = vi.fn()
    const viewState: ViewState = { startMs: 0, endMs: 100, offsetY: -52 }
    const rows = Array.from({ length: 5 }, (_, index) => row(index))
    const view = render(<TraceViewer rows={rows} viewState={viewState} onViewStateChange={onViewStateChange} />)
    onViewStateChange.mockClear()
    view.rerender(<TraceViewer rows={rows.slice(0, 1)} viewState={viewState} onViewStateChange={onViewStateChange} />)
    await waitFor(() => expect(onViewStateChange).toHaveBeenCalledWith({ ...viewState, offsetY: 0 }))
  })

  it("uses the painted disclosure area for pointer expansion", () => {
    const onTraceSelect = vi.fn()
    const onToggleExpanded = vi.fn()
    render(
      <TraceViewer
        rows={[row(0, true)]}
        viewState={{ startMs: 0, endMs: 100, offsetY: 0 }}
        onViewStateChange={vi.fn()}
        onTraceSelect={onTraceSelect}
        onToggleExpanded={onToggleExpanded}
      />
    )
    const canvas = screen.getByRole("application", { name: /disclosure arrow/i })
    fireEvent.pointerDown(canvas, { clientX: 8, clientY: 25, pointerId: 1, button: 0 })
    expect(onTraceSelect).toHaveBeenCalledWith("span-0")
    expect(onToggleExpanded).toHaveBeenCalledWith("span-0")

    onToggleExpanded.mockClear()
    fireEvent.pointerDown(canvas, { clientX: 80, clientY: 25, pointerId: 2, button: 0 })
    expect(onToggleExpanded).not.toHaveBeenCalled()
  })
})
