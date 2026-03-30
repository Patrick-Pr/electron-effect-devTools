export interface TreeAction {
  id: string
  label: string
  icon: string
  onSelect?: () => void
}

export interface TreeNodeData {
  id: string
  label: string
  description?: string
  monoDescription?: boolean
  icon?: string
  dimmed?: boolean
  defaultExpanded?: boolean
  children?: TreeNodeData[]
  actions?: TreeAction[]
}
