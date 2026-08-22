import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { AuthGate } from '../auth/AuthGate'
import * as supabaseAuth from '../auth/supabaseAuth'

vi.mock('../auth/supabaseAuth', () => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
}))

const fakeSession = { user: { id: 'user-1', email: 'ulises@walabi.ar' } } as unknown as Session

/** Captura el callback pasado a onAuthStateChange para poder dispararlo a mano en el test. */
function captureAuthListener() {
  let listener: ((event: AuthChangeEvent, session: Session | null) => void) | null = null
  vi.mocked(supabaseAuth.onAuthStateChange).mockImplementation((cb) => {
    listener = cb
    return () => {}
  })
  return () => listener!
}

describe('AuthGate', () => {
  beforeEach(() => {
    vi.mocked(supabaseAuth.getSession).mockReset()
    vi.mocked(supabaseAuth.onAuthStateChange).mockReset()
    vi.mocked(supabaseAuth.signIn).mockReset()
    vi.mocked(supabaseAuth.signUp).mockReset()
    vi.mocked(supabaseAuth.requestPasswordReset).mockReset()
    vi.mocked(supabaseAuth.updatePassword).mockReset()
  })

  it('sin sesión, muestra el login y no el contenido protegido', async () => {
    vi.mocked(supabaseAuth.getSession).mockResolvedValue(null)
    const getListener = captureAuthListener()

    render(
      <AuthGate>
        <p>Contenido secreto</p>
      </AuthGate>,
    )

    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByText('Contenido secreto')).not.toBeInTheDocument()
    expect(getListener()).toBeTruthy()
  })

  it('con sesión ya guardada al montar, entra directo', async () => {
    vi.mocked(supabaseAuth.getSession).mockResolvedValue(fakeSession)
    vi.mocked(supabaseAuth.onAuthStateChange).mockReturnValue(() => {})

    render(
      <AuthGate>
        <p>Contenido secreto</p>
      </AuthGate>,
    )

    expect(await screen.findByText('Contenido secreto')).toBeInTheDocument()
  })

  it('con credenciales incorrectas, muestra un error y no desbloquea', async () => {
    vi.mocked(supabaseAuth.getSession).mockResolvedValue(null)
    vi.mocked(supabaseAuth.onAuthStateChange).mockReturnValue(() => {})
    vi.mocked(supabaseAuth.signIn).mockRejectedValue(new Error('invalid'))
    const user = userEvent.setup()

    render(
      <AuthGate>
        <p>Contenido secreto</p>
      </AuthGate>,
    )

    await user.type(await screen.findByLabelText('Email'), 'ulises@walabi.ar')
    await user.type(screen.getByLabelText('Contraseña'), 'mal')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos.')
    expect(screen.queryByText('Contenido secreto')).not.toBeInTheDocument()
  })

  it('al iniciar sesión bien, desbloquea cuando llega el evento de auth', async () => {
    vi.mocked(supabaseAuth.getSession).mockResolvedValue(null)
    vi.mocked(supabaseAuth.signIn).mockResolvedValue(undefined)
    const getListener = captureAuthListener()
    const user = userEvent.setup()

    render(
      <AuthGate>
        <p>Contenido secreto</p>
      </AuthGate>,
    )

    await user.type(await screen.findByLabelText('Email'), 'ulises@walabi.ar')
    await user.type(screen.getByLabelText('Contraseña'), 'buena123')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(supabaseAuth.signIn).toHaveBeenCalledWith('ulises@walabi.ar', 'buena123')

    getListener()('SIGNED_IN', fakeSession)
    expect(await screen.findByText('Contenido secreto')).toBeInTheDocument()
  })

  it('registro pide confirmar el email cuando corresponde', async () => {
    vi.mocked(supabaseAuth.getSession).mockResolvedValue(null)
    vi.mocked(supabaseAuth.onAuthStateChange).mockReturnValue(() => {})
    vi.mocked(supabaseAuth.signUp).mockResolvedValue({ needsEmailConfirmation: true })
    const user = userEvent.setup()

    render(
      <AuthGate>
        <p>Contenido secreto</p>
      </AuthGate>,
    )

    await user.click(await screen.findByRole('button', { name: 'Crear cuenta' }))
    await user.type(screen.getByLabelText('Email'), 'nueva@walabi.ar')
    await user.type(screen.getByLabelText('Contraseña'), 'nueva12345')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('status')).toHaveTextContent(/confirmar tu cuenta/)
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('cerrar sesión (evento de auth con sesión null) vuelve al login', async () => {
    vi.mocked(supabaseAuth.getSession).mockResolvedValue(fakeSession)
    const getListener = captureAuthListener()

    render(
      <AuthGate>
        <p>Contenido secreto</p>
      </AuthGate>,
    )

    expect(await screen.findByText('Contenido secreto')).toBeInTheDocument()

    getListener()('SIGNED_OUT', null)
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
    expect(screen.queryByText('Contenido secreto')).not.toBeInTheDocument()
  })
})
