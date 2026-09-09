import { SectionFrame } from '../SectionFrame'

const STEPS = [
  { n: '1', title: 'Definís tus objetivos', text: 'Cada uno con su categoría y su peso — algunos importan más que otros, y el cálculo lo respeta.' },
  { n: '2', title: 'Los cumplís día a día', text: 'Un check, una cantidad, un tiempo. Nada más que registrar lo que ya hacés.' },
  { n: '3', title: 'Se convierte en un progreso real', text: 'Peso completado sobre peso total. Siempre exacto, siempre sobre los objetivos reales del día.' },
]

export function SolutionSection() {
  return (
    <SectionFrame
      eyebrow="La solución"
      title="Mi Progreso conecta lo que hacés con lo que estás construyendo."
      subtitle="No es otra lista. Es un sistema: tus objetivos tienen peso, tu cumplimiento se pesa, y el resultado es un porcentaje que representa tu día de verdad."
      className="pr-solution"
    >
      <ol className="pr-solution__steps">
        {STEPS.map((step) => (
          <li key={step.n}>
            <span className="pr-solution__n">{step.n}</span>
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
