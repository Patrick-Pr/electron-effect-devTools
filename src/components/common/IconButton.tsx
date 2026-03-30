interface IconButtonProps {
  label: string
  onClick?: () => void
  children: React.ReactNode
  active?: boolean
}

export function IconButton({ label, onClick, children, active }: IconButtonProps) {
  return (
    <button className={`icon-button${active ? " is-active" : ""}`} onClick={onClick} title={label}>
      <span>{children}</span>
    </button>
  )
}
