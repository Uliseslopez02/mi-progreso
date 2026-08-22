import type { ReactNode } from 'react'

interface Props {
  label: string
  value: ReactNode
  hint?: ReactNode
}

export function Stat({ label, value, hint }: Props) {
  return (
    <div className="stat">
      <p className="stat__label">{label}</p>
      <p className="stat__value numeric">{value}</p>
      {hint && <p className="stat__hint">{hint}</p>}
    </div>
  )
}
