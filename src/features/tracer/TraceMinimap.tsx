import React, { useCallback, useEffect, useMemo, useRef } from "react"
import type { TimelineRow, TraceViewerOptions, ViewState } from "./trace-viewer-types"
import { defaultOptions } from "./trace-viewer-types"
import { clampViewToBounds, getCanvasBackingSize, getTraceTimeBounds } from "./trace-viewer-utils"

interface MinimapProps {
  rows: TimelineRow[]
  viewState: ViewState
  onViewStateChange: (viewState: ViewState) => void
  options?: TraceViewerOptions
}

const TraceMinimap: React.FC<MinimapProps> = ({ rows, viewState, onViewStateChange, options = defaultOptions }) => {
  const { minimapHeight } = options
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cssWidthRef = useRef(0)
  const draggingRef = useRef(false)
  const events = useMemo(() => rows.map((row) => row.event), [rows])
  const bounds = useMemo(() => getTraceTimeBounds(events), [events])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || minimapHeight === 0) return
    const cssWidth = cssWidthRef.current
    const { backingWidth, backingHeight, dpr } = getCanvasBackingSize(cssWidth, minimapHeight, window.devicePixelRatio)
    if (canvas.width !== backingWidth) canvas.width = backingWidth
    if (canvas.height !== backingHeight) canvas.height = backingHeight
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssWidth, minimapHeight)
    if (rows.length === 0 || cssWidth <= 0) return

    const totalDuration = bounds.endMs - bounds.startMs
    const pxPerMs = cssWidth / totalDuration
    const miniBarHeight = Math.min(Math.max(1, minimapHeight / Math.max(1, rows.length)), minimapHeight / 8)
    for (const row of rows) {
      const x = (row.event.startTime - bounds.startMs) * pxPerMs
      const y = rows.length <= 1 ? 0 : row.row / rows.length * minimapHeight
      const width = Math.max(1, (row.event.endTime - row.event.startTime) * pxPerMs)
      const inView = row.event.endTime >= viewState.startMs && row.event.startTime <= viewState.endMs
      ctx.globalAlpha = inView ? 0.8 : 0.25
      ctx.fillStyle = row.event.color
      ctx.fillRect(x, y, width, miniBarHeight)
    }

    ctx.globalAlpha = 1
    const viewX = (viewState.startMs - bounds.startMs) * pxPerMs
    const viewWidth = (viewState.endMs - viewState.startMs) * pxPerMs
    ctx.strokeStyle = "rgba(230,237,243,0.65)"
    ctx.lineWidth = 1.5
    ctx.strokeRect(viewX, 0, viewWidth, minimapHeight)
    ctx.fillStyle = "rgba(230,237,243,0.06)"
    ctx.fillRect(viewX, 0, viewWidth, minimapHeight)
  }, [bounds, minimapHeight, rows, viewState])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      cssWidthRef.current = canvas.getBoundingClientRect().width
      draw()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    window.addEventListener("resize", resize)
    resize()
    return () => { observer.disconnect(); window.removeEventListener("resize", resize) }
  }, [draw])

  useEffect(() => draw(), [draw])

  const panTo = useCallback((clientX: number) => {
    const canvas = canvasRef.current
    if (!canvas || rows.length === 0) return
    const rect = canvas.getBoundingClientRect()
    const ratio = rect.width > 0 ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) : 0.5
    const clickTime = bounds.startMs + (bounds.endMs - bounds.startMs) * ratio
    const duration = viewState.endMs - viewState.startMs
    onViewStateChange(clampViewToBounds({
      startMs: clickTime - duration / 2,
      endMs: clickTime + duration / 2,
      offsetY: viewState.offsetY
    }, bounds))
  }, [bounds, onViewStateChange, rows.length, viewState])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const duration = viewState.endMs - viewState.startMs
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const direction = event.key === "ArrowLeft" ? -1 : 1
      const delta = duration * 0.1 * direction
      onViewStateChange(clampViewToBounds({ ...viewState, startMs: viewState.startMs + delta, endMs: viewState.endMs + delta }, bounds))
      event.preventDefault()
    }
  }

  if (minimapHeight === 0) return null
  return (
    <canvas
      ref={canvasRef}
      className="w-full block cursor-pointer bg-inset"
      style={{ height: minimapHeight }}
      role="slider"
      tabIndex={0}
      aria-label="Timeline viewport"
      aria-valuemin={Math.round(bounds.startMs)}
      aria-valuemax={Math.round(bounds.endMs)}
      aria-valuenow={Math.round((viewState.startMs + viewState.endMs) / 2)}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        draggingRef.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
        panTo(event.clientX)
      }}
      onPointerMove={(event) => { if (draggingRef.current) panTo(event.clientX) }}
      onPointerUp={(event) => {
        draggingRef.current = false
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={() => { draggingRef.current = false }}
    />
  )
}

export default TraceMinimap
