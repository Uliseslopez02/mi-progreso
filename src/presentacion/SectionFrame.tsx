import type { ReactNode } from 'react'
import { useRevealOnScroll } from './useRevealOnScroll'

interface Props {
  eyebrow?: string
  title: string
  subtitle?: string
  className?: string
  children: ReactNode
}

/** Envoltorio común de cada sección narrativa: título + entrada al hacer scroll. */
export function SectionFrame({ eyebrow, title, subtitle, className = '', children }: Props) {
  const { ref, visible } = useRevealOnScroll<HTMLElement>()

  return (
    <section ref={ref} className={`pr-section${visible ? ' pr-section--visible' : ''} ${className}`}>
      <header className="pr-section__head">
        {eyebrow && <p className="pr-eyebrow">{eyebrow}</p>}
        <h2 className="pr-section__title">{title}</h2>
        {subtitle && <p className="pr-section__subtitle">{subtitle}</p>}
      </header>
      <div className="pr-section__body">{children}</div>
    </section>
  )
}
