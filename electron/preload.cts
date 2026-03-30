import { contextBridge, ipcRenderer } from "electron"
import type { BackendCommand, BackendSnapshot, BackendSubscriptionEvent } from "../src/lib/contracts/backend.js"
import type { LocationRecord } from "../src/lib/contracts/debug.js"

contextBridge.exposeInMainWorld("electronAPI", {
  async getSnapshot(): Promise<BackendSnapshot> {
    return ipcRenderer.invoke("backend:get-snapshot")
  },
  async dispatch(command: BackendCommand): Promise<void> {
    await ipcRenderer.invoke("backend:dispatch", command)
  },
  subscribe(listener: (event: BackendSubscriptionEvent) => void) {
    const wrappedListener = (_event: unknown, payload: BackendSubscriptionEvent) => {
      listener(payload)
    }

    ipcRenderer.on("backend:state", wrappedListener)
    return () => {
      ipcRenderer.removeListener("backend:state", wrappedListener)
    }
  },
  revealLocation(location: LocationRecord) {
    return ipcRenderer.invoke("backend:dispatch", { type: "reveal-location", location } satisfies BackendCommand)
  }
})
