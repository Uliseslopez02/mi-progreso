import { SectionFrame } from '../SectionFrame'

const FEATURES = [
  {
    title: 'Agenda',
    text: 'Vista de Día (timeline de 06 a 23 h, arrastrás los bloques para mover la hora o el borde para la duración), vista de Mes con un punto por día, y el Planificador semanal para repartir tareas entre los 7 días. Una tarea puede vincularse a un hábito y marcarlo por vos.',
  },
  {
    title: 'Metas',
    text: 'Objetivos de largo plazo (Correr 10 km, cambiar de trabajo…) con subobjetivos, ámbito personal/profesional y prioridad. El progreso se calcula solo desde los hábitos que vinculás, o lo llevás a mano.',
  },
  {
    title: 'Rutinas',
    text: 'Secuencias de pasos (ritual de la mañana, entrenamiento, cierre del día) que se completan paso a paso, con un modo enfoque para hacerlas una por una sin distracción.',
  },
  {
    title: 'Calendario',
    text: 'El mes entero coloreado por el % de cada día, con la misma escala de bandas del anillo. Tocás un día y ves qué cumpliste y qué no.',
  },
  {
    title: 'Mapa anual de hábitos',
    text: 'Un heatmap tipo GitHub de las últimas 53 semanas de un hábito, para ver el patrón de todo el año de un vistazo.',
  },
  {
    title: 'Enfoque',
    text: 'Temporizador Libre (5–60 min), Pomodoro (25 / 5 / descanso largo cada 4) y Trabajo profundo (50 o 90 min). Podés atarlo a una tarea pendiente de la agenda.',
  },
  {
    title: 'Notas',
    text: 'Notas libres con título y fecha, para lo que no encaja en un objetivo ni en una tarea.',
  },
  {
    title: 'Sugerencias e insights con IA',
    text: 'Al crear una meta, la IA propone hábitos concretos para lograrla. Bajo demanda, también resume rachas y patrones por día de la semana. 3 usos gratis por mes calendario, ilimitado en Premium.',
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
