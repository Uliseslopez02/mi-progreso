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

    expect(await screen.findByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument()
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

  it('con credenciales incorrectas, muestra un error específico y no desbloquea', async () => {
    vi.mocked(supabaseAuth.getSession).mockResolvedValue(null)
    vi.mocked(supabaseAuth.onAuthStateChange).mockReturnValue(() => {})
    vi.mocked(supabaseAuth.signIn).mockRejectedValue(new Error('Invalid login credentials'))
    const user = userEvent.setup()

    render(
      <AuthGate>
        <p>Contenido secreto</p>
      </AuthGate>,
    )

    await user.type(await screen.findByLabelText('Email'), 'ulises@walabi.ar')
    await user.type(screen.getByLabelText('Contraseña'), 'malacontrasena')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos.')
    expect(screen.queryByText('Contenido secreto')).not.toBeInTheDocument()
  })

  it('un error de red al iniciar sesión muestra un mensaje distinto al de credenciales', async () => {
    vi.mocked(supabaseAuth.getSession).mockResolvedValue(null)
    vi.mocked(supabaseAuth.onAuthStateChange).mockReturnValue(() => {})
    vi.mocked(supabaseAuth.signIn).mockRejectedValue(new TypeError('Failed to fetch'))
    const user = userEvent.setup()

    render(
      <AuthGate>
        <p>Contenido secreto</p>
      </AuthGate>,
    )

    await user.type(await screen.findByLabelText('Email'), 'ulises@walabi.ar')
    await user.type(screen.getByLabelText('Contraseña'), 'malacontrasena')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectarnos')
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
    await user.type(screen.getByLabelText('Contraseña'), 'buena12345')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(supabaseAuth.signIn).toHaveBeenCalledWith('ulises@walabi.ar', 'buena12345')

    getListener()('SIGNED_IN', fakeSession)
    expect(await screen.findByText('Contenido secreto')).toBeInTheDocument()
  })

  it('no envía el formulario de login si falta el email o la contraseña', async () => {
    vi.mocked(supabaseAuth.getSession).mockResolvedValue(null)
    vi.mocked(supabaseAuth.onAuthStateChange).mockReturnValue(() => {})
    const user = userEvent.setup()

    render(
      <AuthGate>
        <p>Contenido secreto</p>
      </AuthGate>,
    )

    await user.click(await screen.findByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Ingresá tu email.')).toBeInTheDocument()
    expect(screen.getByText('Ingresá tu contraseña.')).toBeInTheDocument()
    expect(supabaseAuth.signIn).not.toHaveBeenCalled()
  })

  it('registro pide nombre, valida la contraseña y pide confirmar el email', async () => {
    vi.mocked(supabaseAuth.getSession).mockResolvedValue(null)
    vi.mocked(supabaseAuth.onAuthStateChange).mockReturnValue(() => {})
    vi.mocked(supabaseAuth.signUp).mockResolvedValue({
      needsEmailConfirmation: true,
      alreadyRegistered: false,
    })
    const user = userEvent.setup()

    render(
      <AuthGate>
        <p>Contenido secreto</p>
      </AuthGate>,
    )

    await user.click(await screen.findByRole('button', { name: 'Crear cuenta' }))
    expect(screen.getByRole('heading', { name: 'Creá tu cuenta' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('Nombre'), 'Ulises')
    await user.type(screen.getByLabelText('Email'), 'nueva@walabi.ar')
    await user.type(screen.getByLabelText('Contraseña'), 'nueva12345')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'nueva12345')
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }))

    expect(supabaseAuth.signUp).toHaveBeenCalledWith('nueva@walabi.ar', 'nueva12345', 'Ulises')
    expect(await screen.findByRole('status')).toHaveTextContent(/confirmar tu cuenta/)
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument()
  })

  it('registro avisa si las contraseñas no coinciden y no llama al backend', async () => {
    vi.mocked(supabaseAuth.getSession).mockResolvedValue(null)
    vi.mocked(supabaseAuth.onAuthStateChange).mockReturnValue(() => {})
    const user = userEvent.setup()

    render(
      <AuthGate>
        <p>Contenido secreto</p>
      </AuthGate>,
    )

    await user.click(await screen.findByRole('button', { name: 'Crear cuenta' }))
    await user.type(screen.getByLabelText('Nombre'), 'Ulises')
    await user.type(screen.getByLabelText('Email'), 'nueva@walabi.ar')
    await user.type(screen.getByLabelText('Contraseña'), 'nueva12345')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'otradistinta1')
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }))

    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(supabaseAuth.signUp).not.toHaveBeenCalled()
  })

  it('registro avisa si el email ya tiene una cuenta', async () => {
    vi.mocked(supabaseAuth.getSession).mockResolvedValue(null)
    vi.mocked(supabaseAuth.onAuthStateChange).mockReturnValue(() => {})
    vi.mocked(supabaseAuth.signUp).mockResolvedValue({
      needsEmailConfirmation: false,
      alreadyRegistered: true,
    })
    const user = userEvent.setup()

    render(
      <AuthGate>
        <p>Contenido secreto</p>
      </AuthGate>,
    )

    await user.click(await screen.findByRole('button', { name: 'Crear cuenta' }))
    await user.type(screen.getByLabelText('Nombre'), 'Ulises')
    await user.type(screen.getByLabelText('Email'), 'ya-existe@walabi.ar')
    await user.type(screen.getByLabelText('Contraseña'), 'nueva12345')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'nueva12345')
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una cuenta con este email.')
  })

  it('el botón de mostrar/ocultar contraseña cambia el tipo del input', async () => {
    vi.mocked(supabaseAuth.getSession).mockResolvedValue(null)
    vi.mocked(supabaseAuth.onAuthStateChange).mockReturnValue(() => {})
    const user = userEvent.setup()

    render(
      <AuthGate>
        <p>Contenido secreto</p>
      </AuthGate>,
    )

    const passwordInput = await screen.findByLabelText('Contraseña')
    expect(passwordInput).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(passwordInput).toHaveAttribute('type', 'text')
  })

  it('recuperar contraseña no revela si la cuenta existe o no', async () => {
    vi.mocked(supabaseAuth.getSession).mockResolvedValue(null)
    vi.mocked(supabaseAuth.onAuthStateChange).mockReturnValue(() => {})
    vi.mocked(supabaseAuth.requestPasswordReset).mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <AuthGate>
        <p>Contenido secreto</p>
      </AuthGate>,
    )

    await user.click(await screen.findByRole('button', { name: 'Olvidé mi contraseña' }))
    await user.type(screen.getByLabelText('Email'), 'quien-sea@walabi.ar')
    await user.click(screen.getByRole('button', { name: 'Enviar instrucciones' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Si existe una cuenta asociada a este email, te enviamos instrucciones',
    )
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
    expect(await screen.findByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument()
    expect(screen.queryByText('Contenido secreto')).not.toBeInTheDocument()
  })
})
