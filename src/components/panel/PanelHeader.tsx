interface PanelHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function PanelHeader({ title, subtitle, actions }: PanelHeaderProps) {
  return (
    <header className="panel-header">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="panel-actions">{actions}</div> : null}
    </header>
  )
}
