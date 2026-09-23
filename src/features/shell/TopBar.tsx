import clsx from "clsx"
import { useBackendSnapshot } from "../../lib/backend/BackendProvider"
import { IconButton } from "../../components/common/IconButton"

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
    // @ts-expect-error Electron-specific CSS property
    <div className="h-(--top-bar-height) flex items-center px-4 gap-3 border-b border-border bg-raised shrink-0 select-none" style={{ WebkitAppRegion: "drag" }}>
      <span className="text-sm font-semibold text-primary tracking-[0.02em]">{appName}</span>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <div
          className={clsx(
            "size-1.75 rounded-full shrink-0 transition-[background,box-shadow] duration-(--transition-normal-duration) ease-(--transition-ease)",
            runningState.running
              ? "bg-status-ok shadow-[0_0_6px_var(--color-status-ok)]"
              : "bg-tertiary shadow-none"
          )}
        />
        <span className="text-md text-secondary font-mono">
          {runningState.running ? `port ${runningState.port}` : "stopped"}
        </span>
        {/* @ts-expect-error Electron-specific CSS property */}
        <div className="border border-gray-500 bg-gray-800 rounded-lg" style={{ WebkitAppRegion: "no-drag" }}>
          <IconButton
            title={runningState.running ? "Stop server" : "Start server"}
            onClick={handleToggle}
            danger={runningState.running}
          >
            {runningState.running ? <StopIcon /> : <PlayIcon />}
          </IconButton>
        </div>
      </div>
    </div>
  )
}
