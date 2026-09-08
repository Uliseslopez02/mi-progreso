import type { ReactNode } from 'react'
import { useRevealOnScroll } from './useRevealOnScroll'

/** Bloque narrativo ancho (fuera del bento): título + entrada al hacer scroll. */
function Narrative({
  eyebrow,
  title,
  subtitle,
  className = '',
  children,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  className?: string
  children: ReactNode
}) {
  const { ref, visible } = useRevealOnScroll<HTMLElement>()
  return (
    <section ref={ref} className={`sc-narrative${visible ? ' sc-narrative--visible' : ''} ${className}`}>
      <header className="sc-narrative__head">
        <p className="hero__eyebrow">{eyebrow}</p>
        <h2 className="sc-narrative__title">{title}</h2>
        {subtitle && <p className="sc-narrative__subtitle">{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}

const PROBLEMS = [
  {
    title: 'Una agenda te dice qué hacer hoy',
    text: 'Pero no si venís cumpliendo, ni qué tan constante fuiste el mes pasado.',
  },
  {
    title: 'Un Excel guarda números',
    text: 'Pero nadie los pesa, ni los conecta con lo que de verdad importa en tu semana.',
  },
  {
    title: 'Una lista de tareas se tacha y se olvida',
    text: 'Cumplir una tarea suelta no te muestra el patrón detrás de tus días.',
  },
]

export function ProblemStrip() {
  return (
    <Narrative
      eyebrow="El problema"
      title="Hacés cosas todos los días. ¿Pero sabés si estás progresando?"
      subtitle="La mayoría de las herramientas registran tareas sueltas. Ninguna te devuelve un número que resuma tu constancia real."
      className="sc-problem"
    >
      <div className="sc-problem__grid">
        {PROBLEMS.map((p) => (
          <div className="sc-problem__card" key={p.title}>
            <h3>{p.title}</h3>
            <p>{p.text}</p>
          </div>
        ))}
      </div>
    </Narrative>
  )
}

const STEPS = [
  { title: 'Elegís tus áreas y objetivos', text: 'El onboarding arranca por áreas de vida, no por una pantalla en blanco.' },
  { title: 'Los organizás en tu semana', text: 'Agenda para lo que tiene día y hora, Proyectos para lo que no, Rutinas para lo que se repite.' },
  { title: 'Los cumplís día a día', text: 'Un toque por objetivo o hábito. Nada de formularios largos.' },
  { title: 'Se convierte en % y racha', text: 'El mismo cálculo, todos los días, sin excepciones ni números inventados.' },
  { title: 'Lo revisás en Informes', text: 'Patrones semanales y mensuales, y una revisión guiada de 4 pasos para cerrar el mes.' },
]

export function JourneySection() {
  return (
    <Narrative eyebrow="El recorrido" title="De elegir qué te importa, a ver cómo te fue." className="sc-journey">
      <ol className="sc-journey__path">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <span className="sc-journey__index numeric">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Narrative>
  )
}

const FEATURES = [
  {
    title: 'Agenda',
    text: 'Tareas y eventos anclados a un día, con vista de mes y de día. Lo que sí tiene fecha fija.',
  },
  {
    title: 'Rutinas',
    text: 'Rituales de pasos ordenados (mañana, noche, entrenamiento) con un modo enfoque para hacerlos uno por uno.',
  },
  {
    title: 'Enfoque',
    text: 'Temporizador Libre, Pomodoro (25/5/15) y Trabajo profundo (50 o 90 min). Podés vincular la sesión a una tarea pendiente.',
  },
  {
    title: 'Mapa anual de hábitos',
    text: 'Un heatmap tipo GitHub de las últimas 53 semanas de cada hábito, para ver el patrón de un año de un vistazo.',
  },
  {
    title: 'Informes y revisión mensual',
    text: 'Promedio del mes, mejor y peor categoría, racha máxima, días perfectos — y un cierre de mes guiado con preguntas de reflexión.',
  },
  {
    title: 'Sugerencias e insights con IA',
    text: 'Al crear un objetivo, la IA propone hábitos concretos para lograrlo. Bajo demanda, resume rachas y patrones. 3 usos gratis por mes, ilimitado en Premium.',
  },
]

export function SecondaryFeatures() {
  return (
    <Narrative
      eyebrow="Y también"
      title="Más funcionalidades reales, sin exagerar lo que hacen."
      className="sc-secondary"
    >
      <div className="sc-secondary__grid">
        {FEATURES.map((f) => (
          <div className="sc-secondary__card" key={f.title}>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </div>
    </Narrative>
  )
}
