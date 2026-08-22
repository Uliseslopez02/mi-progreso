import { useEffect, useRef, useState } from 'react'

/**
 * Marca el elemento como visible la primera vez que entra en viewport, vía
 * IntersectionObserver nativo — sin librería de animación. `global.css` ya
 * fuerza `prefers-reduced-motion` globalmente, así que la transición CSS que
 * consuma esta clase se desactiva sola para quien lo pida.
 */
export function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}
