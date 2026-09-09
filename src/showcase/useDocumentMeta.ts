import { useEffect } from 'react'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

/**
 * SEO mínimo de `/producto`: título y meta description propios (el resto de la
 * app usa el `<title>` genérico de `index.html`), más Open Graph básico para
 * que un link compartido se vea bien. No hay `<head>` por ruta (sin SSR), así
 * que se setea a mano al montar y se restaura al desmontar.
 */
export function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title
    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', 'website')
    return () => {
      document.title = previousTitle
    }
  }, [title, description])
}
