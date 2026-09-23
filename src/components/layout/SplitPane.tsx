import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"

interface SplitPaneProps {
  left: ReactNode
  right: ReactNode
  initialRightWidth?: number
  minRightWidth?: number
  maxRightWidth?: number
  minLeftWidth?: number
}

const DIVIDER_WIDTH = 1
const KEYBOARD_STEP = 16

export function SplitPane({
  left,
  right,
  initialRightWidth = 300,
  minRightWidth = 200,
  maxRightWidth = 500,
  minLeftWidth = 180
}: SplitPaneProps) {
  const [rightWidth, setRightWidth] = useState(initialRightWidth)
  const [effectiveMax, setEffectiveMax] = useState(maxRightWidth)
  const containerRef = useRef<HTMLDivElement>(null)
  const dividerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null)
  const previousBodyStyleRef = useRef<{ cursor: string; userSelect: string } | null>(null)

  const measureMaximum = useCallback(() => {
    const containerWidth = containerRef.current?.getBoundingClientRect().width ?? 0
    return Math.max(0, Math.min(maxRightWidth, containerWidth - minLeftWidth - DIVIDER_WIDTH))
  }, [maxRightWidth, minLeftWidth])

  const clampWidth = useCallback((width: number) => {
    const maximum = measureMaximum()
    const minimum = Math.min(minRightWidth, maximum)
    return Math.max(minimum, Math.min(maximum, width))
  }, [measureMaximum, minRightWidth])

  const cleanupDrag = useCallback(() => {
    const drag = dragRef.current
    const divider = dividerRef.current
    if (drag && divider?.hasPointerCapture(drag.pointerId)) divider.releasePointerCapture(drag.pointerId)
    dragRef.current = null
    const previous = previousBodyStyleRef.current
    if (previous) {
      document.body.style.cursor = previous.cursor
      document.body.style.userSelect = previous.userSelect
      previousBodyStyleRef.current = null
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const resize = () => {
      const maximum = measureMaximum()
      setEffectiveMax(maximum)
      setRightWidth((width) => clampWidth(width))
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    window.addEventListener("blur", cleanupDrag)
    resize()
    return () => {
      observer.disconnect()
      window.removeEventListener("blur", cleanupDrag)
      cleanupDrag()
    }
  }, [clampWidth, cleanupDrag, measureMaximum])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    cleanupDrag()
    previousBodyStyleRef.current = {
      cursor: document.body.style.cursor,
      userSelect: document.body.style.userSelect
    }
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startWidth: rightWidth }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setRightWidth(clampWidth(drag.startWidth + drag.startX - event.clientX))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    let next: number | undefined
    if (event.key === "ArrowLeft") next = rightWidth + KEYBOARD_STEP
    else if (event.key === "ArrowRight") next = rightWidth - KEYBOARD_STEP
    else if (event.key === "Home") next = minRightWidth
    else if (event.key === "End") next = effectiveMax
    if (next === undefined) return
    event.preventDefault()
    setRightWidth(clampWidth(next))
  }

  const effectiveMin = Math.min(minRightWidth, effectiveMax)
  return (
    <div ref={containerRef} className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-hidden min-w-0">{left}</div>
      <div
        ref={dividerRef}
        role="separator"
        aria-label="Resize details pane"
        aria-orientation="vertical"
        aria-valuemin={Math.round(effectiveMin)}
        aria-valuemax={Math.round(effectiveMax)}
        aria-valuenow={Math.round(rightWidth)}
        tabIndex={0}
        className="w-px shrink-0 bg-border cursor-col-resize relative focus-visible:z-20"
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={cleanupDrag}
        onPointerCancel={cleanupDrag}
        onLostPointerCapture={cleanupDrag}
      >
        <div className="absolute inset-y-0 -left-1.5 -right-1.5 z-10" />
      </div>
      <div className="shrink-0 overflow-hidden" style={{ width: rightWidth }}>{right}</div>
    </div>
  )
}
