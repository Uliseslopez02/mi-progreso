/**
 * Sólo si ambos labels son numéricos parseables se muestra un % de ahorro
 * real — nunca se inventa un porcentaje sin los 2 precios configurados
 * (VITE_PREMIUM_MONTHLY_PRICE_LABEL/VITE_PREMIUM_YEARLY_PRICE_LABEL, ver
 * PremiumPage.tsx). Si el anual no ahorra nada (o el monthly no se puede
 * parsear), no se muestra badge en vez de mostrar un 0% o negativo.
 */
export function yearlySavingsPercent(monthlyLabel: string, yearlyLabel: string): number | null {
  const monthly = Number(monthlyLabel.replace(/[^0-9.]/g, ''))
  const yearly = Number(yearlyLabel.replace(/[^0-9.]/g, ''))
  if (!monthly || !yearly) return null
  const yearlyEquivalentOfMonthly = monthly * 12
  if (yearlyEquivalentOfMonthly <= yearly) return null
  return Math.round((1 - yearly / yearlyEquivalentOfMonthly) * 100)
}
