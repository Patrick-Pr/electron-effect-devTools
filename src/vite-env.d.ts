/// <reference types="vite/client" />

import type { BackendCommand, BackendSnapshot, BackendSubscriptionEvent } from "./lib/contracts/backend"
import type { LocationRecord } from "./lib/contracts/debug"

interface ElectronAPI {
  getSnapshot: () => Promise<BackendSnapshot>
  dispatch: (command: BackendCommand) => Promise<void>
  subscribe: (listener: (event: BackendSubscriptionEvent) => void) => () => void
  revealLocation: (location: LocationRecord) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
