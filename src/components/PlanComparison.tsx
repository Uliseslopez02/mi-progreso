import { PLAN_LIMITS, PRO_NAME } from '../domain/plan'

interface Row {
  label: string
  free: string
  pro: string
}

const f = PLAN_LIMITS.free

const ROWS: Row[] = [
  { label: 'Objetivos diarios', free: String(f.dailyGoals), pro: 'Sin límite' },
  { label: 'Hábitos', free: String(f.habits), pro: 'Sin límite' },
  { label: 'Metas activas', free: String(f.activeLifeGoals), pro: 'Sin límite' },
  { label: 'Proyectos activos', free: String(f.activeProjects), pro: 'Sin límite' },
  { label: 'Rutinas', free: String(f.routines), pro: 'Sin límite' },
  { label: 'Historial de progreso', free: '30 días', pro: '90 días + 1 año' },
  { label: 'Mapa anual de hábitos', free: 'Últimos meses', pro: 'Año completo' },
  { label: 'Informe mensual', free: 'Del mes en curso', pro: '+ métricas y evolución mes a mes' },
  { label: 'Planificador semanal', free: 'Semana actual y siguiente', pro: 'Cualquier semana' },
  { label: 'IA — sugerencias e insights', free: '3 por mes', pro: 'Sin límite' },
  { label: 'Notas', free: String(f.notes), pro: 'Sin límite' },
  { label: 'Enfoque / Pomodoro', free: 'Completo', pro: 'Completo' },
  { label: 'Revisión mensual guiada', free: 'Sí', pro: 'Sí' },
  { label: 'Exportar / importar tus datos', free: 'Sí', pro: 'Sí' },
  { label: 'Personalización (nombre, colores, orden)', free: 'Sí', pro: 'Sí' },
]

/** Tabla comparativa Free vs Premium, alimentada desde `domain/plan.ts`. */
export function PlanComparison() {
  return (
    <div className="plan-compare">
      <div className="plan-compare__head" role="row">
        <span />
        <span>Free</span>
        <span>{PRO_NAME}</span>
      </div>
      {ROWS.map((row) => (
        <div className="plan-compare__row" role="row" key={row.label}>
          <span className="plan-compare__label">{row.label}</span>
          <span className="plan-compare__free">{row.free}</span>
          <span className="plan-compare__pro">{row.pro}</span>
        </div>
      ))}
    </div>
  )
}
