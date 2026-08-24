import { Outlet, useLocation, useNavigate } from 'react-router-dom'

export interface SubNavItem {
  to: string
  label: string
}

interface Props {
  items: SubNavItem[]
  ariaLabel: string
}

/** Sub-navegación de una sección (Agenda/Objetivos/Historial) + el contenido de la sub-ruta activa. */
export function SectionLayout({ items, ariaLabel }: Props) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="stack">
      <div className="nav" role="group" aria-label={ariaLabel}>
        {items.map((item) => (
          <button
            key={item.to}
            type="button"
            className={`nav__item${location.pathname === item.to ? ' nav__item--active' : ''}`}
            aria-current={location.pathname === item.to ? 'page' : undefined}
            onClick={() => navigate(item.to)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
