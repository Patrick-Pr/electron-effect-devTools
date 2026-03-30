export function invokePreviewAction(action: string, payload?: unknown) {
  // FIXME: replace preview action dispatch with real Electron IPC/backend integration.
  window.electronAPI.invokeAction(action, payload)
}

export function revealPreviewLocation(path: string, line: number, column: number) {
  // FIXME: replace preview reveal handling with native editor/file opening.
  window.electronAPI.revealLocation({ path, line, column })
}
