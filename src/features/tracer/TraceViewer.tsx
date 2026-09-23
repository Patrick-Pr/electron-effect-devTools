import React, { useCallback, useEffect, useRef } from "react"
import type { TimelineRow, TraceViewerOptions, ViewState } from "./trace-viewer-types"
import { defaultOptions } from "./trace-viewer-types"
import { clampVerticalOffset, findTimelineRowAt, formatMs, getCanvasBackingSize, getTimelineTicks, traceY } from "./trace-viewer-utils"

interface TraceViewerProps {
  rows: TimelineRow[]
  viewState: ViewState
  onViewStateChange: (viewState: ViewState) => void
  options?: TraceViewerOptions
  selectedId?: string | null
  onTraceSelect?: (id: string) => void
  onToggleExpanded?: (id: string) => void
}

interface CssSize { width: number; height: number }

function drawTimeScale(ctx: CanvasRenderingContext2D, cssWidth: number, viewState: ViewState, timelineHeight: number) {
  const duration = viewState.endMs - viewState.startMs
  if (!Number.isFinite(duration) || duration <= 0 || cssWidth <= 0) return
  const pxPerMs = cssWidth / duration
  ctx.strokeStyle = "#30363d"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, timelineHeight - 0.5)
  ctx.lineTo(cssWidth, timelineHeight - 0.5)
  ctx.stroke()
  ctx.fillStyle = "#8b949e"
  ctx.font = "10px SF Mono, Menlo, Consolas, monospace"
  for (const time of getTimelineTicks(viewState, cssWidth)) {
    const x = (time - viewState.startMs) * pxPerMs
    ctx.fillText(formatMs(time), x + 3, 12)
    ctx.strokeStyle = "#21262d"
    ctx.beginPath()
    ctx.moveTo(x, timelineHeight - 4)
    ctx.lineTo(x, timelineHeight)
    ctx.stroke()
  }
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  row: TimelineRow,
  x: number,
  y: number,
  width: number,
  height: number,
  cssWidth: number,
  selected: boolean
) {
  const visibleX = Math.max(0, x)
  const visibleWidth = Math.min(cssWidth - visibleX, width - (visibleX - x))
  if (visibleWidth <= 0) return
  ctx.fillStyle = row.event.color
  ctx.fillRect(visibleX, y, visibleWidth, height)
  ctx.strokeStyle = selected ? "#ffffff" : "rgba(0,0,0,0.3)"
  ctx.lineWidth = selected ? 2 : 1
  ctx.strokeRect(visibleX, y, visibleWidth, height)
  ctx.fillStyle = "#e6edf3"
  ctx.font = "11px SF Mono, Menlo, Consolas, monospace"
  const label = `${row.hasChildren ? row.expanded ? "▾ " : "▸ " : ""}${row.event.name}`
  const available = visibleWidth - 8
  if (available < 12) return
  let visibleLabel = label
  while (ctx.measureText(`${visibleLabel}…`).width > available && visibleLabel.length > 0) visibleLabel = visibleLabel.slice(0, -1)
  ctx.fillText(visibleLabel === label ? label : `${visibleLabel}…`, visibleX + 4, y + height / 2 + 4)
  if (x + width <= cssWidth && available > 80) {
    const durationText = formatMs(row.event.endTime - row.event.startTime)
    ctx.fillStyle = "rgba(230,237,243,0.65)"
    ctx.font = "10px SF Mono, Menlo, Consolas, monospace"
    ctx.fillText(durationText, x + width - ctx.measureText(durationText).width - 4, y + height / 2 + 4)
  }
}

function drawRows(
  ctx: CanvasRenderingContext2D,
  rows: TimelineRow[],
  viewState: ViewState,
  size: CssSize,
  options: TraceViewerOptions,
  selectedId?: string | null
) {
  const duration = viewState.endMs - viewState.startMs
  if (!Number.isFinite(duration) || duration <= 0 || size.width <= 0 || size.height <= 0) return
  const pxPerMs = size.width / duration
  for (const row of rows) {
    const x = (row.event.startTime - viewState.startMs) * pxPerMs
    const y = traceY(row.row, viewState.offsetY, options)
    const width = Math.max(1, (row.event.endTime - row.event.startTime) * pxPerMs)
    if (x + width < 0 || x > size.width || y + options.barHeight < options.timelineHeight || y > size.height) continue
    drawBar(ctx, row, x, y, width, options.barHeight, size.width, selectedId === row.event.id)
  }
}

const TraceViewer: React.FC<TraceViewerProps> = ({
  rows,
  viewState,
  onViewStateChange,
  options = defaultOptions,
  selectedId,
  onTraceSelect,
  onToggleExpanded
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sizeRef = useRef<CssSize>({ width: 0, height: 0 })
  const draggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0, offsetY: 0 })

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const { width, height } = sizeRef.current
    const { backingWidth, backingHeight, dpr } = getCanvasBackingSize(width, height, window.devicePixelRatio)
    if (canvas.width !== backingWidth) canvas.width = backingWidth
    if (canvas.height !== backingHeight) canvas.height = backingHeight
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    drawRows(ctx, rows, viewState, sizeRef.current, options, selectedId)
    drawTimeScale(ctx, width, viewState, options.timelineHeight)
  }, [options, rows, selectedId, viewState])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      sizeRef.current = { width: rect.width, height: rect.height }
      const offsetY = clampVerticalOffset(viewState.offsetY, rows.length, rect.height, options)
      if (offsetY !== viewState.offsetY) onViewStateChange({ ...viewState, offsetY })
      else draw()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    window.addEventListener("resize", resize)
    resize()
    return () => { observer.disconnect(); window.removeEventListener("resize", resize) }
  }, [draw, onViewStateChange, options, rows.length, viewState])

  useEffect(() => draw(), [draw])

  useEffect(() => {
    const offsetY = clampVerticalOffset(viewState.offsetY, rows.length, sizeRef.current.height, options)
    if (offsetY !== viewState.offsetY) onViewStateChange({ ...viewState, offsetY })
  }, [onViewStateChange, options, rows.length, viewState])

  const selectAt = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const rect = canvas.getBoundingClientRect()
    return findTimelineRowAt(rows, viewState, rect.width, clientX - rect.left, clientY - rect.top, options)
  }, [options, rows, viewState])

  const zoomAt = useCallback((factor: number, anchorRatio: number) => {
    const duration = viewState.endMs - viewState.startMs
    const anchorTime = viewState.startMs + duration * anchorRatio
    onViewStateChange({
      startMs: anchorTime - (anchorTime - viewState.startMs) * factor,
      endMs: anchorTime + (viewState.endMs - anchorTime) * factor,
      offsetY: clampVerticalOffset(viewState.offsetY, rows.length, sizeRef.current.height, options)
    })
  }, [onViewStateChange, options, rows.length, viewState])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const anchor = rect.width > 0 ? Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) : 0.5
      zoomAt(event.deltaY > 0 ? 1.15 : 0.87, anchor)
    }
    canvas.addEventListener("wheel", handleWheel, { passive: false })
    return () => canvas.removeEventListener("wheel", handleWheel)
  }, [zoomAt])

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const hit = selectAt(event.clientX, event.clientY)
    if (hit) {
      onTraceSelect?.(hit.event.id)
      if (hit.hasChildren) {
        const rect = event.currentTarget.getBoundingClientRect()
        const duration = viewState.endMs - viewState.startMs
        const eventX = (hit.event.startTime - viewState.startMs) * rect.width / duration
        const visibleEventX = Math.max(0, eventX)
        const pointerX = event.clientX - rect.left
        if (pointerX >= visibleEventX && pointerX <= visibleEventX + 18) onToggleExpanded?.(hit.event.id)
      }
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    draggingRef.current = true
    dragStartRef.current = { x: event.clientX, y: event.clientY, offsetY: viewState.offsetY }
    event.currentTarget.style.cursor = "grabbing"
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingRef.current) {
      event.currentTarget.style.cursor = selectAt(event.clientX, event.clientY) ? "pointer" : "grab"
      return
    }
    const duration = viewState.endMs - viewState.startMs
    const deltaMs = (dragStartRef.current.x - event.clientX) * duration / Math.max(1, sizeRef.current.width)
    const offsetY = clampVerticalOffset(
      dragStartRef.current.offsetY + event.clientY - dragStartRef.current.y,
      rows.length,
      sizeRef.current.height,
      options
    )
    onViewStateChange({ startMs: viewState.startMs + deltaMs, endMs: viewState.endMs + deltaMs, offsetY })
    dragStartRef.current = { x: event.clientX, y: event.clientY, offsetY }
  }

  const endDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    event.currentTarget.style.cursor = "grab"
  }

  const selectRelative = (delta: number) => {
    if (rows.length === 0) return
    const currentIndex = rows.findIndex((row) => row.event.id === selectedId)
    const index = currentIndex < 0 ? (delta > 0 ? 0 : rows.length - 1) : Math.max(0, Math.min(rows.length - 1, currentIndex + delta))
    onTraceSelect?.(rows[index].event.id)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const duration = viewState.endMs - viewState.startMs
    const step = duration * 0.1
    if (event.key === "+" || event.key === "=") zoomAt(0.8, 0.5)
    else if (event.key === "-") zoomAt(1.25, 0.5)
    else if (event.key === "ArrowLeft") onViewStateChange({ ...viewState, startMs: viewState.startMs - step, endMs: viewState.endMs - step })
    else if (event.key === "ArrowRight") onViewStateChange({ ...viewState, startMs: viewState.startMs + step, endMs: viewState.endMs + step })
    else if (event.key === "ArrowUp" && event.shiftKey) onViewStateChange({ ...viewState, offsetY: clampVerticalOffset(viewState.offsetY + 24, rows.length, sizeRef.current.height, options) })
    else if (event.key === "ArrowDown" && event.shiftKey) onViewStateChange({ ...viewState, offsetY: clampVerticalOffset(viewState.offsetY - 24, rows.length, sizeRef.current.height, options) })
    else if (event.key === "ArrowUp") selectRelative(-1)
    else if (event.key === "ArrowDown") selectRelative(1)
    else return
    event.preventDefault()
  }

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab"
        role="application"
        tabIndex={0}
        aria-label="Trace timeline. Click a span's disclosure arrow to expand it. Use plus and minus to zoom, left and right to pan, up and down to select spans, and Shift plus up or down to scroll rows."
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
      <ul className="sr-only" aria-label="Visible timeline spans">
        {rows.map((row) => (
          <li key={row.event.id}>
            <button type="button" aria-current={selectedId === row.event.id ? "true" : undefined} onClick={() => onTraceSelect?.(row.event.id)}>
              {row.event.name}, {formatMs(row.event.endTime - row.event.startTime)}
            </button>
            {row.hasChildren && (
              <button type="button" aria-expanded={row.expanded} onClick={() => onToggleExpanded?.(row.event.id)}>
                {row.expanded ? "Collapse" : "Expand"} {row.event.name}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TraceViewer
