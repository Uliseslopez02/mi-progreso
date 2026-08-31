/**
 * Frases fijas armadas sobre los campos reales de `MonthlyReport`. Mismo criterio que
 * `messageForPercent` (scoring.ts): cada frase sólo aparece si el dato que necesita
 * existe — nunca texto inventado.
 */
import type { MonthlyReport } from './monthlyReport'

export function monthlyConclusions(report: MonthlyReport): string[] {
  const conclusions: string[] = []

  if (report.deltaVsPreviousMonth !== null) {
    if (report.deltaVsPreviousMonth === 0) {
      conclusions.push('Tu rendimiento se mantuvo igual respecto al mes anterior.')
    } else {
      const verb = report.deltaVsPreviousMonth > 0 ? 'mejoró' : 'bajó'
      conclusions.push(
        `Tu rendimiento ${verb} un ${Math.abs(report.deltaVsPreviousMonth)}% respecto al mes anterior.`,
      )
    }
  }

  if (report.bestCategory) {
    conclusions.push(`Tu categoría más fuerte fue ${report.bestCategory.name}.`)
  }

  if (report.hardestGoal) {
    conclusions.push(`El objetivo que más te costó mantener fue ${report.hardestGoal.name}.`)
  }

  if (report.bestStreakInMonth > 0) {
    const unit = report.bestStreakInMonth === 1 ? 'día' : 'días'
    conclusions.push(`Tuviste una racha máxima de ${report.bestStreakInMonth} ${unit}.`)
  }

  if (report.bestWeekday) {
    conclusions.push(`Tu rendimiento fue más alto los ${report.bestWeekday.day}.`)
  }

  if (report.perfectDays > 0) {
    const noun = report.perfectDays === 1 ? 'día perfecto' : 'días perfectos'
    conclusions.push(`Tuviste ${report.perfectDays} ${noun} este mes.`)
  }

  return conclusions
}
