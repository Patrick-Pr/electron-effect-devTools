/// <reference types="vite/client" />

interface ElectronAPI {
  appName: string
  version: string
  revealLocation: (location: { path: string; line: number; column: number }) => void
  invokeAction: (action: string, payload?: unknown) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
