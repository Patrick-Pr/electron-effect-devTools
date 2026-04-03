interface StatusNotificationProps {
  title: string
  body: string
  onDismiss: () => void
}

export function StatusNotification({ title, body, onDismiss }: StatusNotificationProps) {
  return (
    <aside className="status-notification" role="alert" aria-live="assertive">
      <div className="status-notification__header">
        <strong>{title}</strong>
        <button
          className="status-notification__dismiss"
          type="button"
          aria-label="Dismiss notification"
          onClick={onDismiss}
        >
          ×
        </button>
      </div>
      <p>{body}</p>
    </aside>
  )
}
