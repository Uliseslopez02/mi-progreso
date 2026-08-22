/**
 * Momento Mori: matemática de fechas pura sobre `Settings.birthDate` /
 * `lifeExpectancyYears`. Sin persistencia propia — todo se deriva al vuelo.
 */
import { diffDays, fromDateKey, type DateKey } from './date'

export interface TimeLived {
  years: number
  months: number
  totalDays: number
  totalWeeks: number
  /** Null si no hay `lifeExpectancyYears` configurada. */
  percentLived: number | null
}

const AVG_DAYS_PER_YEAR = 365.25

export function timeLived(birthDate: DateKey, today: DateKey, lifeExpectancyYears?: number): TimeLived {
  const totalDays = Math.max(0, diffDays(birthDate, today))
  const totalWeeks = Math.floor(totalDays / 7)

  const birth = fromDateKey(birthDate)
  const now = fromDateKey(today)
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (now.getDate() < birth.getDate()) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }

  const percentLived =
    lifeExpectancyYears && lifeExpectancyYears > 0
      ? Math.min(100, Math.round((totalDays / (lifeExpectancyYears * AVG_DAYS_PER_YEAR)) * 1000) / 10)
      : null

  return { years: Math.max(0, years), months: Math.max(0, months), totalDays, totalWeeks, percentLived }
}
