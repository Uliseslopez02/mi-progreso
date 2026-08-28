interface LogoMarkProps {
  size?: number
  className?: string
}

/**
 * Marca de Mi Progreso: un camino con altibajos que igual termina más arriba
 * de donde empezó — cada quiebre marcado es un día, no todos iguales, pero
 * el que sigue apareciendo llega. Mismo asset para favicon, header y
 * cualquier superficie futura (ver public/logo.svg, que debe mantenerse en
 * sync con este markup).
 */
export function LogoMark({ size = 28, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Mi Progreso"
    >
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#12161c" />
      <rect x="1.5" y="1.5" width="29" height="29" rx="7.5" fill="none" stroke="rgba(255,255,255,0.07)" />
      <defs>
        <linearGradient id="logo-path" x1="7" y1="26" x2="25" y2="9" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5f6878" />
          <stop offset="0.55" stopColor="#34d399" />
          <stop offset="1" stopColor="#4ade80" />
        </linearGradient>
        <radialGradient id="logo-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(25 9) scale(7)">
          <stop offset="0" stopColor="#4ade80" stopOpacity="0.5" />
          <stop offset="1" stopColor="#4ade80" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="25" cy="9" r="7" fill="url(#logo-glow)" />
      <polyline
        points="7,26 11,22 14,25 18,17 21,19 25,9"
        stroke="url(#logo-path)"
        strokeWidth="1.9"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="26" r="1.3" fill="#5f6878" />
      <circle cx="11" cy="22" r="1.15" fill="#7c8a9c" />
      <circle cx="14" cy="25" r="1.15" fill="#7c8a9c" />
      <circle cx="18" cy="17" r="1.3" fill="#34d399" />
      <circle cx="21" cy="19" r="1.3" fill="#34d399" />
      <circle cx="25" cy="9" r="2.7" fill="#4ade80" />
    </svg>
  )
}

interface LogoProps {
  size?: number
  className?: string
  name?: string
}

/** Lockup ícono + texto, para headers y superficies donde el nombre debe ir explícito. */
export function Logo({ size = 26, className, name = 'Mi Progreso' }: LogoProps) {
  return (
    <div className={`logo${className ? ` ${className}` : ''}`}>
      <LogoMark size={size} />
      <span className="logo__text">{name}</span>
    </div>
  )
}
