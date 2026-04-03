import { type ReactNode, useCallback, useRef, useState } from "react"

interface SplitPaneProps {
  left: ReactNode
  right: ReactNode
  initialRightWidth?: number
  minRightWidth?: number
  maxRightWidth?: number
}

export function SplitPane({
  left,
  right,
  initialRightWidth = 300,
  minRightWidth = 200,
  maxRightWidth = 500
}: SplitPaneProps) {
  const [rightWidth, setRightWidth] = useState(initialRightWidth)
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = true

    const startX = e.clientX
    const startWidth = rightWidth

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!draggingRef.current) return
      const delta = startX - moveEvent.clientX
      const newWidth = Math.max(minRightWidth, Math.min(maxRightWidth, startWidth + delta))
      setRightWidth(newWidth)
    }

    const handleMouseUp = () => {
      draggingRef.current = false
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }, [rightWidth, minRightWidth, maxRightWidth])

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-hidden">{left}</div>
      <div className="w-px shrink-0 bg-border cursor-col-resize relative" onMouseDown={handleMouseDown}>
        <div className="absolute inset-y-0 -left-0.75 -right-0.75 z-10" />
      </div>
      <div className="shrink-0 overflow-hidden" style={{ width: rightWidth }}>{right}</div>
    </div>
  )
}
