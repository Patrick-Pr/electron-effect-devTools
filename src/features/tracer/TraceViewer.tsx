import React, { useCallback, useEffect, useRef } from "react"
import type { TraceEventRecord } from "../../lib/contracts/tracer"
import type { TraceViewerOptions, ViewState } from "./trace-viewer-types"
import { defaultOptions } from "./trace-viewer-types"

interface TraceViewerProps {
  traces: TraceEventRecord[]
  viewState: ViewState
  onViewStateChange: (vs: ViewState) => void
  options?: TraceViewerOptions
  onTraceClick?: (trace: TraceEventRecord) => void
}

function drawTimeScale(
  ctx: CanvasRenderingContext2D,
  width: number,
  vs: ViewState,
  timelineH: number
) {
  ctx.clearRect(0, 0, width, timelineH)

  const duration = vs.endMs - vs.startMs
  const pxPerMs = width / duration

  ctx.strokeStyle = "#30363d"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, timelineH)
  ctx.lineTo(width, timelineH)
  ctx.stroke()

  const minPxBetween = 60
  const msPerLabel = minPxBetween / pxPerMs

  const intervals = [1, 5, 10, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 30000, 60000]
  let interval = 1
  for (const i of intervals) {
    if (i >= msPerLabel) { interval = i; break }
  }

  ctx.fillStyle = "#8b949e"
  ctx.font = "10px SF Mono, Menlo, Consolas, monospace"

  const first = Math.ceil(vs.startMs / interval) * interval
  for (let t = first; t <= vs.endMs; t += interval) {
    const x = (t - vs.startMs) * pxPerMs
    if (x < -60 || x > width + 60) continue

    let label: string
    if (interval < 1000) label = `${Math.round(t)}ms`
    else label = `${(t / 1000).toFixed(t % 1000 === 0 ? 0 : 1)}s`

    ctx.fillText(label, x + 3, 12)

    ctx.strokeStyle = "#21262d"
    ctx.beginPath()
    ctx.moveTo(x, timelineH - 4)
    ctx.lineTo(x, timelineH)
    ctx.stroke()
  }
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  trace: TraceEventRecord,
  x: number,
  y: number,
  w: number,
  h: number,
  canvasW: number
) {
  const vx = Math.max(0, x)
  const vw = Math.min(canvasW - vx, w - (vx - x))
  if (vw <= 0) return

  ctx.fillStyle = trace.color
  ctx.fillRect(vx, y, vw, h)

  ctx.strokeStyle = "rgba(0,0,0,0.3)"
  ctx.lineWidth = 1
  ctx.strokeRect(vx, y, vw, h)

  ctx.fillStyle = "#e6edf3"
  ctx.font = "11px SF Mono, Menlo, Consolas, monospace"
  const textX = vx + 4
  const available = vw - 8
  if (available < 12) return

  const text = trace.name
  const measured = ctx.measureText(text).width
  if (measured <= available) {
    ctx.fillText(text, textX, y + h / 2 + 4)
  } else if (available > 20) {
    let truncated = text
    const ellipsis = "\u2026"
    while (ctx.measureText(truncated + ellipsis).width > available && truncated.length > 0) {
      truncated = truncated.slice(0, -1)
    }
    if (truncated.length > 0) ctx.fillText(truncated + ellipsis, textX, y + h / 2 + 4)
  }

  if (x + w <= canvasW && available > 80) {
    const dur = trace.endTime - trace.startTime
    const durText = dur >= 1000 ? `${(dur / 1000).toFixed(1)}s` : `${Math.round(dur)}ms`
    ctx.fillStyle = "rgba(230,237,243,0.6)"
    ctx.font = "10px SF Mono, Menlo, Consolas, monospace"
    const dw = ctx.measureText(durText).width
    ctx.fillText(durText, x + w - dw - 4, y + h / 2 + 4)
  }
}

function drawTraces(
  ctx: CanvasRenderingContext2D,
  traces: TraceEventRecord[],
  vs: ViewState,
  cw: number,
  ch: number,
  barH: number,
  barP: number,
  timeH: number
) {
  const duration = vs.endMs - vs.startMs
  const pxPerMs = cw / duration

  for (const trace of traces) {
    const x = (trace.startTime - vs.startMs) * pxPerMs
    const y = timeH + trace.depth * (barH + barP) + vs.offsetY
    const w = Math.max(1, (trace.endTime - trace.startTime) * pxPerMs)

    if (x + w < 0 || x > cw || y + barH < 0 || y > ch) continue
    drawBar(ctx, trace, x, y, w, barH, cw)
  }
}

const TraceViewer: React.FC<TraceViewerProps> = ({
  traces,
  viewState,
  onViewStateChange,
  options = defaultOptions,
  onTraceClick
}) => {
  const { barHeight, barPadding, timelineHeight } = options
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const getTraceAt = useCallback((mx: number, my: number): TraceEventRecord | null => {
    const canvas = canvasRef.current
    if (!canvas || my < timelineHeight) return null

    const duration = viewState.endMs - viewState.startMs
    const pxPerMs = canvas.width / duration

    for (const trace of traces) {
      const x = (trace.startTime - viewState.startMs) * pxPerMs
      const y = timelineHeight + trace.depth * (barHeight + barPadding) + viewState.offsetY
      const w = (trace.endTime - trace.startTime) * pxPerMs

      if (mx >= x && mx <= x + w && my >= y && my <= y + barHeight) {
        return trace
      }
    }
    return null
  }, [traces, viewState, barHeight, barPadding, timelineHeight])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawTraces(ctx, traces, viewState, canvas.width, canvas.height, barHeight, barPadding, timelineHeight)
    drawTimeScale(ctx, canvas.width, viewState, timelineHeight)
  }, [traces, viewState, barHeight, barPadding, timelineHeight])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = canvas.offsetHeight * dpr
      const ctx = canvas.getContext("2d")
      if (ctx) ctx.scale(dpr, dpr)
      draw()
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left

      const duration = viewState.endMs - viewState.startMs
      const pxPerMs = rect.width / duration
      const timeAtMouse = viewState.startMs + mx / pxPerMs

      const factor = e.deltaY > 0 ? 1.15 : 0.87

      const leftMs = (timeAtMouse - viewState.startMs) * factor
      const rightMs = (viewState.endMs - timeAtMouse) * factor

      const md = traces.reduce((m, t) => Math.max(m, t.depth), 0)
      const lowestY = timelineHeight + md * (barHeight + barPadding)
      const maxOff = Math.max(0, lowestY + barHeight - rect.height)
      const clampedY = Math.max(-maxOff, Math.min(0, viewState.offsetY))

      onViewStateChange({
        startMs: timeAtMouse - leftMs,
        endMs: timeAtMouse + rightMs,
        offsetY: clampedY
      })
    }

    resize()
    window.addEventListener("resize", resize)
    canvas.addEventListener("wheel", handleWheel, { passive: false })
    return () => {
      window.removeEventListener("resize", resize)
      canvas.removeEventListener("wheel", handleWheel)
    }
  }, [draw, viewState, onViewStateChange, traces, barHeight, barPadding, timelineHeight])

  useEffect(() => { draw() }, [draw])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const clicked = getTraceAt(x, y)
    if (clicked && onTraceClick) {
      onTraceClick(clicked)
    } else {
      isDragging.current = true
      dragStart.current = { x: e.clientX, y: e.clientY - viewState.offsetY }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    if (!isDragging.current) {
      const rect = canvas.getBoundingClientRect()
      const hit = getTraceAt(e.clientX - rect.left, e.clientY - rect.top)
      canvas.style.cursor = hit ? "pointer" : "grab"
      return
    }

    const rect = canvas.getBoundingClientRect()
    const duration = viewState.endMs - viewState.startMs
    const pxPerMs = rect.width / duration
    const dx = dragStart.current.x - e.clientX
    const dtMs = dx / pxPerMs

    const md = traces.reduce((m, t) => Math.max(m, t.depth), 0)
    const lowestY = timelineHeight + md * (barHeight + barPadding)
    const maxOff = Math.max(0, lowestY + barHeight - rect.height)
    const newY = e.clientY - dragStart.current.y
    const clampedY = Math.max(-maxOff, Math.min(0, newY))

    onViewStateChange({
      startMs: viewState.startMs + dtMs,
      endMs: viewState.endMs + dtMs,
      offsetY: clampedY
    })
    dragStart.current.x = e.clientX
  }

  const handleMouseUp = () => { isDragging.current = false }
  const handleMouseLeave = () => {
    isDragging.current = false
    if (canvasRef.current) canvasRef.current.style.cursor = "grab"
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", cursor: "grab", display: "block" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  )
}

export default TraceViewer
