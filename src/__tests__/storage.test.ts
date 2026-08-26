import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialData } from '../domain/defaults'
import { createLocalStorageRepository, migrate, STORAGE_KEY } from '../storage/localStorageRepository'
import { createMemoryRepository } from '../storage/memoryRepository'

describe('localStorageRepository', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('guarda y recupera los datos completos', async () => {
    const repo = createLocalStorageRepository()
    const data = createInitialData('2026-08-18T10:00:00.000Z')
    data.days['2026-08-18'] = {
      date: '2026-08-18',
      goals: [{ goalId: 'g1', name: 'Leer', categoryId: 'c', categoryName: 'C', weight: 1, kind: 'boolean' }],
      goalProgress: { g1: true },
      closed: false,
    }
    data.periods['weekly:2026-08-17'] = {
      key: 'weekly:2026-08-17',
      period: 'weekly',
      periodStart: '2026-08-17',
      goals: [{ goalId: 'g2', name: 'Planificar', categoryId: 'c', categoryName: 'C', weight: 1, kind: 'boolean' }],
      goalProgress: { g2: true },
      closed: false,
    }

    await repo.save(data)
    const loaded = await repo.load()

    expect(loaded?.goals).toHaveLength(11)
    expect(loaded?.days['2026-08-18'].goalProgress).toEqual({ g1: true })
    expect(loaded?.settings.streakThreshold).toBe(70)
    expect(loaded?.periods['weekly:2026-08-17'].goalProgress).toEqual({ g2: true })
  })

  it('devuelve null si todavía no hay nada guardado', async () => {
    expect(await createLocalStorageRepository().load()).toBeNull()
  })

  it('no explota con datos corruptos', async () => {
    window.localStorage.setItem(STORAGE_KEY, '{esto no es json')
    expect(await createLocalStorageRepository().load()).toBeNull()
  })

  it('borra los datos', async () => {
    const repo = createLocalStorageRepository()
    await repo.save(createInitialData('2026-08-18T10:00:00.000Z'))
    await repo.clear()
    expect(await repo.load()).toBeNull()
  })
})

describe('localStorageRepository — historial de enfoque', () => {
  it('devuelve una lista vacía si todavía no hay sesiones', async () => {
    expect(await createLocalStorageRepository().loadFocusSessions()).toEqual([])
  })

  it('guarda y recupera sesiones, más reciente primero', async () => {
    const repo = createLocalStorageRepository()
    await repo.saveFocusSession({
      id: 'f1',
      startedAt: '2026-08-21T10:00:00.000Z',
      completedAt: '2026-08-21T10:25:00.000Z',
      plannedMinutes: 25,
      type: 'focus',
      status: 'completed',
    })
    await repo.saveFocusSession({
      id: 'f2',
      startedAt: '2026-08-21T11:00:00.000Z',
      completedAt: '2026-08-21T11:05:00.000Z',
      plannedMinutes: 5,
      type: 'break',
      status: 'stopped',
    })

    const loaded = await repo.loadFocusSessions()
    expect(loaded.map((s) => s.id)).toEqual(['f2', 'f1'])
  })

  it('clear() también borra el historial de enfoque, no sólo el blob principal', async () => {
    const repo = createLocalStorageRepository()
    await repo.saveFocusSession({
      id: 'f1',
      startedAt: '2026-08-21T10:00:00.000Z',
      completedAt: '2026-08-21T10:25:00.000Z',
      plannedMinutes: 25,
      type: 'focus',
      status: 'completed',
    })
    await repo.clear()
    expect(await repo.loadFocusSessions()).toEqual([])
  })
})

describe('migrate', () => {
  it('completa los campos que falten con valores válidos', () => {
    const migrated = migrate({
      categories: [{ id: 'salud', name: 'Salud' }],
      goals: [{ id: 'g1', name: 'Leer', categoryId: 'salud' }],
    })

    expect(migrated?.goals[0].weight).toBe(1)
    expect(migrated?.goals[0].active).toBe(true)
    expect(migrated?.goals[0].period).toBe('daily')
    expect(migrated?.categories[0].order).toBe(0)
    expect(migrated?.settings.appName).toBe('Mi Progreso')
    expect(migrated?.days).toEqual({})
    expect(migrated?.periods).toEqual({})
    expect(migrated?.projects).toEqual([])
    expect(migrated?.projectTasks).toEqual([])
  })

  it('descarta lo que no tiene forma de datos', () => {
    expect(migrate(null)).toBeNull()
    expect(migrate({ goals: 'nope' })).toBeNull()
  })

  it('normaliza los períodos semanales/mensuales y descarta los que no tienen arranque', () => {
    const migrated = migrate({
      categories: [{ id: 'salud', name: 'Salud' }],
      goals: [{ id: 'g1', name: 'Leer', categoryId: 'salud' }],
      periods: {
        'weekly:2026-08-17': {
          period: 'weekly',
          periodStart: '2026-08-17',
          goals: [{ goalId: 'g2', name: 'Planificar', categoryId: 'salud' }],
          completedGoalIds: ['g2'],
        },
        roto: { period: 'monthly', goals: [] },
        vacio: null,
      },
    })

    expect(Object.keys(migrated?.periods ?? {})).toEqual(['weekly:2026-08-17'])
    const record = migrated?.periods['weekly:2026-08-17']
    expect(record?.goalProgress).toEqual({ g2: true })
    expect(record?.goals[0].weight).toBe(1)
    expect(record?.closed).toBe(false)
  })
})

describe('migración de los objetivos de muestra a los reales', () => {
  const OLD_SAMPLE_IDS = [
    'salud-actividad',
    'salud-agua',
    'salud-comida',
    'salud-sueno',
    'dev-leer',
    'dev-estudiar',
    'dev-celular',
    'prod-principal',
    'prod-proyecto',
    'prod-orden',
    'fin-gastos',
  ]

  function pristineSample(overrides: (goals: Record<string, unknown>[]) => void = () => {}) {
    const categories = [
      { id: 'salud', name: 'Salud' },
      { id: 'desarrollo', name: 'Desarrollo personal' },
      { id: 'productividad', name: 'Productividad' },
      { id: 'finanzas', name: 'Finanzas' },
    ]
    const goals = OLD_SAMPLE_IDS.map((id, i) => ({
      id,
      name: id,
      categoryId: 'salud',
      weight: 1,
      active: true,
      period: 'daily',
      order: i,
    }))
    overrides(goals)
    return { categories, goals }
  }

  it('un instalación nunca tocada migra en silencio a los objetivos reales', () => {
    const migrated = migrate(pristineSample())

    expect(migrated?.goals).toHaveLength(11)
    expect(migrated?.goals.map((g) => g.id)).not.toEqual(expect.arrayContaining(['salud-agua']))
    expect(migrated?.goals.map((g) => g.id)).toEqual(
      expect.arrayContaining(['salud-hielo-manana', 'prod-claude']),
    )
  })

  it('no toca nada si algún objetivo fue completado alguna vez', () => {
    const raw = {
      ...pristineSample(),
      days: {
        '2026-08-18': { goals: [], completedGoalIds: ['salud-agua'], closed: false },
      },
    }
    const migrated = migrate(raw)
    expect(migrated?.goals.map((g) => g.id)).toContain('salud-agua')
  })

  it('migra igual aunque exista el día de "hoy" vacío (lo crea la app sola al cargar)', () => {
    const raw = {
      ...pristineSample(),
      days: {
        '2026-08-19': { goals: [], completedGoalIds: [], closed: false },
      },
    }
    const migrated = migrate(raw)
    expect(migrated?.goals.map((g) => g.id)).not.toContain('salud-agua')
    expect(migrated?.goals.map((g) => g.id)).toContain('prod-claude')
  })

  it('no toca nada si algún peso fue modificado', () => {
    const raw = pristineSample((goals) => {
      ;(goals[0] as { weight: number }).weight = 2
    })
    const migrated = migrate(raw)
    expect(migrated?.goals.map((g) => g.id)).toContain('salud-agua')
  })

  it('no toca nada si algún objetivo fue desactivado', () => {
    const raw = pristineSample((goals) => {
      ;(goals[0] as { active: boolean }).active = false
    })
    const migrated = migrate(raw)
    expect(migrated?.goals.map((g) => g.id)).toContain('salud-agua')
  })

  it('no toca nada si falta o sobra algún objetivo de la muestra original', () => {
    const raw = pristineSample((goals) => {
      goals.pop()
    })
    const migrated = migrate(raw)
    expect(migrated?.goals).toHaveLength(10)
  })
})

describe('memoryRepository', () => {
  it('sirve como reemplazo directo del repositorio real', async () => {
    const repo = createMemoryRepository()
    expect(await repo.load()).toBeNull()
    await repo.save(createInitialData('2026-08-18T10:00:00.000Z'))
    expect((await repo.load())?.goals).toHaveLength(11)
  })
})
