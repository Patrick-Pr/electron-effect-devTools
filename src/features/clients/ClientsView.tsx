import { useCallback } from "react"
import clsx from "clsx"
import { useBackendSnapshot } from "../../lib/backend/BackendProvider"
import { PanelHeader } from "../../components/panel/PanelHeader"
import { StatusNotification } from "../../components/common/StatusNotification"
import { Badge } from "../../components/common/Badge"
import { IconButton } from "../../components/common/IconButton"
import { EmptyState } from "../../components/common/EmptyState"
import type { ClientRecord } from "../../lib/contracts/clients"

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

  return (
    <div
      className={clsx(
        "group flex items-center gap-2 border-b border-border-muted",
        "transition-[background] duration-(--transition-fast-duration) ease-(--transition-ease)",
        client.active
          ? "bg-accent-blue/10 border-l-[3px] border-l-accent-blue"
          : "border-l-[3px] border-l-transparent hover:bg-subtle-hover"
      )}
    >
      <button
        type="button"
        className="flex flex-1 items-center gap-3 py-3 pl-3 min-w-0 border-0 bg-transparent text-left cursor-pointer disabled:cursor-default"
        onClick={handleSelect}
        disabled={!connected}
        aria-current={client.active ? "true" : undefined}
        aria-label={`${client.name}, ${client.status}`}
      >
        <span
          className={clsx(
            "size-2 rounded-full shrink-0",
            connected ? "bg-status-ok shadow-[0_0_4px_var(--color-status-ok)]" : "bg-tertiary"
          )}
          aria-hidden="true"
        />
        <span className="flex-1 min-w-0">
          <span className="block font-medium text-md text-primary truncate">{client.name}</span>
          <span className="flex gap-2 items-center mt-0.5">
            <span className="sr-only">{client.status}. </span>
            <Badge variant={client.transport}>{client.transport}</Badge>
            {client.pid && <span className="text-xs text-tertiary font-mono">PID {client.pid}</span>}
            {client.lastSeen && <span className="text-xs text-tertiary font-mono">{client.lastSeen}</span>}
          </span>
        </span>
      </button>
      <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto flex gap-1 shrink-0 pr-3 transition-opacity duration-(--transition-fast-duration) ease-(--transition-ease)">
        {connected && (
          <IconButton title={`Disconnect ${client.name}`} onClick={handleDisconnect}>
            <DisconnectIcon />
          </IconButton>
        )}
        <IconButton title={`Remove ${client.name}`} onClick={handleRemove} danger>
          <RemoveIcon />
        </IconButton>
      </div>
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
    <div className="flex flex-col h-full overflow-hidden">
      <PanelHeader title="Clients" count={clients.length} />
      <StatusNotification
        level={statusLevel}
        message={runningState.message}
        detail={runningState.error}
        action={
          <button
            onClick={handleToggle}
            className="border border-border rounded-lg bg-surface text-primary text-sm font-medium leading-none p-2 cursor-pointer"
          >
            {runningState.running ? "Stop" : "Start"}
          </button>
        }
      />
      <div className="flex-1 overflow-auto">
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
