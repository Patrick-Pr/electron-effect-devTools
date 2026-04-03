import React, { useCallback, useEffect, useRef } from "react"
import type { TraceEventRecord } from "../../lib/contracts/tracer"
import type { TraceViewerOptions, ViewState } from "./trace-viewer-types"
import { defaultOptions } from "./trace-viewer-types"

interface MinimapProps {
  traces: TraceEventRecord[]
  viewState: ViewState
  onViewStateChange: (vs: ViewState) => void
  options?: TraceViewerOptions
}

const TraceMinimap: React.FC<MinimapProps> = ({
  traces,
  viewState,
  onViewStateChange,
  options = defaultOptions
}) => {
  const { barHeight, barPadding, minimapHeight } = options
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDragging = useRef(false)
  const fullRangeRef = useRef<{ start: number; end: number } | null>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || traces.length === 0 || minimapHeight === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let start = traces[0].startTime
    let end = traces[0].endTime
    for (const t of traces) {
      if (t.startTime < start) start = t.startTime
      if (t.endTime > end) end = t.endTime
    }
    fullRangeRef.current = { start, end }

    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvas.offsetWidth, minimapHeight)

    const totalDur = end - start
    const pxPerMs = canvas.offsetWidth / totalDur

    const md = Math.max(...traces.map((t) => t.depth)) + 1
    const miniBarH = Math.min(Math.max(1, minimapHeight / md), minimapHeight / 8)

    for (const trace of traces) {
      const x = (trace.startTime - start) * pxPerMs
      const y = md === 0 ? 0 : (trace.depth / md) * minimapHeight
      const w = Math.max(1, (trace.endTime - trace.startTime) * pxPerMs)

      const inView = trace.endTime >= viewState.startMs && trace.startTime <= viewState.endMs
      ctx.globalAlpha = inView ? 0.8 : 0.25
      ctx.fillStyle = trace.color
      ctx.fillRect(x, y, w, miniBarH)
    }

    ctx.globalAlpha = 1
    const viewX = (viewState.startMs - start) * pxPerMs
    const viewW = (viewState.endMs - viewState.startMs) * pxPerMs

    ctx.strokeStyle = "rgba(230,237,243,0.6)"
    ctx.lineWidth = 1.5
    ctx.strokeRect(viewX, 0, viewW, minimapHeight)

    ctx.fillStyle = "rgba(230,237,243,0.06)"
    ctx.fillRect(viewX, 0, viewW, minimapHeight)
  }, [traces, viewState, minimapHeight, barHeight, barPadding])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.offsetWidth * dpr
      canvas.height = minimapHeight * dpr
      draw()
    }
    resize()
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [draw, minimapHeight])

  useEffect(() => { draw() }, [draw])

  const panToMouse = useCallback((clientX: number, rect: DOMRect) => {
    if (!fullRangeRef.current || traces.length === 0) return
    const mx = Math.max(0, Math.min(rect.width, clientX - rect.left))
    const totalDur = fullRangeRef.current.end - fullRangeRef.current.start
    const viewDur = viewState.endMs - viewState.startMs

    const clickTime = fullRangeRef.current.start + totalDur * (mx / rect.width)
    onViewStateChange({
      startMs: clickTime - viewDur / 2,
      endMs: clickTime + viewDur / 2,
      offsetY: viewState.offsetY
    })
  }, [traces, viewState, onViewStateChange])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true
    panToMouse(e.clientX, canvasRef.current!.getBoundingClientRect())
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return
    panToMouse(e.clientX, canvasRef.current!.getBoundingClientRect())
  }

  const handleMouseUp = () => { isDragging.current = false }
  const handleMouseLeave = () => { isDragging.current = false }

  if (minimapHeight === 0) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: minimapHeight,
        cursor: "pointer",
        display: "block",
        background: "var(--bg-inset)"
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  )
}

export default TraceMinimap
