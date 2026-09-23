import type { TreeNode } from "../../components/tree/tree-types"
import type { VariableRecord } from "../../lib/contracts/debug"

export function variableNodes(variables: VariableRecord[], prefix: string): TreeNode[] {
  return variables.map((variable) => ({
    id: `${prefix}-${variable.id}`,
    label: variable.name || "value",
    detail: variable.value,
    hasChildren: variable.isContainer === true,
    children: variable.children ? variableNodes(variable.children, prefix) : [],
    onExpand: variable.isContainer && !variable.childrenLoaded
      ? () => { void window.electronAPI.dispatch({ type: "debug:variables:load", variableId: variable.id }) }
      : undefined
  }))
}
