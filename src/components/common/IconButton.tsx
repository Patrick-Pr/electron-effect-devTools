import { type ReactNode, useCallback } from "react"
import clsx from "clsx"

interface IconButtonProps {
  children: ReactNode
  title: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

export function IconButton({ children, title, onClick, danger, disabled }: IconButtonProps) {
  const handleClick = useCallback(() => {
    if (!disabled) onClick()
  }, [disabled, onClick])

  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center size-6.5 border-none rounded-sm bg-transparent text-secondary cursor-pointer p-0",
        "transition-[background,color] duration-(--transition-fast)",
        disabled
          ? "opacity-40 cursor-default"
          : [
              "hover:bg-subtle-hover",
              danger ? "hover:text-accent-red" : "hover:text-primary"
            ]
      )}
      title={title}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
