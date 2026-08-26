import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseRepository } from './supabaseRepository'

// El módulo real llama a createClient() al importarse, lo que revienta sin
// VITE_SUPABASE_URL/ANON_KEY configurados (no hace falta .env en tests: el
// repositorio siempre recibe un client explícito, nunca el singleton real).
vi.mock('../lib/supabaseClient', () => ({ supabase: {} }))

type TableResult = { data: unknown; error: unknown }

/**
 * Fake mínimo de SupabaseClient: cada tabla resuelve a un resultado fijo sin
 * importar cuántos .select()/.order()/.maybeSingle() se encadenen, y .rpc()
 * queda registrado para poder verificar qué se llamó. No pega a la red.
 */
function createFakeClient(options: {
  tables?: Partial<Record<string, TableResult>>
  rpc?: Partial<Record<string, TableResult>>
}) {
  const rpcCalls: Array<{ name: string; args: unknown }> = []
  const insertCalls: Array<{ table: string; payload: unknown }> = []
  const defaultResult: TableResult = { data: [], error: null }

  const from = vi.fn((table: string) => {
    const result = options.tables?.[table] ?? defaultResult
    const builder: Record<string, unknown> = {
      select: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => Promise.resolve(result),
      insert: (payload: unknown) => {
        insertCalls.push({ table, payload })
        return Promise.resolve(options.tables?.[table] ?? { data: null, error: null })
      },
      then: (resolve: (value: TableResult) => void, reject?: (reason: unknown) => void) => {
        Promise.resolve(result).then(resolve, reject)
      },
    }
    return builder
  })

  const rpc = vi.fn((name: string, args?: unknown) => {
    rpcCalls.push({ name, args })
    return Promise.resolve(options.rpc?.[name] ?? { data: null, error: null })
  })

  const client = { from, rpc } as unknown as SupabaseClient
  return { client, rpcCalls, insertCalls }
}

describe('createSupabaseRepository', () => {
  it('load() devuelve null si no hay fila de settings (sin sesión válida todavía)', async () => {
    const { client } = createFakeClient({
      tables: { user_settings: { data: null, error: null } },
    })
    const repo = createSupabaseRepository(client)
    expect(await repo.load()).toBeNull()
  })

  it('load() devuelve null si hay settings pero cero categorías y objetivos (usuario recién registrado)', async () => {
    const { client } = createFakeClient({
      tables: {
        user_settings: {
          data: { app_name: 'Mi Progreso', streak_threshold: 70, allow_editing_past_days: false },
          error: null,
        },
        categories: { data: [], error: null },
        goals: { data: [], error: null },
      },
    })
    const repo = createSupabaseRepository(client)
    expect(await repo.load()).toBeNull()
  })

  it('load() arma el AppData completo a partir de las filas', async () => {
    const { client } = createFakeClient({
      tables: {
        user_settings: {
          data: { app_name: 'Progreso de Uli', streak_threshold: 80, allow_editing_past_days: true },
          error: null,
        },
        categories: { data: [{ id: 'salud', name: 'Salud', order_index: 0 }], error: null },
        goals: {
          data: [
            {
              id: 'salud-agua',
              category_id: 'salud',
              name: 'Tomar agua',
              weight: 5,
              active: true,
              period: 'daily',
              order_index: 0,
              created_at: '2026-01-01T00:00:00.000Z',
            },
          ],
          error: null,
        },
        day_records: {
          data: [
            {
              date: '2026-08-19',
              goals: [{ goalId: 'salud-agua', name: 'Tomar agua', categoryId: 'salud', categoryName: 'Salud', weight: 5, kind: 'boolean' }],
              goal_progress: { 'salud-agua': true },
              closed: false,
            },
          ],
          error: null,
        },
        period_records: {
          data: [
            {
              key: 'weekly:2026-08-17',
              period: 'weekly',
              period_start: '2026-08-17',
              goals: [],
              goal_progress: {},
              closed: false,
            },
          ],
          error: null,
        },
      },
    })

    const repo = createSupabaseRepository(client)
    const data = await repo.load()

    expect(data).not.toBeNull()
    expect(data!.settings).toEqual({
      appName: 'Progreso de Uli',
      streakThreshold: 80,
      allowEditingPastDays: true,
    })
    expect(data!.categories).toEqual([{ id: 'salud', name: 'Salud', order: 0 }])
    expect(data!.goals[0]).toMatchObject({ id: 'salud-agua', categoryId: 'salud', weight: 5 })
    expect(data!.days['2026-08-19'].goalProgress).toEqual({ 'salud-agua': true })
    expect(data!.periods['weekly:2026-08-17'].periodStart).toBe('2026-08-17')
  })

  it('load() propaga el error si alguna consulta falla', async () => {
    const { client } = createFakeClient({
      tables: { goals: { data: null, error: new Error('network down') } },
    })
    const repo = createSupabaseRepository(client)
    await expect(repo.load()).rejects.toThrow('network down')
  })

  it('save() llama a save_app_data con el AppData completo como payload', async () => {
    const { client, rpcCalls } = createFakeClient({})
    const repo = createSupabaseRepository(client)
    const payload = {
      version: 1,
      settings: { appName: 'X', streakThreshold: 70, allowEditingPastDays: false },
      categories: [],
      goals: [],
      days: {},
      periods: {},
      lifeGoals: [],
      plannerItems: [],
      routines: [],
      routineRuns: {},
      lifeWheelSnapshots: [],
      reflections: [],
      projects: [],
      projectTasks: [],
      notes: [],
    }

    await repo.save(payload)

    expect(rpcCalls).toEqual([{ name: 'save_app_data', args: { payload } }])
  })

  it('save() lanza si el RPC devuelve error', async () => {
    const { client } = createFakeClient({
      rpc: { save_app_data: { data: null, error: new Error('rejected by RLS') } },
    })
    const repo = createSupabaseRepository(client)
    await expect(
      repo.save({
        version: 1,
        settings: { appName: 'X', streakThreshold: 70, allowEditingPastDays: false },
        categories: [],
        goals: [],
        days: {},
        periods: {},
        lifeGoals: [],
        plannerItems: [],
        routines: [],
        routineRuns: {},
        lifeWheelSnapshots: [],
        reflections: [],
        projects: [],
        projectTasks: [],
        notes: [],
      }),
    ).rejects.toThrow('rejected by RLS')
  })

  it('clear() llama a clear_app_data', async () => {
    const { client, rpcCalls } = createFakeClient({})
    const repo = createSupabaseRepository(client)
    await repo.clear()
    expect(rpcCalls).toEqual([{ name: 'clear_app_data', args: undefined }])
  })

  it('loadFocusSessions() mapea las filas de focus_sessions', async () => {
    const { client } = createFakeClient({
      tables: {
        focus_sessions: {
          data: [
            {
              id: 'f1',
              started_at: '2026-08-21T10:00:00.000Z',
              completed_at: '2026-08-21T10:25:00.000Z',
              planned_minutes: 25,
              type: 'focus',
              status: 'completed',
              linked_planner_item_id: null,
            },
          ],
          error: null,
        },
      },
    })
    const repo = createSupabaseRepository(client)

    expect(await repo.loadFocusSessions()).toEqual([
      {
        id: 'f1',
        startedAt: '2026-08-21T10:00:00.000Z',
        completedAt: '2026-08-21T10:25:00.000Z',
        plannedMinutes: 25,
        type: 'focus',
        status: 'completed',
        linkedPlannerItemId: undefined,
      },
    ])
  })

  it('saveFocusSession() inserta una fila en focus_sessions en snake_case', async () => {
    const { client, insertCalls } = createFakeClient({})
    const repo = createSupabaseRepository(client)

    await repo.saveFocusSession({
      id: 'f1',
      startedAt: '2026-08-21T10:00:00.000Z',
      completedAt: '2026-08-21T10:25:00.000Z',
      plannedMinutes: 25,
      type: 'focus',
      status: 'completed',
      linkedPlannerItemId: 'task-1',
    })

    expect(insertCalls).toEqual([
      {
        table: 'focus_sessions',
        payload: {
          id: 'f1',
          started_at: '2026-08-21T10:00:00.000Z',
          completed_at: '2026-08-21T10:25:00.000Z',
          planned_minutes: 25,
          type: 'focus',
          status: 'completed',
          linked_planner_item_id: 'task-1',
        },
      },
    ])
  })

  it('saveFocusSession() lanza si el insert devuelve error', async () => {
    const { client } = createFakeClient({
      tables: { focus_sessions: { data: null, error: new Error('rejected by RLS') } },
    })
    const repo = createSupabaseRepository(client)

    await expect(
      repo.saveFocusSession({
        id: 'f1',
        startedAt: '2026-08-21T10:00:00.000Z',
        completedAt: '2026-08-21T10:25:00.000Z',
        plannedMinutes: 25,
        type: 'focus',
        status: 'completed',
      }),
    ).rejects.toThrow('rejected by RLS')
  })
})
