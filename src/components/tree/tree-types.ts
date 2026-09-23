import type { ReactNode } from "react"

export interface TreeNode {
  id: string
  label: string
  detail?: string
  icon?: ReactNode
  badge?: ReactNode
  children?: TreeNode[]
  hasChildren?: boolean
  onClick?: () => void
  onExpand?: () => void
  actions?: ReactNode
}
