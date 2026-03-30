interface PanelProps {
  children: React.ReactNode
}

export function Panel({ children }: PanelProps) {
  return <section className="panel">{children}</section>
}
