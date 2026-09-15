import { useEffect, useState } from 'react'
import { SectionFrame } from '../SectionFrame'

interface Testimonio {
  name: string
  role: string
  quote: string
}

const TESTIMONIOS: Testimonio[] = [
  {
    name: 'Euge L.',
    role: 'Kinesióloga',
    quote:
      'El sistema de pesos me convenció: entrenar vale más que ordenar el escritorio, y el número del día por fin refleja eso. Antes todo pesaba lo mismo y no tenía sentido.',
  },
  {
    name: 'Male F.',
    role: 'Diseñadora freelance',
    quote:
      'Probé como cuatro apps de hábitos antes de esta. La diferencia es que acá todo suma a un solo número — no tengo que abrir tres pantallas para saber si el día estuvo bien o mal.',
  },
  {
    name: 'Nico R.',
    role: 'Estudiante de ingeniería',
    quote:
      'Lo que más uso es la racha. Verla en 12 días seguidos me hizo dejar de faltar al gimnasio más de lo que me hizo cualquier propósito de año nuevo.',
  },
  {
    name: 'Caro Dominguez',
    role: 'Contadora',
    quote:
      'La revisión mensual me cambió la cabeza. Antes marzo se me mezclaba con febrero; ahora cierro el mes con cuatro preguntas y ya sé qué repetir y qué cortar.',
  },
  {
    name: 'Tomás B.',
    role: 'Desarrollador',
    quote:
      'Tenía objetivos y proyectos separados en dos apps distintas y nunca los miraba juntos. Acá el porcentaje del día ya cuenta lo importante, así que dejé de andar revisando dos lugares.',
  },
  {
    name: 'Vale S.',
    role: 'Product manager',
    quote:
      'El planificador semanal me ahorra el domingo a la noche pensando la semana. Arrastro una tarea a otro día si no llegué, y no se pierde — queda ahí esperando.',
  },
]

const AUTO_ADVANCE_MS = 6500

/**
 * Testimonios de ejemplo para mostrar cómo se vería la sección con opiniones
 * reales — todavía no hay una base de usuarios de la que sacar citas
 * genuinas, así que estos son ilustrativos y están pensados para
 * reemplazarse por opiniones reales apenas existan.
 */
export function TestimonialsSection() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (reduceMotion) return
    const id = setInterval(() => setIndex((i) => (i + 1) % TESTIMONIOS.length), AUTO_ADVANCE_MS)
    return () => clearInterval(id)
  }, [paused])

  const goTo = (i: number) => setIndex((i + TESTIMONIOS.length) % TESTIMONIOS.length)

  return (
    <SectionFrame
      eyebrow="Lo que dicen quienes lo usan"
      title="No hace falta que te lo contemos nosotros."
      subtitle="Ejemplos de opiniones — todavía no tenemos base de usuarios para citar; esto se reemplaza por reseñas reales apenas existan."
      className="pr-testimonials"
    >
      <div
        className="pr-testimonials__carousel"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <button
          type="button"
          className="pr-testimonials__nav pr-testimonials__nav--prev"
          aria-label="Testimonio anterior"
          onClick={() => goTo(index - 1)}
        >
          ‹
        </button>

        <div className="pr-testimonials__viewport" aria-live="polite">
          <blockquote key={TESTIMONIOS[index].name} className="pr-testimonials__card">
            <p className="pr-testimonials__quote">“{TESTIMONIOS[index].quote}”</p>
            <footer className="pr-testimonials__author">
              <span className="pr-testimonials__name">{TESTIMONIOS[index].name}</span>
              <span className="pr-testimonials__role">{TESTIMONIOS[index].role}</span>
            </footer>
          </blockquote>
        </div>

        <button
          type="button"
          className="pr-testimonials__nav pr-testimonials__nav--next"
          aria-label="Siguiente testimonio"
          onClick={() => goTo(index + 1)}
        >
          ›
        </button>
      </div>

      <div className="pr-testimonials__dots" role="tablist" aria-label="Elegir testimonio">
        {TESTIMONIOS.map((t, i) => (
          <button
            key={t.name}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Ver testimonio de ${t.name}`}
            className={`pr-testimonials__dot${i === index ? ' pr-testimonials__dot--active' : ''}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </SectionFrame>
  )
}
