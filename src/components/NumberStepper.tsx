import { useEffect, useState } from 'react'

interface Props {
  id?: string
  value: number | undefined
  onCommit: (value: number | undefined) => void
  min?: number
  max?: number
  step?: number
  /** Si es true, dejar el campo vacío al perder foco confirma `undefined` en vez de volver a un valor por defecto. */
  allowEmpty?: boolean
  ariaLabel?: string
  placeholder?: string
  style?: React.CSSProperties
  className?: string
}

/**
 * Input numérico con estado local de texto: permite borrar todos los dígitos
 * mientras se edita (el valor "real" recién se confirma y clampea al perder foco),
 * y suma botones +/- porque en mobile los steppers nativos del input no son usables.
 */
export function NumberStepper({
  id,
  value,
  onCommit,
  min,
  max,
  step = 1,
  allowEmpty = false,
  ariaLabel,
  placeholder,
  style,
  className,
}: Props) {
  const [text, setText] = useState(value === undefined ? '' : String(value))

  useEffect(() => {
    setText(value === undefined ? '' : String(value))
  }, [value])

  const clamp = (n: number) => {
    let result = n
    if (min !== undefined) result = Math.max(min, result)
    if (max !== undefined) result = Math.min(max, result)
    return result
  }

  const commitFromText = (raw: string) => {
    if (raw.trim() === '') {
      if (allowEmpty) {
        onCommit(undefined)
      } else {
        const fallback = clamp(min ?? 0)
        setText(String(fallback))
        onCommit(fallback)
      }
      return
    }
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) {
      setText(value === undefined ? '' : String(value))
      return
    }
    const clamped = clamp(parsed)
    setText(String(clamped))
    onCommit(clamped)
  }

  const handleChange = (raw: string) => {
    setText(raw)
    // Vacío o no numérico: no confirmar todavía (permite borrar el último
    // dígito en mobile sin que el valor "salte" a un default). Se resuelve al perder foco.
    if (raw.trim() === '') return
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return
    onCommit(clamp(parsed))
  }

  const stepBy = (delta: number) => {
    const base = value ?? min ?? 0
    const next = clamp(base + delta)
    setText(String(next))
    onCommit(next)
  }

  return (
    <div className={`number-stepper${className ? ` ${className}` : ''}`} style={style}>
      <button
        type="button"
        className="number-stepper__btn"
        aria-label={ariaLabel ? `Bajar ${ariaLabel}` : 'Bajar valor'}
        onClick={() => stepBy(-step)}
      >
        −
      </button>
      <input
        id={id}
        className="input number-stepper__input"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={(e) => commitFromText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
      <button
        type="button"
        className="number-stepper__btn"
        aria-label={ariaLabel ? `Subir ${ariaLabel}` : 'Subir valor'}
        onClick={() => stepBy(step)}
      >
        +
      </button>
    </div>
  )
}
