import { useCallback, useEffect, useMemo, useRef } from "react"
import type { TraceEventRecord } from "../../lib/contracts/tracer"
import type { TraceViewerOptions, ViewState } from "./trace-viewer-types"
import { clampViewTimeRange, getTraceTimeBounds } from "./trace-viewer-utils"

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
  const sizeRef = useRef({ width: 0, height: 0 })
  const drawRef = useRef<() => void>(() => {})
  const timeBounds = useMemo(() => getTraceTimeBounds(traces), [traces])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const { width, height } = sizeRef.current
    if (width === 0 || height === 0) return

    const timelineHeight = options.timelineHeight ?? 24
    const barHeight = options.barHeight ?? 30
    const barPadding = options.barPadding ?? 4
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
      ctx.fillText(trace.name, x + 8, y + barHeight * 0.6)
    })
  }, [options, traces, viewState])

  drawRef.current = draw

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const cssWidth = canvas.offsetWidth
      const cssHeight = canvas.offsetHeight
      canvas.width = cssWidth * dpr
      canvas.height = cssHeight * dpr
      sizeRef.current = { width: cssWidth, height: cssHeight }
      drawRef.current()
    }

    resizeCanvas()

    const observer = new ResizeObserver(() => resizeCanvas())
    observer.observe(canvas)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    draw()
  }, [draw])

  const getTraceAtPosition = useCallback((cssX: number, cssY: number) => {
    const { width } = sizeRef.current
    if (width === 0) return undefined
    const timelineHeight = options.timelineHeight ?? 24
    const barHeight = options.barHeight ?? 30
    const barPadding = options.barPadding ?? 4
    const visibleDuration = viewState.endTime - viewState.startTime || 1
    const pixelsPerMs = width / visibleDuration
    return traces.find((trace) => {
      const traceX = (trace.startTime - viewState.startTime) * pixelsPerMs
      const traceY = timelineHeight + trace.depth * (barHeight + barPadding) + viewState.offsetY
      const traceWidth = Math.max(2, (trace.endTime - trace.startTime) * pixelsPerMs)
      return cssX >= traceX && cssX <= traceX + traceWidth && cssY >= traceY && cssY <= traceY + barHeight
    })
  }, [options, traces, viewState])

  return (
    <canvas
      ref={canvasRef}
      className="trace-viewer"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const trace = getTraceAtPosition(event.clientX - rect.left, event.clientY - rect.top)
        if (trace) onTraceClick(trace)
      }}
      onWheel={(event) => {
        event.preventDefault()
        const cssWidth = sizeRef.current.width || event.currentTarget.offsetWidth
        if (cssWidth === 0) return
        const rect = event.currentTarget.getBoundingClientRect()
        const mouseX = Math.max(0, Math.min(cssWidth, event.clientX - rect.left))
        const visibleDuration = Math.max(viewState.endTime - viewState.startTime, 1)
        const pixelsPerMs = cssWidth / visibleDuration
        const timeUnderMouse = viewState.startTime + mouseX / pixelsPerMs
        const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9
        let newLeftDuration = (timeUnderMouse - viewState.startTime) * zoomFactor
        let newRightDuration = (viewState.endTime - timeUnderMouse) * zoomFactor
        const nextDuration = newLeftDuration + newRightDuration

        if (nextDuration < 1) {
          const leftRatio = visibleDuration === 0 ? 0.5 : (timeUnderMouse - viewState.startTime) / visibleDuration
          newLeftDuration = leftRatio
          newRightDuration = 1 - leftRatio
        }

        const { startTime, endTime } = clampViewTimeRange(
          timeUnderMouse - newLeftDuration,
          timeUnderMouse + newRightDuration,
          timeBounds
        )
        onViewStateChange({ ...viewState, startTime, endTime })
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
        const cssWidth = sizeRef.current.width
        if (cssWidth === 0) return
        const duration = viewState.endTime - viewState.startTime
        const offsetTime = (dx / cssWidth) * duration
        const { startTime, endTime } = clampViewTimeRange(
          viewState.startTime - offsetTime,
          viewState.endTime - offsetTime,
          timeBounds
        )
        onViewStateChange({
          startTime,
          endTime,
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
