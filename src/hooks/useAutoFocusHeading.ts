import { useEffect, useRef } from 'react'

/**
 * Mueve el foco al encabezado del paso activo cuando `dep` cambia. Sin esto,
 * al avanzar un wizard el foco queda en un botón que acaba de desmontarse y
 * el navegador lo manda a `<body>` — se pierde la posición de Tab y un
 * lector de pantalla no se entera de que apareció contenido nuevo.
 */
export function useAutoFocusHeading<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [dep])
  return ref
}
