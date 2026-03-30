import { useCallback, useEffect, useMemo, useRef } from "react"
import type { TraceEventRecord } from "../../lib/contracts/tracer"
import type { TraceViewerOptions, ViewState } from "./trace-viewer-types"
import { clampViewTimeRange, getTraceTimeBounds } from "./trace-viewer-utils"

interface TraceMinimapProps {
  traces: TraceEventRecord[]
  viewState: ViewState
  onViewStateChange: (state: ViewState) => void
  options: TraceViewerOptions
}

export function TraceMinimap({ traces, viewState, onViewStateChange, options }: TraceMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
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

    ctx.clearRect(0, 0, width, height)

    const totalDuration = Math.max(timeBounds.endTime - timeBounds.startTime, 1)
    traces.forEach((trace) => {
      const x = ((trace.startTime - timeBounds.startTime) / totalDuration) * width
      const w = Math.max(2, ((trace.endTime - trace.startTime) / totalDuration) * width)
      const y = 8 + trace.depth * 12
      ctx.fillStyle = trace.color
      ctx.fillRect(x, y, w, 8)
    })

    const clampedRange = clampViewTimeRange(viewState.startTime, viewState.endTime, timeBounds)
    const visibleX = ((clampedRange.startTime - timeBounds.startTime) / totalDuration) * width
    const visibleWidth = ((clampedRange.endTime - clampedRange.startTime) / totalDuration) * width
    ctx.strokeStyle = "rgba(255,255,255,0.9)"
    ctx.lineWidth = 2
    ctx.strokeRect(visibleX, 2, visibleWidth, height - 4)
  }, [timeBounds, traces, viewState])

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

  return (
    <canvas
      ref={canvasRef}
      className="trace-minimap"
      style={{ height: options.minimapHeight ?? 88 }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left))
        const totalDuration = Math.max(timeBounds.endTime - timeBounds.startTime, 1)
        const center = timeBounds.startTime + (x / rect.width) * totalDuration
        const visibleDuration = viewState.endTime - viewState.startTime
        const { startTime, endTime } = clampViewTimeRange(
          center - visibleDuration / 2,
          center + visibleDuration / 2,
          timeBounds
        )
        onViewStateChange({
          ...viewState,
          startTime,
          endTime
        })
      }}
    />
  )
}
