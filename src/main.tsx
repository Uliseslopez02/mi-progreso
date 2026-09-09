import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AuthGate } from './auth/AuthGate'
import { AppProvider } from './state/AppProvider'
import { createSupabaseRepository } from './storage/supabaseRepository'
import './styles/global.css'

// `/producto` es una demo pública e interactiva, pensada para gente sin cuenta —
// se monta sola, sin AuthGate ni Supabase. Import perezoso a propósito: así su
// JS/CSS (incluida la fuente Manrope) nunca se descarga para quien entra a la
// app normal a loguearse.
const ProductShowcasePage = lazy(() =>
  import('./showcase/ProductShowcasePage').then((m) => ({ default: m.ProductShowcasePage })),
)

// `/presentacion` es la página comercial de venta (independiente de
// `/producto`, que quedó desactualizada respecto al producto real — ver
// `src/presentacion/`). Mismo criterio: pública, sin cuenta, import perezoso.
const PresentacionPage = lazy(() =>
  import('./presentacion/PresentacionPage').then((m) => ({ default: m.PresentacionPage })),
)

const isShowcaseRoute = window.location.pathname.startsWith('/producto')
const isPresentacionRoute = window.location.pathname.startsWith('/presentacion')

// Se crea una sola vez a nivel de módulo (no dentro del componente) para que
// StrictMode no la duplique, y sólo si hace falta: las demos públicas no deben
// depender de que Supabase esté configurado.
const repository = isShowcaseRoute || isPresentacionRoute ? null : createSupabaseRepository()

function Root() {
  if (isPresentacionRoute) {
    return (
      <Suspense fallback={null}>
        <PresentacionPage />
      </Suspense>
    )
  }

  if (!repository) {
    return (
      <Suspense fallback={null}>
        <ProductShowcasePage />
      </Suspense>
    )
  }

  return (
    <AuthGate>
      <AppProvider repository={repository}>
        <App />
      </AppProvider>
    </AuthGate>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
