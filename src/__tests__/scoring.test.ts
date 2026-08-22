import { describe, expect, it } from 'vitest'
import {
  aggregate,
  bandForPercent,
  computeDayStats,
  computeStreak,
  formatGrade,
  historySeries,
  messageForPercent,
  weekSummary,
} from '../domain/scoring'
import type { DayRecord, GoalSnapshot } from '../domain/types'

function snapshot(count: number, weight = 1): GoalSnapshot[] {
  return Array.from({ length: count }, (_, i) => ({
    goalId: `g${i + 1}`,
    name: `Objetivo ${i + 1}`,
    categoryId: 'cat',
    categoryName: 'Categoría',
    weight,
    kind: 'boolean',
  }))
}

function day(date: string, total: number, completed: number): DayRecord {
  return {
    date,
    goals: snapshot(total),
    goalProgress: Object.fromEntries(
      snapshot(total)
        .slice(0, completed)
        .map((g) => [g.goalId, true]),
    ),
    closed: true,
  }
}

describe('computeDayStats', () => {
  it('calcula el porcentaje a partir de los objetivos reales', () => {
    const stats = computeDayStats(day('2026-08-18', 10, 7))
    expect(stats.percent).toBe(70)
    expect(stats.grade).toBe(7)
    expect(stats.completedCount).toBe(7)
    expect(stats.totalCount).toBe(10)
  })

  it('devuelve ceros cuando el día no tiene objetivos', () => {
    expect(computeDayStats(undefined).percent).toBe(0)
    expect(computeDayStats({ goals: [], goalProgress: {} }).percent).toBe(0)
  })

  it('pondera por peso: un objetivo de peso 2 vale el doble', () => {
    const record: DayRecord = {
      date: '2026-08-18',
      goals: [
        { goalId: 'a', name: 'Principal', categoryId: 'c', categoryName: 'C', weight: 2, kind: 'boolean' },
        { goalId: 'b', name: 'Leer', categoryId: 'c', categoryName: 'C', weight: 1, kind: 'boolean' },
        { goalId: 'c', name: 'Agua', categoryId: 'c', categoryName: 'C', weight: 1, kind: 'boolean' },
      ],
      goalProgress: { a: true },
      closed: false,
    }
    // 2 de 4 puntos de peso = 50%, aunque sea 1 de 3 objetivos.
    expect(computeDayStats(record).percent).toBe(50)
    expect(computeDayStats(record).completedCount).toBe(1)
  })

  it('la nota siempre es el porcentaje mostrado dividido 10', () => {
    const record = day('2026-08-18', 8, 5) // 62,5% -> 63%
    const stats = computeDayStats(record)
    expect(stats.percent).toBe(63)
    expect(stats.grade).toBe(6.3)
  })

  it('un día completo da 100% y nota 10', () => {
    const stats = computeDayStats(day('2026-08-18', 11, 11))
    expect(stats.percent).toBe(100)
    expect(stats.grade).toBe(10)
  })
})

describe('formatGrade', () => {
  it('usa coma decimal y evita el decimal inútil', () => {
    expect(formatGrade(7.2)).toBe('7,2')
    expect(formatGrade(10)).toBe('10')
    expect(formatGrade(6)).toBe('6')
    expect(formatGrade(7.5)).toBe('7,5')
  })
})

describe('messageForPercent', () => {
  it('cubre cada tramo', () => {
    expect(messageForPercent(0)).toMatch(/día difícil/i)
    expect(messageForPercent(29)).toMatch(/día difícil/i)
    expect(messageForPercent(30)).toMatch(/margen para mejorar/i)
    expect(messageForPercent(49)).toMatch(/margen para mejorar/i)
    expect(messageForPercent(50)).toMatch(/buen esfuerzo/i)
    expect(messageForPercent(70)).toMatch(/muy buen día/i)
    expect(messageForPercent(85)).toMatch(/excelente/i)
    expect(messageForPercent(100)).toMatch(/día perfecto/i)
  })
})

describe('bandForPercent', () => {
  it('respeta los cortes del calendario', () => {
    expect(bandForPercent(95)).toBe('top')
    expect(bandForPercent(90)).toBe('top')
    expect(bandForPercent(89)).toBe('high')
    expect(bandForPercent(75)).toBe('high')
    expect(bandForPercent(74)).toBe('good')
    expect(bandForPercent(50)).toBe('good')
    expect(bandForPercent(49)).toBe('mid')
    expect(bandForPercent(25)).toBe('mid')
    expect(bandForPercent(24)).toBe('low')
    expect(bandForPercent(0, false)).toBe('none')
  })
})

describe('computeStreak', () => {
  const threshold = 70

  it('cuenta los días consecutivos que llegaron al mínimo', () => {
    const days = {
      '2026-08-16': day('2026-08-16', 10, 8),
      '2026-08-17': day('2026-08-17', 10, 9),
      '2026-08-18': day('2026-08-18', 10, 7),
    }
    expect(computeStreak(days, '2026-08-18', threshold)).toBe(3)
  })

  it('si hoy todavía no llegó, la racha se mide desde ayer', () => {
    const days = {
      '2026-08-16': day('2026-08-16', 10, 8),
      '2026-08-17': day('2026-08-17', 10, 9),
      '2026-08-18': day('2026-08-18', 10, 2),
    }
    expect(computeStreak(days, '2026-08-18', threshold)).toBe(2)
  })

  it('un día por debajo del mínimo corta la racha', () => {
    const days = {
      '2026-08-15': day('2026-08-15', 10, 10),
      '2026-08-16': day('2026-08-16', 10, 3),
      '2026-08-17': day('2026-08-17', 10, 8),
      '2026-08-18': day('2026-08-18', 10, 8),
    }
    expect(computeStreak(days, '2026-08-18', threshold)).toBe(2)
  })

  it('un día sin registro también corta la racha', () => {
    const days = {
      '2026-08-15': day('2026-08-15', 10, 10),
      '2026-08-17': day('2026-08-17', 10, 8),
      '2026-08-18': day('2026-08-18', 10, 8),
    }
    expect(computeStreak(days, '2026-08-18', threshold)).toBe(2)
  })

  it('sin datos la racha es cero', () => {
    expect(computeStreak({}, '2026-08-18', threshold)).toBe(0)
  })

  it('respeta un mínimo configurado distinto', () => {
    const days = { '2026-08-18': day('2026-08-18', 10, 5) }
    expect(computeStreak(days, '2026-08-18', 70)).toBe(0)
    expect(computeStreak(days, '2026-08-18', 50)).toBe(1)
  })
})

describe('historySeries y aggregate', () => {
  const days = {
    '2026-08-17': day('2026-08-17', 10, 8),
    '2026-08-18': day('2026-08-18', 10, 6),
  }

  it('devuelve un punto por día, marcando los días sin registro', () => {
    const series = historySeries(days, '2026-08-18', 3)
    expect(series.map((p) => p.date)).toEqual(['2026-08-16', '2026-08-17', '2026-08-18'])
    expect(series.map((p) => p.percent)).toEqual([0, 80, 60])
    expect(series.map((p) => p.hasRecord)).toEqual([false, true, true])
  })

  it('promedia sólo los días registrados', () => {
    const stats = aggregate(days, ['2026-08-16', '2026-08-17', '2026-08-18'])
    expect(stats.average).toBe(70)
    expect(stats.best).toEqual({ date: '2026-08-17', percent: 80 })
    expect(stats.worst).toEqual({ date: '2026-08-18', percent: 60 })
    expect(stats.daysWithRecord).toBe(2)
    expect(stats.completedGoals).toBe(14)
  })
})

describe('weekSummary', () => {
  it('compara contra la semana anterior', () => {
    const days = {
      // semana anterior (lunes 10 a domingo 16 de agosto de 2026)
      '2026-08-10': day('2026-08-10', 10, 6),
      '2026-08-11': day('2026-08-11', 10, 6),
      // semana actual (lunes 17)
      '2026-08-17': day('2026-08-17', 10, 8),
      '2026-08-18': day('2026-08-18', 10, 8),
    }
    const summary = weekSummary(days, '2026-08-18', 70)
    expect(summary.weekStart).toBe('2026-08-17')
    expect(summary.average).toBe(80)
    expect(summary.previousAverage).toBe(60)
    expect(summary.delta).toBe(20)
    expect(summary.streak).toBe(2)
  })

  it('no compara cuando no hay semana anterior', () => {
    const summary = weekSummary({ '2026-08-18': day('2026-08-18', 10, 5) }, '2026-08-18', 70)
    expect(summary.previousAverage).toBeNull()
    expect(summary.delta).toBeNull()
  })

  it('los días futuros de la semana no bajan el promedio', () => {
    const days = { '2026-08-17': day('2026-08-17', 10, 9) }
    expect(weekSummary(days, '2026-08-18', 70).average).toBe(90)
  })
})
