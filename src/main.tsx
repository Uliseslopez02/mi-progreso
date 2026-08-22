import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AuthGate } from './auth/AuthGate'
import { AppProvider } from './state/AppProvider'
import { createSupabaseRepository } from './storage/supabaseRepository'
import './styles/global.css'

const repository = createSupabaseRepository()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <AppProvider repository={repository}>
        <App />
      </AppProvider>
    </AuthGate>
  </StrictMode>,
)
