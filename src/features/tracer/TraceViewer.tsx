import { useCallback, useEffect, useRef } from "react"
import type { TraceEventRecord } from "../../lib/contracts/tracer"
import type { TraceViewerOptions, ViewState } from "./trace-viewer-types"

interface TraceViewerProps {
  traces: TraceEventRecord[]
  viewState: ViewState
  onViewStateChange: (state: ViewState) => void
  options: TraceViewerOptions
  onTraceClick: (trace: TraceEventRecord) => void
}

export function TraceViewer({ traces, viewState, onViewStateChange, options, onTraceClick }: TraceViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const draggingRef = useRef(false)
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const timelineHeight = options.timelineHeight ?? 24
    const barHeight = options.barHeight ?? 18
    const barPadding = options.barPadding ?? 6
    const visibleDuration = viewState.endTime - viewState.startTime || 1
    const pixelsPerMs = width / visibleDuration

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#0f141b"
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = "rgba(255,255,255,0.12)"
    ctx.beginPath()
    ctx.moveTo(0, timelineHeight)
    ctx.lineTo(width, timelineHeight)
    ctx.stroke()
    ctx.fillStyle = "#8b98ac"
    ctx.font = "11px ui-monospace, monospace"

    for (let tick = Math.ceil(viewState.startTime / 50) * 50; tick < viewState.endTime; tick += 50) {
      const x = (tick - viewState.startTime) * pixelsPerMs
      ctx.fillText(`${tick} ms`, x + 4, 14)
      ctx.strokeStyle = "rgba(255,255,255,0.08)"
      ctx.beginPath()
      ctx.moveTo(x, timelineHeight)
      ctx.lineTo(x, height)
      ctx.stroke()
    }

    traces.forEach((trace) => {
      const x = (trace.startTime - viewState.startTime) * pixelsPerMs
      const w = Math.max(2, (trace.endTime - trace.startTime) * pixelsPerMs)
      const y = timelineHeight + trace.depth * (barHeight + barPadding) + viewState.offsetY
      if (x + w < 0 || x > width || y > height || y + barHeight < 0) return
      ctx.fillStyle = trace.color
      ctx.fillRect(x, y, w, barHeight)
      ctx.strokeStyle = "rgba(0,0,0,0.35)"
      ctx.strokeRect(x, y, w, barHeight)
      ctx.fillStyle = "#f7fbff"
      ctx.font = "12px ui-sans-serif, system-ui"
      ctx.fillText(trace.name, x + 8, y + 13)
    })
  }, [options, traces, viewState])

  useEffect(() => {
    draw()
  }, [draw])

  const getTraceAtPosition = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const timelineHeight = options.timelineHeight ?? 24
    const barHeight = options.barHeight ?? 18
    const barPadding = options.barPadding ?? 6
    const visibleDuration = viewState.endTime - viewState.startTime || 1
    const pixelsPerMs = canvas.width / visibleDuration
    return traces.find((trace) => {
      const traceX = (trace.startTime - viewState.startTime) * pixelsPerMs
      const traceY = timelineHeight + trace.depth * (barHeight + barPadding) + viewState.offsetY
      const width = (trace.endTime - trace.startTime) * pixelsPerMs
      return x >= traceX && x <= traceX + width && y >= traceY && y <= traceY + barHeight
    })
  }, [options, traces, viewState])

  return (
    <canvas
      ref={canvasRef}
      className="trace-viewer"
      width={1400}
      height={760}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const trace = getTraceAtPosition(event.clientX - rect.left, event.clientY - rect.top)
        if (trace) onTraceClick(trace)
      }}
      onWheel={(event) => {
        event.preventDefault()
        const delta = event.deltaY > 0 ? 1.1 : 0.9
        const middle = (viewState.startTime + viewState.endTime) / 2
        const duration = Math.max(80, (viewState.endTime - viewState.startTime) * delta)
        onViewStateChange({ ...viewState, startTime: Math.max(0, middle - duration / 2), endTime: middle + duration / 2 })
      }}
      onMouseDown={(event) => {
        draggingRef.current = true
        dragOriginRef.current = { x: event.clientX, y: event.clientY }
      }}
      onMouseMove={(event) => {
        if (!draggingRef.current || !dragOriginRef.current) return
        const dx = event.clientX - dragOriginRef.current.x
        const dy = event.clientY - dragOriginRef.current.y
        dragOriginRef.current = { x: event.clientX, y: event.clientY }
        const duration = viewState.endTime - viewState.startTime
        const offsetTime = (dx / 1400) * duration
        onViewStateChange({
          startTime: Math.max(0, viewState.startTime - offsetTime),
          endTime: Math.max(duration, viewState.endTime - offsetTime),
          offsetY: viewState.offsetY - dy
        })
      }}
      onMouseUp={() => {
        draggingRef.current = false
        dragOriginRef.current = null
      }}
      onMouseLeave={() => {
        draggingRef.current = false
        dragOriginRef.current = null
      }}
    />
  )
}
