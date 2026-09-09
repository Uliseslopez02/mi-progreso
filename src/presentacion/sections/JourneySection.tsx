import { SectionFrame } from '../SectionFrame'

const STEPS = [
  { title: 'Elegís tus áreas y objetivos', text: 'El onboarding arranca por áreas de vida, no por una pantalla en blanco.' },
  { title: 'Los organizás en tu semana', text: 'Agenda, Proyectos y Rutinas — cada uno para un tipo distinto de trabajo.' },
  { title: 'Los cumplís día a día', text: 'Un toque por objetivo o hábito. Nada de formularios largos.' },
  { title: 'Se convierte en % y racha', text: 'El mismo cálculo, todos los días, sin excepciones ni números inventados.' },
  { title: 'Lo revisás en Informes', text: 'Patrones semanales y mensuales, y una revisión guiada para cerrar el mes.' },
]

export function JourneySection() {
  return (
    <SectionFrame
      eyebrow="El recorrido"
      title="De elegir qué te importa, a ver cómo te fue."
      className="pr-journey"
    >
      <ol className="pr-journey__path">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <span className="pr-journey__index numeric">{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </SectionFrame>
  )
}
