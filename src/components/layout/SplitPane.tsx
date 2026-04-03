import { type CSSProperties, type ReactNode, useCallback, useRef, useState } from "react"

interface SplitPaneProps {
  left: ReactNode
  right: ReactNode
  initialRightWidth?: number
  minRightWidth?: number
  maxRightWidth?: number
}

const containerStyle: CSSProperties = {
  display: "flex",
  height: "100%",
  overflow: "hidden"
}

const dividerStyle: CSSProperties = {
  width: 1,
  flexShrink: 0,
  background: "var(--border-default)",
  cursor: "col-resize",
  position: "relative"
}

const dividerHitArea: CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: -3,
  right: -3,
  zIndex: 10
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
    <div ref={containerRef} style={containerStyle}>
      <div style={{ flex: 1, overflow: "hidden" }}>{left}</div>
      <div style={dividerStyle} onMouseDown={handleMouseDown}>
        <div style={dividerHitArea} />
      </div>
      <div style={{ width: rightWidth, flexShrink: 0, overflow: "hidden" }}>{right}</div>
    </div>
  )
}
