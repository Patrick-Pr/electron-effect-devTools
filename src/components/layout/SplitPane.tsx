interface SplitPaneProps {
  sidebar: React.ReactNode
  main: React.ReactNode
  details?: React.ReactNode
}

export function SplitPane({ sidebar, main, details }: SplitPaneProps) {
  return (
    <div className="workspace-split">
      <aside className="workspace-sidebar">{sidebar}</aside>
      <section className="workspace-main">{main}</section>
      {details ? <aside className="workspace-details">{details}</aside> : null}
    </div>
  )
}
