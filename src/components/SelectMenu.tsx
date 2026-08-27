import { useEffect, useRef, useState } from 'react'

export interface SelectMenuOption<T extends string> {
  value: T
  label: string
  /** Color del punto indicador, ej. `var(--band-top)`. Sin valor = sin punto. */
  color?: string
}

interface Props<T extends string> {
  value: T
  options: Array<SelectMenuOption<T>>
  onChange: (value: T) => void
  ariaLabel: string
}

/**
 * Reemplazo de `<select>` nativo: mismo comportamiento (un valor de una lista
 * fija) pero con estilo propio consistente en cualquier navegador/tema, y un
 * punto de color por opción. Cierra con click afuera o Escape.
 */
export function SelectMenu<T extends string>({ value, options, onChange, ariaLabel }: Props<T>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="select-menu" ref={rootRef}>
      <button
        type="button"
        className="select-menu__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {current?.color && <span className="select-menu__dot" style={{ background: current.color }} />}
        <span>{current?.label ?? value}</span>
        <span className="select-menu__caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul className="select-menu__list" role="listbox" aria-label={ariaLabel}>
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                className={`select-menu__option${o.value === value ? ' select-menu__option--selected' : ''}`}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
              >
                {o.color && <span className="select-menu__dot" style={{ background: o.color }} />}
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
