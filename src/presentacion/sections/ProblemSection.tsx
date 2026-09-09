import { SectionFrame } from '../SectionFrame'

const ITEMS = [
  {
    title: 'Una agenda te dice qué hacer hoy',
    text: 'Pero no te dice si venís cumpliendo, ni qué tan constante fuiste el mes pasado.',
  },
  {
    title: 'Un Excel guarda números',
    text: 'Pero nadie los pesa, ni los conecta con lo que realmente importa en tu semana.',
  },
  {
    title: 'Una lista de tareas se tacha y se olvida',
    text: 'Cumplir una tarea suelta no te muestra el patrón detrás de tus días.',
  },
]

export function ProblemSection() {
  return (
    <SectionFrame
      eyebrow="El problema"
      title="Hacés cosas todos los días. ¿Pero sabés si estás progresando?"
      subtitle="La mayoría de las herramientas registran tareas sueltas. Ninguna te devuelve un número que resuma tu constancia real."
      className="pr-problem"
    >
      <div className="pr-problem__grid">
        {ITEMS.map((item) => (
          <div className="pr-problem__card" key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
    </SectionFrame>
  )
}
