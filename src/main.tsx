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

const isShowcaseRoute = window.location.pathname.startsWith('/producto')

// Se crea una sola vez a nivel de módulo (no dentro del componente) para que
// StrictMode no la duplique, y sólo si hace falta: la demo pública no debe
// depender de que Supabase esté configurado.
const repository = isShowcaseRoute ? null : createSupabaseRepository()

function Root() {
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
