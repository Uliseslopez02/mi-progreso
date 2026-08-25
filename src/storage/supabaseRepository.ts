import type { SupabaseClient } from '@supabase/supabase-js'
import { SCHEMA_VERSION } from '../domain/types'
import type {
  AppData,
  Category,
  DayRecord,
  FocusSession,
  Goal,
  GoalPeriod,
  LifeGoal,
  LifeWheelSnapshot,
  PeriodRecord,
  PlannerItem,
  RecurringPeriod,
  Reflection,
  Routine,
  RoutineRun,
  UserPlan,
} from '../domain/types'
import { supabase } from '../lib/supabaseClient'
import type { ProgressRepository } from './repository'

/**
 * Persistencia contra Supabase. El aislamiento entre usuarios lo hace RLS
 * en la base — este archivo nunca filtra por userId a mano, ni lo necesita:
 * el cliente adjunta la sesión y Postgres hace el resto.
 */
export function createSupabaseRepository(client: SupabaseClient = supabase): ProgressRepository {
  return {
    async load() {
      const [
        settingsRes,
        categoriesRes,
        goalsRes,
        daysRes,
        periodsRes,
        lifeGoalsRes,
        plannerItemsRes,
        routinesRes,
        routineRunsRes,
        lifeWheelSnapshotsRes,
        reflectionsRes,
      ] = await Promise.all([
        client.from('user_settings').select('*').maybeSingle(),
        client.from('categories').select('*').order('order_index'),
        client.from('goals').select('*').order('order_index'),
        client.from('day_records').select('*'),
        client.from('period_records').select('*'),
        client.from('life_goals').select('*').order('order_index'),
        client.from('planner_items').select('*').order('order_index'),
        client.from('routines').select('*').order('order_index'),
        client.from('routine_runs').select('*'),
        client.from('life_wheel_snapshots').select('*').order('date'),
        client.from('reflections').select('*').order('date'),
      ])

      for (const res of [
        settingsRes,
        categoriesRes,
        goalsRes,
        daysRes,
        periodsRes,
        lifeGoalsRes,
        plannerItemsRes,
        routinesRes,
        routineRunsRes,
        lifeWheelSnapshotsRes,
        reflectionsRes,
      ]) {
        if (res.error) throw res.error
      }

      const categories: Category[] = (categoriesRes.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        order: row.order_index,
      }))

      const goals: Goal[] = (goalsRes.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        categoryId: row.category_id,
        weight: row.weight,
        active: row.active,
        period: row.period as GoalPeriod,
        order: row.order_index,
        createdAt: row.created_at,
        kind: (row.kind ?? 'boolean') as any,
        targetValue: row.target_value,
        unit: row.unit,
        daysOfWeek: row.days_of_week ?? undefined,
        trackingKind: (row.tracking_kind ?? 'goal') as any,
        frequency: row.frequency ?? undefined,
      }))

      // Recién registrado: hay fila de settings (la crea el trigger) pero
      // nada más. Devolver null para que AppProvider caiga en
      // createInitialData() y la persona vea los objetivos de ejemplo,
      // igual que hoy con un localStorage vacío.
      if (!settingsRes.data || (categories.length === 0 && goals.length === 0)) return null

      const days: AppData['days'] = {}
      for (const row of daysRes.data ?? []) {
        const record: DayRecord = {
          date: row.date,
          goals: row.goals ?? [],
          goalProgress: row.goal_progress ?? {},
          closed: row.closed,
        }
        days[record.date] = record
      }

      const periods: AppData['periods'] = {}
      for (const row of periodsRes.data ?? []) {
        const record: PeriodRecord = {
          key: row.key,
          period: row.period as RecurringPeriod,
          periodStart: row.period_start,
          goals: row.goals ?? [],
          goalProgress: row.goal_progress ?? {},
          closed: row.closed,
        }
        periods[record.key] = record
      }

      const lifeGoals: LifeGoal[] = (lifeGoalsRes.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
        categoryId: row.category_id ?? undefined,
        scope: row.scope,
        priority: row.priority,
        targetDate: row.target_date ?? undefined,
        progress: row.progress,
        status: row.status,
        subGoals: row.sub_goals ?? [],
        linkedHabitIds: row.linked_habit_ids ?? [],
        order: row.order_index,
        createdAt: row.created_at,
      }))

      const plannerItems: PlannerItem[] = (plannerItemsRes.data ?? []).map((row) => ({
        id: row.id,
        date: row.date,
        title: row.title,
        type: row.type,
        category: row.category,
        priority: row.priority,
        done: row.done,
        order: row.order_index,
        createdAt: row.created_at,
        startTime: row.start_time ?? undefined,
        durationMinutes: row.duration_minutes ?? undefined,
        linkedHabitId: row.linked_habit_id ?? undefined,
        habitCompletionMode: row.habit_completion_mode ?? undefined,
      }))

      const routines: Routine[] = (routinesRes.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        steps: row.steps ?? [],
        active: row.active,
        order: row.order_index,
        createdAt: row.created_at,
      }))

      const routineRuns: AppData['routineRuns'] = {}
      for (const row of routineRunsRes.data ?? []) {
        const run: RoutineRun = {
          routineId: row.routine_id,
          date: row.date,
          completedStepIds: row.completed_step_ids ?? [],
        }
        routineRuns[`${run.routineId}:${run.date}`] = run
      }

      const lifeWheelSnapshots: LifeWheelSnapshot[] = (lifeWheelSnapshotsRes.data ?? []).map((row) => ({
        id: row.id,
        date: row.date,
        areas: row.areas ?? [],
        notes: row.notes ?? undefined,
        createdAt: row.created_at,
      }))

      const reflections: Reflection[] = (reflectionsRes.data ?? []).map((row) => ({
        id: row.id,
        date: row.date,
        prompt: row.prompt,
        answer: row.answer,
        createdAt: row.created_at,
      }))

      return {
        version: SCHEMA_VERSION,
        settings: {
          appName: settingsRes.data.app_name,
          streakThreshold: settingsRes.data.streak_threshold,
          allowEditingPastDays: settingsRes.data.allow_editing_past_days,
          birthDate: settingsRes.data.birth_date ?? undefined,
          lifeExpectancyYears: settingsRes.data.life_expectancy_years ?? undefined,
        },
        categories,
        goals,
        days,
        periods,
        lifeGoals,
        plannerItems,
        routines,
        routineRuns,
        lifeWheelSnapshots,
        reflections,
      }
    },

    async save(data: AppData) {
      const { error } = await client.rpc('save_app_data', { payload: data })
      if (error) throw error
    },

    async clear() {
      const { error } = await client.rpc('clear_app_data')
      if (error) throw error
    },

    // Excepción al patrón load/save de un solo blob: ver la nota en
    // ProgressRepository. Escritura directa a la tabla (no vía RPC) porque
    // cada sesión es un insert independiente, no un upsert+delete-diff de
    // todo un historial.
    async loadFocusSessions() {
      const { data, error } = await client
        .from('focus_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return (data ?? []).map(
        (row): FocusSession => ({
          id: row.id,
          startedAt: row.started_at,
          completedAt: row.completed_at,
          plannedMinutes: row.planned_minutes,
          type: row.type,
          status: row.status,
          linkedPlannerItemId: row.linked_planner_item_id ?? undefined,
        }),
      )
    },

    async saveFocusSession(session: FocusSession) {
      const { error } = await client.from('focus_sessions').insert({
        id: session.id,
        started_at: session.startedAt,
        completed_at: session.completedAt,
        planned_minutes: session.plannedMinutes,
        type: session.type,
        status: session.status,
        linked_planner_item_id: session.linkedPlannerItemId ?? null,
      })
      if (error) throw error
    },

    async getUserPlan() {
      const { data, error } = await client.from('profiles').select('plan').single()
      if (error) throw error
      return (data?.plan as UserPlan | undefined) ?? 'free'
    },
  }
}
