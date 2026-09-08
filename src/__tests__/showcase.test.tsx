import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ProductShowcasePage } from '../showcase/ProductShowcasePage'
import { ShowcaseProvider, useShowcase } from '../showcase/ShowcaseState'
import { computeDayStats } from '../domain/scoring'
import { TODAY } from '../showcase/demoData'

function Probe() {
  const { days, toggleGoal, projectTasks, moveTask } = useShowcase()
  const done = computeDayStats(days[TODAY]).completedCount
  const tasksDone = projectTasks.filter((t) => t.status === 'done').length
  return (
    <div>
      <output data-testid="done">{done}</output>
      <output data-testid="tasksDone">{tasksDone}</output>
      <button onClick={() => toggleGoal('goal-work', true)}>marcar objetivo</button>
      <button onClick={() => moveTask('sc-pt-3', 'done')}>mover tarea</button>
    </div>
  )
}

describe('ProductShowcasePage', () => {
  it('renderiza la narrativa comercial y el bento interactivo', () => {
    render(<ProductShowcasePage />)
    expect(
      screen.getByRole('heading', { name: /Un sistema para construir la vida que querés/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Hacés cosas todos los días/i)).toBeInTheDocument()
    expect(screen.getByText(/Para lo que no es diario/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /De elegir qué te importa/i })).toBeInTheDocument()
    expect(document.title).toMatch(/Mi Progreso/)
  })
})

describe('ShowcaseProvider — reinicio al salir de la web', () => {
  it('vuelve al estado predeterminado cuando la pestaña se oculta', async () => {
    render(
      <ShowcaseProvider>
        <Probe />
      </ShowcaseProvider>,
    )
    const done = screen.getByTestId('done')
    const before = done.textContent

    await userEvent.click(screen.getByRole('button', { name: 'marcar objetivo' }))
    expect(done.textContent).not.toBe(before)

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    fireEvent(document, new Event('visibilitychange'))

    expect(done.textContent).toBe(before)
  })

  it('vuelve al estado predeterminado al volver desde el bfcache (pageshow persisted)', async () => {
    render(
      <ShowcaseProvider>
        <Probe />
      </ShowcaseProvider>,
    )
    const tasksDone = screen.getByTestId('tasksDone')
    const before = tasksDone.textContent

    await userEvent.click(screen.getByRole('button', { name: 'mover tarea' }))
    expect(tasksDone.textContent).not.toBe(before)

    const evt = new Event('pageshow') as PageTransitionEvent
    Object.defineProperty(evt, 'persisted', { value: true })
    fireEvent(window, evt)

    expect(tasksDone.textContent).toBe(before)
  })
})
