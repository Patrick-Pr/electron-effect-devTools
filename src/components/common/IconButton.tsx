import { type CSSProperties, type ReactNode, useCallback, useState } from "react"

interface IconButtonProps {
  children: ReactNode
  title: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

const baseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  border: "none",
  borderRadius: "var(--radius-sm)",
  background: "transparent",
  color: "var(--text-secondary)",
  cursor: "pointer",
  padding: 0,
  transition: "background var(--transition-fast), color var(--transition-fast)"
}

export function IconButton({ children, title, onClick, danger, disabled }: IconButtonProps) {
  const [hovered, setHovered] = useState(false)

  const style: CSSProperties = {
    ...baseStyle,
    ...(hovered && !disabled ? {
      background: "var(--bg-hover)",
      color: danger ? "var(--accent-red)" : "var(--text-primary)"
    } : {}),
    ...(disabled ? { opacity: 0.4, cursor: "default" } : {})
  }

  const handleClick = useCallback(() => {
    if (!disabled) onClick()
  }, [disabled, onClick])

  return (
    <button
      style={style}
      title={title}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
