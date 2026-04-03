import type { ReactNode } from "react"

export interface TreeNode {
  id: string
  label: string
  detail?: string
  icon?: ReactNode
  badge?: ReactNode
  children?: TreeNode[]
  onClick?: () => void
}
