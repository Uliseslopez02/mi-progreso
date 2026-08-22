import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DayDetail } from '../components/DayDetail'
import type { DayRecord } from '../domain/types'

const record: DayRecord = {
  date: '2026-08-17',
  goals: [
    { goalId: 'a', name: 'Leer', categoryId: 'dev', categoryName: 'Desarrollo personal', weight: 1, kind: 'boolean' },
    { goalId: 'b', name: 'Entrenar', categoryId: 'salud', categoryName: 'Salud', weight: 1, kind: 'boolean' },
    { goalId: 'c', name: 'Registrar gastos', categoryId: 'fin', categoryName: 'Finanzas', weight: 1, kind: 'boolean' },
  ],
  goalProgress: { a: true, b: true },
  closed: true,
}

describe('DayDetail', () => {
  it('muestra completados, pendientes, porcentaje y nota de un día cerrado', () => {
    render(<DayDetail date="2026-08-17" record={record} editable={false} onToggle={() => {}} />)

    expect(screen.getByText('Lunes 17 de agosto')).toBeInTheDocument()
    expect(screen.getByText('67%')).toBeInTheDocument()
    expect(screen.getByText('Nota 6,7 / 10')).toBeInTheDocument()
    expect(screen.getByText('2 de 3 objetivos · Buen esfuerzo')).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('sólo permite marcar cuando el día es editable', async () => {
    const onToggle = vi.fn()
    const user = userEvent.setup()
    render(<DayDetail date="2026-08-17" record={record} editable onToggle={onToggle} />)

    await user.click(screen.getByRole('checkbox', { name: 'Registrar gastos' }))
    expect(onToggle).toHaveBeenCalledWith('c')
  })

  it('avisa cuando el día no tiene registro', () => {
    render(<DayDetail date="2026-08-10" record={undefined} editable={false} onToggle={() => {}} />)
    expect(screen.getByText('Ese día no quedó registrado.')).toBeInTheDocument()
  })
})
