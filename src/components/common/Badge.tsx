interface BadgeProps {
  tone?: "neutral" | "accent" | "success" | "warning"
  children: React.ReactNode
}

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}
