import { useEffect, useRef, useState } from 'react'

/**
 * Marca el elemento como visible la primera vez que entra (o casi entra) en
 * viewport, para animar su entrada. Copia local a propósito (no se importa de
 * `src/showcase/`: `/presentacion` es una ruta independiente).
 *
 * Defensa en profundidad para que el contenido nunca quede invisible: además
 * del IntersectionObserver hay un chequeo directo de `getBoundingClientRect`
 * en cada scroll/resize y un fallback por tiempo. Si algo falla, el peor caso
 * es que la sección aparezca sin animar, nunca que no aparezca.
 */
export function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let done = false
    const reveal = () => {
      if (done) return
      done = true
      setVisible(true)
      cleanup()
    }

    const inView = () => {
      const r = el.getBoundingClientRect()
      const h = window.innerHeight || document.documentElement.clientHeight
      return r.top < h * 0.92 && r.bottom > 0
    }
    const onScrollOrResize = () => {
      if (inView()) reveal()
    }

    let observer: IntersectionObserver | undefined
    const fallback = window.setTimeout(reveal, 2500)

    function cleanup() {
      observer?.disconnect()
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
      window.clearTimeout(fallback)
    }

    if (inView()) {
      reveal()
      return cleanup
    }

    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) reveal()
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
      )
      observer.observe(el)
    }
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize, { passive: true })

    return cleanup
  }, [])

  return { ref, visible }
}
