import type { ReactNode } from "react"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 gap-3 text-tertiary text-center select-none">
      {icon && <div className="opacity-40 text-[32px] leading-none">{icon}</div>}
      <div className="text-md text-secondary">{title}</div>
      {description && <div className="text-sm max-w-70 leading-normal">{description}</div>}
    </div>
  )
}
