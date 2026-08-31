import { useEffect, type ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  /** Fila de acciones (Guardar/Cancelar/Eliminar) fija al fondo del panel,
   * fuera del área que hace scroll — para que nunca quede oculta en modales
   * largos (antes cada modal la ponía como último hijo de `children`, dentro
   * del mismo scroll que el resto del contenido). */
  footer?: ReactNode
  /** Ancho del panel. Por defecto 560px. */
  width?: number
}

/** Modal genérico: backdrop + panel centrado, cierra con click afuera o Escape. */
export function Modal({ title, onClose, children, footer, width = 560 }: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="modal">
      <button type="button" className="modal__backdrop" tabIndex={-1} aria-hidden="true" onClick={onClose} />
      <div
        className="modal__panel"
        style={{ width: `min(${width}px, 92vw)` }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal__header">
          <span>{title}</span>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  )
}
