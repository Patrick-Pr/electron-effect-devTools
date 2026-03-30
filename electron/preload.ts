import { contextBridge } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  appName: "Effect DevTools",
  version: "ui-preview",
  revealLocation(location: { path: string; line: number; column: number }) {
    // FIXME: replace preview stub with IPC to native open/reveal behavior.
    console.info("FIXME revealLocation", location)
  },
  invokeAction(action: string, payload?: unknown) {
    // FIXME: wire renderer actions to backend/devtools processes.
    console.info("FIXME invokeAction", action, payload)
  }
})
