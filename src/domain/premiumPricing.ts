/**
 * Extrae el monto de un label de precio en pesos (siempre entero, sin
 * centavos). El "." en labels tipo "$32.000/año" es separador de miles,
 * no decimal -- si se dejara pasar, Number("32.000") daría 32, no 32000.
 */
function parseWholePesos(label: string): number {
  return Number(label.replace(/[^0-9]/g, ''))
}

/**
 * Sólo si ambos labels son numéricos parseables se muestra un % de ahorro
 * real — nunca se inventa un porcentaje sin los 2 precios configurados
 * (VITE_PREMIUM_MONTHLY_PRICE_LABEL/VITE_PREMIUM_YEARLY_PRICE_LABEL, ver
 * PremiumPage.tsx). Si el anual no ahorra nada (o el monthly no se puede
 * parsear), no se muestra badge en vez de mostrar un 0% o negativo.
 */
export function yearlySavingsPercent(monthlyLabel: string, yearlyLabel: string): number | null {
  const monthly = parseWholePesos(monthlyLabel)
  const yearly = parseWholePesos(yearlyLabel)
  if (!monthly || !yearly) return null
  const yearlyEquivalentOfMonthly = monthly * 12
  if (yearlyEquivalentOfMonthly <= yearly) return null
  return Math.round((1 - yearly / yearlyEquivalentOfMonthly) * 100)
}

/**
 * "$32.000/año" -> "$2.667/mes" — a cuánto equivale el plan anual por mes,
 * para que la comparación con el mensual sea inmediata sin tener que hacer
 * la cuenta. Devuelve null si el label no tiene un número parseable (mismo
 * criterio que yearlySavingsPercent: nunca se inventa un monto).
 */
export function monthlyEquivalentLabel(yearlyLabel: string): string | null {
  const yearly = parseWholePesos(yearlyLabel)
  if (!yearly) return null
  const perMonth = Math.round(yearly / 12)
  return `$${perMonth.toLocaleString('es-AR')}/mes`
}
