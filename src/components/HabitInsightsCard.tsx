import { useEffect, useState } from 'react'
import type { DateKey } from '../domain/date'
import { buildHabitInsightsPayload, fetchHabitInsights } from '../domain/habitInsights'
import type { AppData } from '../domain/types'

const CACHE_PREFIX = 'mi-progreso:habit-insights:'

function readCache(today: DateKey): string[] | null {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + today)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { insights?: unknown }
    return Array.isArray(parsed.insights) ? parsed.insights.filter((s): s is string => typeof s === 'string') : null
  } catch {
    return null
  }
}

function writeCache(today: DateKey, insights: string[]) {
  try {
    window.localStorage.setItem(CACHE_PREFIX + today, JSON.stringify({ insights }))
  } catch {
    // Sin espacio o modo privado: no rompe nada, sólo no se cachea.
  }
}

interface Props {
  data: AppData
  today: DateKey
}

/**
 * Sugerencias proactivas de IA basadas en el historial real (rachas, días de
 * la semana, categorías) — nunca se piden solas al cargar la página (costo de
 * API por llamada a Claude), sólo bajo pedido explícito, y se cachean por día
 * en localStorage para no repetir la llamada si se recarga la pantalla.
 */
export function HabitInsightsCard({ data, today }: Props) {
  const [insights, setInsights] = useState<string[] | null>(() => readCache(today))
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setInsights(readCache(today))
    setStatus('idle')
  }, [today])

  const load = async () => {
    setStatus('loading')
    const payload = buildHabitInsightsPayload(data, today)
    const result = await fetchHabitInsights(payload)
    if (result.ok) {
      setInsights(result.insights)
      writeCache(today, result.insights)
      setStatus('idle')
    } else {
      setErrorMessage(result.error)
      setStatus('error')
    }
  }

  return (
    <section className="card">
      <div className="card__header">
        <h2 className="card__title">Sugerencias</h2>
        <button type="button" className="btn btn--ghost" onClick={load} disabled={status === 'loading'}>
          {status === 'loading' ? 'Pensando…' : insights ? 'Actualizar' : 'Ver sugerencias'}
        </button>
      </div>

      {status === 'error' && <p className="empty">{errorMessage}</p>}

      {status !== 'error' && insights === null && (
        <p className="card__hint">
          La IA puede revisar tus rachas, días de la semana y categorías para sugerirte ajustes —
          nunca cambia nada sola, sólo propone.
        </p>
      )}

      {status !== 'error' && insights !== null && insights.length === 0 && (
        <p className="card__hint">Todavía no hay suficiente historial para una sugerencia real.</p>
      )}

      {status !== 'error' && insights !== null && insights.length > 0 && (
        <ul className="habit-insights">
          {insights.map((text, i) => (
            <li className="habit-insights__item" key={i}>
              💡 {text}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
