import { describe, expect, it } from "vitest"
import type { TraceEventRecord, TraceSpanRecord } from "../../lib/contracts/tracer"
import { MAX_VIEW_DURATION_MS, MIN_VIEW_DURATION_MS } from "./trace-viewer-types"
import {
  clampViewToBounds,
  findTimelineRowAt,
  fitViewToBounds,
  getCanvasBackingSize,
  getTimelineTicks,
  getTraceTimeBounds,
  layoutTimelineRows,
  selectTickInterval
} from "./trace-viewer-utils"

const event = (id: string, startTime: number, endTime: number, depth = 0): TraceEventRecord => ({
  id, name: id, startTime, endTime, depth, color: "#fff"
})
const span = (id: string, children: TraceSpanRecord[] = []): TraceSpanRecord => ({
  id, name: id, traceId: "trace", spanId: id, attributes: [], events: [], children
})

describe("timeline bounds", () => {
  it("provides safe bounds for empty, zero-duration, and non-finite data", () => {
    expect(getTraceTimeBounds([])).toEqual({ startMs: 0, endMs: 2000 })
    expect(getTraceTimeBounds([event("zero", 5, 5)])).toEqual({ startMs: 5, endMs: 5 + MIN_VIEW_DURATION_MS })
    expect(getTraceTimeBounds([event("bad", Number.NaN, Number.POSITIVE_INFINITY)])).toEqual({ startMs: 0, endMs: 2000 })
  })

  it("fits and clamps every viewport to finite ordered limits", () => {
    const fitted = fitViewToBounds({ startMs: 0, endMs: MAX_VIEW_DURATION_MS * 2 })
    expect(fitted.endMs - fitted.startMs).toBe(MAX_VIEW_DURATION_MS)
    const invalid = clampViewToBounds({ startMs: Number.NaN, endMs: Number.NaN, offsetY: Number.NaN }, { startMs: 10, endMs: 20 })
    expect(Number.isFinite(invalid.startMs)).toBe(true)
    expect(invalid.endMs).toBeGreaterThan(invalid.startMs)
    expect(invalid.offsetY).toBe(0)
    const panned = clampViewToBounds({ startMs: 10_000, endMs: 10_010, offsetY: 0 }, { startMs: 0, endMs: 100 })
    expect(panned).toMatchObject({ startMs: 90, endMs: 100 })
  })
})

describe("timeline ticks", () => {
  it("uses a bounded 1/2/5 scale for minimum and near-hour views", () => {
    expect(selectTickInterval(1, 600)).toBeGreaterThan(0)
    expect(getTimelineTicks({ startMs: 0, endMs: 1 }, 600).length).toBeLessThanOrEqual(12)
    const nearHour = getTimelineTicks({ startMs: 0, endMs: MAX_VIEW_DURATION_MS - 1 }, 1200)
    expect(nearHour.length).toBeLessThanOrEqual(22)
    expect(nearHour.length).toBeGreaterThan(0)
  })

  it("rejects invalid geometry without looping", () => {
    expect(getTimelineTicks({ startMs: 1, endMs: 1 }, 1000)).toEqual([])
    expect(getTimelineTicks({ startMs: 0, endMs: 10 }, 0)).toEqual([])
  })
})

describe("CSS pixel geometry", () => {
  it.each([1, 1.5, 2])("keeps logical dimensions stable at DPR %s", (dpr) => {
    const size = getCanvasBackingSize(640, 240, dpr)
    expect(size.cssWidth).toBe(640)
    expect(size.cssHeight).toBe(240)
    expect(size.backingWidth).toBe(Math.round(640 * dpr))
    expect(size.backingHeight).toBe(Math.round(240 * dpr))
  })
})

describe("visible row layout", () => {
  const tree = [span("root", [span("later"), span("earlier")])]
  const events = [event("root", 0, 20), event("later", 10, 15, 1), event("earlier", 2, 8, 1)]

  it("gives concurrent siblings distinct stable rows", () => {
    const rows = layoutTimelineRows(tree, events, new Set(["root"]))
    expect(rows.map((row) => row.event.id)).toEqual(["root", "earlier", "later"])
    expect(new Set(rows.map((row) => row.row)).size).toBe(3)
    expect(rows.map((row) => row.ancestryDepth)).toEqual([0, 1, 1])
  })

  it("removes collapsed descendants from drawing and hit testing", () => {
    expect(layoutTimelineRows(tree, events, new Set()).map((row) => row.event.id)).toEqual(["root"])
    const rows = layoutTimelineRows(tree, events, new Set(["root"]))
    expect(findTimelineRowAt(rows, { startMs: 0, endMs: 20, offsetY: 0 }, 200, 30, 45)?.event.id).toBe("earlier")
  })
})
