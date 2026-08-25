import { describe, expect, it } from 'vitest'
import {
  activeRoutineToday,
  agendaCompletionToday,
  greetingForHour,
  mainPriorityToday,
  nextEventToday,
  topActiveStreaks,
} from '../domain/dashboard'
import type { DayRecord, Goal, GoalSnapshot, PlannerItem, Routine, RoutineRun } from '../domain/types'

const today = '2026-08-21'

describe('greetingForHour', () => {
  it('saluda distinto según la hora', () => {
    expect(greetingForHour(3)).toBe('Buenas noches')
    expect(greetingForHour(8)).toBe('Buenos días')
    expect(greetingForHour(15)).toBe('Buenas tardes')
    expect(greetingForHour(22)).toBe('Buenas noches')
  })
})

describe('topActiveStreaks', () => {
  const leer: GoalSnapshot = {
    goalId: 'leer',
    name: 'Leer',
    categoryId: 'dev',
    categoryName: 'Desarrollo personal',
    weight: 1,
    kind: 'boolean',
  }
  const agua: GoalSnapshot = {
    goalId: 'agua',
    name: 'Tomar agua',
    categoryId: 'salud',
    categoryName: 'Salud',
    weight: 1,
    kind: 'boolean',
  }

  function day(date: string, completed: string[]): DayRecord {
    return {
      date,
      goals: [leer, agua],
      goalProgress: Object.fromEntries(completed.map((id) => [id, true])),
      closed: true,
    }
  }

  const days: Record<string, DayRecord> = {
    '2026-08-19': day('2026-08-19', ['leer', 'agua']),
    '2026-08-20': day('2026-08-20', ['leer']),
    '2026-08-21': day('2026-08-21', ['leer']),
  }

  function goal(id: string, name: string): Goal {
    return {
      id,
      name,
      categoryId: 'dev',
      weight: 1,
      active: true,
      period: 'daily',
      order: 0,
      createdAt: '2026-08-01T00:00:00.000Z',
      kind: 'boolean',
    }
  }

  it('sólo devuelve objetivos con racha en curso, más larga primero', () => {
    const result = topActiveStreaks([goal('leer', 'Leer'), goal('agua', 'Tomar agua')], days, today)
    expect(result).toEqual([{ id: 'leer', name: 'Leer', current: 3 }])
  })

  it('ignora objetivos inactivos', () => {
    const inactivo = { ...goal('leer', 'Leer'), active: false }
    const result = topActiveStreaks([inactivo], days, today)
    expect(result).toEqual([])
  })
})

describe('mainPriorityToday / nextEventToday', () => {
  function item(overrides: Partial<PlannerItem> & Pick<PlannerItem, 'id' | 'title'>): PlannerItem {
    return {
      date: today,
      type: 'task',
      category: 'personal',
      priority: 'medium',
      done: false,
      order: 0,
      createdAt: '2026-08-01T00:00:00.000Z',
      ...overrides,
    }
  }

  it('elige la tarea pendiente de mayor prioridad', () => {
    const baja = item({ id: 'b', title: 'Baja', priority: 'low', order: 0 })
    const alta = item({ id: 'a', title: 'Alta', priority: 'high', order: 1 })
    const result = mainPriorityToday([baja, alta], today)
    expect(result?.id).toBe('a')
  })

  it('ignora tareas ya completadas, de otro día, o eventos', () => {
    const hecha = item({ id: 'h', title: 'Hecha', priority: 'high', done: true })
    const otroDia = item({ id: 'o', title: 'Otro día', priority: 'high', date: '2026-08-20' })
    const evento = item({ id: 'e', title: 'Evento', priority: 'high', type: 'event' })
    expect(mainPriorityToday([hecha, otroDia, evento], today)).toBeNull()
  })

  it('devuelve el primer evento pendiente de hoy por orden', () => {
    const segundo = item({ id: 's', title: 'Segundo', type: 'event', order: 2 })
    const primero = item({ id: 'p', title: 'Primero', type: 'event', order: 1 })
    const result = nextEventToday([segundo, primero], today)
    expect(result?.id).toBe('p')
  })
})

describe('agendaCompletionToday', () => {
  function item(overrides: Partial<PlannerItem> & Pick<PlannerItem, 'id' | 'title'>): PlannerItem {
    return {
      date: today,
      type: 'task',
      category: 'personal',
      priority: 'medium',
      done: false,
      order: 0,
      createdAt: '2026-08-01T00:00:00.000Z',
      ...overrides,
    }
  }

  it('cuenta planificado/realizado sólo de hoy', () => {
    const items = [
      item({ id: 'a', title: 'A', done: true }),
      item({ id: 'b', title: 'B', done: false }),
      item({ id: 'c', title: 'C', done: true, date: '2026-08-20' }),
    ]
    expect(agendaCompletionToday(items, today)).toEqual({ planned: 2, done: 1, percent: 50 })
  })

  it('sin ítems hoy devuelve 0/0 sin dividir por cero', () => {
    expect(agendaCompletionToday([], today)).toEqual({ planned: 0, done: 0, percent: 0 })
  })
})

describe('activeRoutineToday', () => {
  function routine(overrides: Partial<Routine> & Pick<Routine, 'id' | 'name'>): Routine {
    return {
      category: 'custom',
      steps: [
        { id: 's1', text: 'Paso 1', order: 0 },
        { id: 's2', text: 'Paso 2', order: 1 },
      ],
      active: true,
      order: 0,
      createdAt: '2026-08-01T00:00:00.000Z',
      ...overrides,
    }
  }

  it('devuelve la primera rutina activa sin terminar hoy', () => {
    const matutina = routine({ id: 'am', name: 'Ritual matutino', order: 0 })
    const nocturna = routine({ id: 'pm', name: 'Ritual nocturno', order: 1 })
    const runs: Record<string, RoutineRun> = {}
    const result = activeRoutineToday([nocturna, matutina], runs, today)
    expect(result?.routine.id).toBe('am')
    expect(result).toMatchObject({ done: 0, total: 2, percent: 0 })
  })

  it('salta rutinas ya completadas del todo y las inactivas', () => {
    const completa = routine({ id: 'c', name: 'Completa', order: 0 })
    const inactiva = routine({ id: 'i', name: 'Inactiva', order: 1, active: false })
    const pendiente = routine({ id: 'p', name: 'Pendiente', order: 2 })
    const runs: Record<string, RoutineRun> = {
      [`c:${today}`]: { routineId: 'c', date: today, completedStepIds: ['s1', 's2'] },
    }
    const result = activeRoutineToday([completa, inactiva, pendiente], runs, today)
    expect(result?.routine.id).toBe('p')
  })

  it('devuelve null si no hay rutinas activas pendientes', () => {
    const runs: Record<string, RoutineRun> = {}
    expect(activeRoutineToday([], runs, today)).toBeNull()
  })
})
