import { type CSSProperties, useCallback, useState } from "react"
import { useBackendSnapshot } from "../../lib/backend/BackendProvider"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { StatusNotification } from "../../components/common/StatusNotification"
import { Badge } from "../../components/common/Badge"
import { IconButton } from "../../components/common/IconButton"
import { EmptyState } from "../../components/common/EmptyState"
import type { ClientRecord } from "../../lib/contracts/clients"

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden"
}

const listStyle: CSSProperties = {
  flex: 1,
  overflow: "auto"
}

const clientRowBase: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  padding: "var(--space-3) var(--space-4)",
  cursor: "pointer",
  transition: "background var(--transition-fast)",
  borderBottom: "1px solid var(--border-muted)"
}

const nameStyle: CSSProperties = {
  fontWeight: 500,
  fontSize: "var(--font-size-md)",
  color: "var(--text-primary)",
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
}

const metaStyle: CSSProperties = {
  fontSize: "var(--font-size-xs)",
  color: "var(--text-tertiary)",
  fontFamily: "var(--font-mono)"
}

const actionsStyle: CSSProperties = {
  display: "flex",
  gap: "var(--space-1)",
  flexShrink: 0
}

const DisconnectIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M4 4l8 8M4 12l8-8" />
  </svg>
)

const RemoveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M5 3v-1h6v1M3 3h10M4 3v10a1 1 0 001 1h6a1 1 0 001-1V3" />
  </svg>
)

function ClientRow({ client }: { client: ClientRecord }) {
  const [hovered, setHovered] = useState(false)
  const connected = client.status === "connected"

  const handleSelect = useCallback(() => {
    if (connected) {
      window.electronAPI.dispatch({ type: "client:select", clientId: client.id })
    }
  }, [client.id, connected])

  const handleDisconnect = useCallback(() => {
    window.electronAPI.dispatch({ type: "client:disconnect", clientId: client.id })
  }, [client.id])

  const handleRemove = useCallback(() => {
    window.electronAPI.dispatch({ type: "client:remove", clientId: client.id })
  }, [client.id])

  const rowStyle: CSSProperties = {
    ...clientRowBase,
    background: client.active
      ? "color-mix(in srgb, var(--accent-blue) 10%, transparent)"
      : hovered
        ? "var(--bg-hover)"
        : "transparent",
    borderLeft: client.active ? "3px solid var(--accent-blue)" : "3px solid transparent"
  }

  const dotStyle: CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: connected ? "var(--status-ok)" : "var(--text-tertiary)",
    flexShrink: 0,
    boxShadow: connected ? "0 0 4px var(--status-ok)" : "none"
  }

  return (
    <div
      style={rowStyle}
      onClick={handleSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={dotStyle} title={client.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={nameStyle}>{client.name}</div>
        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", marginTop: 2 }}>
          <Badge variant={client.transport}>{client.transport}</Badge>
          {client.pid && <span style={metaStyle}>PID {client.pid}</span>}
          {client.lastSeen && <span style={metaStyle}>{client.lastSeen}</span>}
        </div>
      </div>
      {hovered && (
        <div style={actionsStyle}>
          {connected && (
            <IconButton title="Disconnect" onClick={handleDisconnect}>
              <DisconnectIcon />
            </IconButton>
          )}
          <IconButton title="Remove" onClick={handleRemove} danger>
            <RemoveIcon />
          </IconButton>
        </div>
      )}
    </div>
  )
}

export function ClientsView() {
  const { clients: { runningState, clients } } = useBackendSnapshot()

  const statusLevel = runningState.error ? "error" : runningState.running ? "ok" : "info"

  const handleToggle = useCallback(() => {
    window.electronAPI.dispatch({
      type: runningState.running ? "server:stop" : "server:start"
    })
  }, [runningState.running])

  return (
    <div style={containerStyle}>
      <PanelHeader title="Clients" count={clients.length} />
      <StatusNotification
        level={statusLevel}
        message={runningState.message}
        detail={runningState.error}
        action={
          <button
            onClick={handleToggle}
            style={{
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              fontSize: "var(--font-size-xs)",
              padding: "3px 10px",
              cursor: "pointer"
            }}
          >
            {runningState.running ? "Stop" : "Start"}
          </button>
        }
      />
      <div style={listStyle}>
        {clients.length === 0 ? (
          <EmptyState
            title="No clients connected"
            description={runningState.running
              ? "Waiting for Effect apps to connect on port " + runningState.port
              : "Start the server to accept connections"
            }
          />
        ) : (
          clients.map((client) => <ClientRow key={client.id} client={client} />)
        )}
      </div>
    </div>
  )
}
