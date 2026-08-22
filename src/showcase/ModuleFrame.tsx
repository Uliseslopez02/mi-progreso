import type { ReactNode } from 'react'
import { useRevealOnScroll } from './useRevealOnScroll'

interface Props {
  eyebrow: string
  title: string
  hint?: string
  className?: string
  delay?: number
  children: ReactNode
}

/** Envoltorio común de cada módulo: card con identidad Rimu + entrada al hacer scroll. */
export function ModuleFrame({ eyebrow, title, hint, className = '', delay = 0, children }: Props) {
  const { ref, visible } = useRevealOnScroll<HTMLElement>()

  return (
    <section
      ref={ref}
      className={`sc-module${visible ? ' sc-module--visible' : ''} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      <header className="sc-module__head">
        <p className="hero__eyebrow">{eyebrow}</p>
        <h3 className="sc-module__title">{title}</h3>
        {hint && <p className="card__hint">{hint}</p>}
      </header>
      <div className="sc-module__body">{children}</div>
    </section>
  )
}
