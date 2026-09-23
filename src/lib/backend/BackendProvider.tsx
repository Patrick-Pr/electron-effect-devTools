import { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { BackendSnapshot } from "../contracts/backend"

const initialSnapshot: BackendSnapshot = {
  appName: "Effect DevTools",
  version: "1.0.0",
  clients: {
    runningState: {
      running: false,
      port: 34437,
      message: "Loading backend..."
    },
    clients: []
  },
  metrics: {
    metrics: []
  },
  tracer: {
    spans: [],
    events: []
  },
  debug: {
    status: "unavailable",
    message: "Starting debug-session bridge...",
    bridgePort: 34438,
    context: [],
    spanStack: [],
    spanStackIgnoreListEnabled: true,
    fibers: [],
    breakpoints: { pauseOnDefects: false, values: [] }
  }
}

const BackendContext = createContext<BackendSnapshot>(initialSnapshot)

interface BackendProviderProps {
  children: React.ReactNode
}

export function BackendProvider({ children }: BackendProviderProps) {
  const [snapshot, setSnapshot] = useState<BackendSnapshot>(initialSnapshot)

  useEffect(() => {
    let disposed = false

    void window.electronAPI.getSnapshot().then((nextSnapshot) => {
      if (!disposed) {
        setSnapshot(nextSnapshot)
      }
    })

    const unsubscribe = window.electronAPI.subscribe((event) => {
      if (!disposed && event.type === "backend:state") {
        setSnapshot(event.snapshot)
      }
    })

    return () => {
      disposed = true
      unsubscribe()
    }
  }, [])

  const value = useMemo(() => snapshot, [snapshot])

  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>
}

export function useBackendSnapshot(): BackendSnapshot {
  return useContext(BackendContext)
}
