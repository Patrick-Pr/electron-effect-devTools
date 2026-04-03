import type { CSSProperties } from "react"
import { useBackendSnapshot } from "../../lib/backend/BackendProvider"
import { IconButton } from "../../components/common/IconButton"

const barStyle: CSSProperties = {
  height: "var(--top-bar-height)",
  display: "flex",
  alignItems: "center",
  padding: "0 var(--space-4)",
  gap: "var(--space-3)",
  borderBottom: "1px solid var(--border-default)",
  background: "var(--bg-raised)",
  flexShrink: 0,
  userSelect: "none",
  // @ts-expect-error Electron-specific CSS property
  WebkitAppRegion: "drag"
}

const titleStyle: CSSProperties = {
  fontSize: "var(--font-size-sm)",
  fontWeight: 600,
  color: "var(--text-primary)",
  letterSpacing: "0.02em"
}

const dotStyle = (running: boolean): CSSProperties => ({
  width: 7,
  height: 7,
  borderRadius: "50%",
  background: running ? "var(--status-ok)" : "var(--text-tertiary)",
  flexShrink: 0,
  boxShadow: running ? "0 0 6px var(--status-ok)" : "none",
  transition: "background var(--transition-normal), box-shadow var(--transition-normal)"
})

const statusTextStyle: CSSProperties = {
  fontSize: "var(--font-size-xs)",
  color: "var(--text-secondary)",
  fontFamily: "var(--font-mono)"
}

const spacer: CSSProperties = { flex: 1 }

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 2.5l9 5.5-9 5.5V2.5z" />
  </svg>
)

const StopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <rect x="3" y="3" width="10" height="10" rx="1" />
  </svg>
)

export function TopBar() {
  const { clients: { runningState }, appName } = useBackendSnapshot()

  const handleToggle = () => {
    window.electronAPI.dispatch({
      type: runningState.running ? "server:stop" : "server:start"
    })
  }

  return (
    <div style={barStyle}>
      <span style={titleStyle}>{appName}</span>
      <div style={spacer} />
      <div style={dotStyle(runningState.running)} />
      <span style={statusTextStyle}>
        {runningState.running ? `port ${runningState.port}` : "stopped"}
      </span>
      {/* @ts-expect-error Electron-specific CSS property */}
      <div style={{ WebkitAppRegion: "no-drag" }}>
        <IconButton
          title={runningState.running ? "Stop server" : "Start server"}
          onClick={handleToggle}
          danger={runningState.running}
        >
          {runningState.running ? <StopIcon /> : <PlayIcon />}
        </IconButton>
      </div>
    </div>
  )
}
