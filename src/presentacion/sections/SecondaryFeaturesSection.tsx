import { SectionFrame } from '../SectionFrame'

const FEATURES = [
  {
    title: 'Revisión mensual',
    text: 'Un wizard guiado de 4 pasos sobre los mismos números de Informes, con preguntas de reflexión para cerrar el mes con más que un número.',
  },
  {
    title: 'Sugerencias e insights con IA',
    text: 'Al crear una meta, la IA propone hábitos concretos para lograrla. Bajo demanda, también resume rachas y patrones por día de la semana. 3 usos gratis por mes calendario, ilimitado en Premium.',
  },
]

export function SecondaryFeaturesSection() {
  return (
    <SectionFrame
      eyebrow="Y también"
      title="El resto de Mi Progreso, sin exagerar lo que hace."
      subtitle="Todo esto ya existe en la app. Acá sólo lo contamos; las secciones de arriba son la recreación real."
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
