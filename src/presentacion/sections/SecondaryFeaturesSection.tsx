import { SectionFrame } from '../SectionFrame'

const FEATURES = [
  {
    title: 'Enfoque',
    text: 'Temporizador Libre, Pomodoro (25/5/15) y Trabajo profundo (50 o 90 min). Podés vincular la sesión a una tarea pendiente de tu agenda.',
  },
  {
    title: 'Notas',
    text: 'Notas libres con título y fecha, para lo que no encaja en un objetivo ni en una tarea.',
  },
  {
    title: 'Mapa anual de hábitos',
    text: 'Un heatmap tipo GitHub de las últimas 53 semanas de cada hábito, para ver el patrón de un año de un vistazo.',
  },
  {
    title: 'Sugerencias e insights con IA',
    text: 'Al crear un objetivo, IA propone hábitos concretos para lograrlo. Bajo demanda, también resume rachas y patrones. 3 usos gratis por mes, ilimitado en Premium.',
  },
  {
    title: 'Momento Mori',
    text: 'Una vista opcional de tu tiempo vivido, con una reflexión diaria corta — para quien quiera ese recordatorio.',
  },
]

export function SecondaryFeaturesSection() {
  return (
    <SectionFrame
      eyebrow="Y también"
      title="Más funcionalidades reales, sin exagerar lo que hacen."
      className="pr-secondary"
    >
      <div className="pr-secondary__grid">
        {FEATURES.map((f) => (
          <div className="pr-card pr-secondary__card" key={f.title}>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </div>
        ))}
      </div>
    </SectionFrame>
  )
}
