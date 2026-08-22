interface Props {
  title?: string
  message: string
  onRetry: () => void
  /** Sólo tiene sentido cuando el error puede deberse a una sesión inválida (carga de datos ya autenticado). */
  onSignOut?: () => void
}

/** Pantalla de error de inicialización (carga de datos, sesión, etc.) con salida clara: reintentar. */
export function ErrorScreen({ title = 'No pudimos preparar tu progreso', message, onRetry, onSignOut }: Props) {
  return (
    <div className="loading-screen">
      <div className="loading-screen__mark loading-screen__mark--error" aria-hidden="true">
        <span className="loading-screen__logo">!</span>
      </div>
      <p className="loading-screen__brand">Mi Progreso</p>
      <h1 className="loading-screen__title">{title}</h1>
      <p className="loading-screen__message" role="alert">
        {message}
      </p>
      <div className="loading-screen__actions">
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Reintentar
        </button>
        {onSignOut && (
          <button type="button" className="btn btn--ghost" onClick={onSignOut}>
            Volver a iniciar sesión
          </button>
        )}
      </div>
    </div>
  )
}
