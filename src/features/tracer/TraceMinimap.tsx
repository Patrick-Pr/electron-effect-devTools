import { useEffect, useRef } from "react"
import type { TraceEventRecord } from "../../lib/contracts/tracer"
import type { TraceViewerOptions, ViewState } from "./trace-viewer-types"

interface TraceMinimapProps {
  traces: TraceEventRecord[]
  viewState: ViewState
  onViewStateChange: (state: ViewState) => void
  options: TraceViewerOptions
}

export function TraceMinimap({ traces, viewState, onViewStateChange, options }: TraceMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    ctx.clearRect(0, 0, width, height)

    const maxTime = Math.max(...traces.map((trace) => trace.endTime), 1)
    traces.forEach((trace) => {
      const x = (trace.startTime / maxTime) * width
      const w = Math.max(2, ((trace.endTime - trace.startTime) / maxTime) * width)
      const y = 8 + trace.depth * 12
      ctx.fillStyle = trace.color
      ctx.fillRect(x, y, w, 8)
    })

    const visibleX = (viewState.startTime / maxTime) * width
    const visibleWidth = ((viewState.endTime - viewState.startTime) / maxTime) * width
    ctx.strokeStyle = "rgba(255,255,255,0.9)"
    ctx.lineWidth = 2
    ctx.strokeRect(visibleX, 2, visibleWidth, height - 4)
  }, [traces, viewState])

  return (
    <canvas
      ref={canvasRef}
      className="trace-minimap"
      width={1200}
      height={options.minimapHeight ?? 88}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const x = event.clientX - rect.left
        const maxTime = Math.max(...traces.map((trace) => trace.endTime), 1)
        const center = (x / rect.width) * maxTime
        const visibleDuration = viewState.endTime - viewState.startTime
        onViewStateChange({
          ...viewState,
          startTime: Math.max(0, center - visibleDuration / 2),
          endTime: Math.min(maxTime, center + visibleDuration / 2)
        })
      }}
    />
  )
}
