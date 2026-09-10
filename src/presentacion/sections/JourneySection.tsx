import { SectionFrame } from '../SectionFrame'

const STEPS = [
  { title: 'Elegís tus áreas y objetivos', text: 'El onboarding arranca por áreas de vida, no por una pantalla en blanco. Cada objetivo lleva su categoría y su peso.' },
  { title: 'Los organizás', text: 'Agenda para lo que tiene día y hora, Proyectos para lo que no, Rutinas para lo que se repite, Metas para el largo plazo.' },
  { title: 'Los cumplís día a día', text: 'Un check, una cantidad o un tiempo por objetivo o hábito. Nada de formularios largos.' },
  { title: 'Se convierte en % y racha', text: 'Peso completado sobre peso total, todos los días. La racha son los días seguidos que llegaron al 70%.' },
  { title: 'Lo revisás en Historial e Informes', text: 'Constancia por objetivo, promedios y evolución, y una Revisión mensual guiada de 4 pasos para cerrar el mes.' },
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
