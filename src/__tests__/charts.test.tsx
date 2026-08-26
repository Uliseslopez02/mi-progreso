import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { HabitYearHeatmap } from '../components/HabitYearHeatmap'
import { LineChart } from '../components/LineChart'
import { MonthCalendar } from '../components/MonthCalendar'
import { ProgressRing } from '../components/ProgressRing'
import type { YearMapWeek } from '../domain/habitYearMap'
import type { DayRecord } from '../domain/types'

describe('ProgressRing', () => {
  it('traduce el porcentaje a la porción dibujada del círculo', () => {
    const { rerender } = render(<ProgressRing percent={0} size={100} strokeWidth={10} />)
    const circle = () => document.querySelector('.ring__value')!
    const circumference = 2 * Math.PI * 45

    expect(Number(circle().getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference, 3)

    rerender(<ProgressRing percent={50} size={100} strokeWidth={10} />)
    expect(Number(circle().getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference / 2, 3)

    rerender(<ProgressRing percent={100} size={100} strokeWidth={10} />)
    expect(Number(circle().getAttribute('stroke-dashoffset'))).toBeCloseTo(0, 3)
    expect(screen.getByTestId('ring-percent')).toHaveTextContent('100%')
  })

  it('cambia de color según la banda de progreso', () => {
    const { rerender } = render(<ProgressRing percent={20} />)
    expect(document.querySelector('.ring__value')).toHaveAttribute('stroke', 'var(--band-low)')

    rerender(<ProgressRing percent={73} />)
    expect(document.querySelector('.ring__value')).toHaveAttribute('stroke', 'var(--band-good)')

    rerender(<ProgressRing percent={95} />)
    expect(document.querySelector('.ring__value')).toHaveAttribute('stroke', 'var(--band-top)')
  })
})

describe('LineChart', () => {
  it('dibuja un punto por día en la posición que corresponde', () => {
    render(
      <LineChart
        points={[
          { date: '2026-08-16', percent: 0, hasRecord: true },
          { date: '2026-08-17', percent: 50, hasRecord: true },
          { date: '2026-08-18', percent: 100, hasRecord: true },
        ]}
      />,
    )

    // 0% abajo del todo, 50% al medio, 100% arriba.
    expect(document.querySelector('.chart__line')).toHaveAttribute(
      'd',
      'M 36.0 212.0 L 371.0 114.0 L 706.0 16.0',
    )
  })

  it('avisa cuando no hay días para graficar', () => {
    render(<LineChart points={[]} />)
    expect(screen.getByText('Todavía no hay días registrados.')).toBeInTheDocument()
  })
})

describe('MonthCalendar', () => {
  const day = (date: string, completed: number): DayRecord => ({
    date,
    goals: Array.from({ length: 10 }, (_, i) => ({
      goalId: `g${i}`,
      name: `Objetivo ${i}`,
      categoryId: 'c',
      categoryName: 'C',
      weight: 1,
      kind: 'boolean' as const,
    })),
    goalProgress: Object.fromEntries(
      Array.from({ length: completed }, (_, i) => [`g${i}`, true]),
    ),
    closed: true,
  })

  const days = { '2026-08-05': day('2026-08-05', 9), '2026-08-06': day('2026-08-06', 3) }

  it('muestra el porcentaje de cada día y bloquea el futuro', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()

    render(
      <MonthCalendar
        monthKey="2026-08-01"
        days={days}
        today="2026-08-18"
        selected="2026-08-18"
        onSelect={onSelect}
        onMonthChange={() => {}}
      />,
    )

    expect(screen.getByText('Agosto 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5 — 90%' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '6 — 30%' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '7 — sin registro' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '19 — sin registro' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '5 — 90%' }))
    expect(onSelect).toHaveBeenCalledWith('2026-08-05')
  })
})

describe('HabitYearHeatmap', () => {
  const weeks: YearMapWeek[] = [
    {
      mondayKey: '2026-08-10',
      cells: [
        { date: '2026-08-10', status: 'done' },
        { date: '2026-08-11', status: 'missed' },
        { date: '2026-08-12', status: 'no-record' },
        { date: '2026-08-13', status: 'done' },
        { date: '2026-08-14', status: 'missed' },
        { date: '2026-08-15', status: 'no-record' },
        { date: '2026-08-16', status: 'done' },
      ],
    },
    {
      mondayKey: '2026-08-17',
      cells: [
        { date: '2026-08-17', status: 'no-record' },
        { date: '2026-08-18', status: 'no-record' },
        { date: '2026-08-19', status: 'no-record' },
        { date: '2026-08-20', status: 'future' },
        { date: '2026-08-21', status: 'future' },
        { date: '2026-08-22', status: 'future' },
        { date: '2026-08-23', status: 'future' },
      ],
    },
  ]

  it('renderiza una celda por día y las colorea según su estado', () => {
    const { container } = render(<HabitYearHeatmap weeks={weeks} />)

    const cells = container.querySelectorAll('.year-heatmap__cell')
    expect(cells).toHaveLength(14)

    const doneCell = screen.getByTitle('10/08 — cumplido')
    expect(doneCell).toHaveStyle({ background: 'var(--band-top)' })

    const noRecordCell = screen.getByTitle('12/08 — sin registro')
    expect(noRecordCell).toHaveStyle({ background: 'var(--band-none)' })
  })

  it('marca las celdas futuras sin color de banda', () => {
    render(<HabitYearHeatmap weeks={weeks} />)

    const futureCell = screen.getByTitle('20/08 — todavía no llegó')
    expect(futureCell).toHaveClass('year-heatmap__cell--future')
    expect(futureCell).not.toHaveAttribute('style')
  })
})
