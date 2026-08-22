import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

/** Lleva el registro progresivo hasta el paso de seguridad (nombre + email ya cargados). */
async function goToSecurityStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Crear cuenta' }))
  await user.click(await screen.findByRole('button', { name: 'Empezar' }))
  await user.type(await screen.findByLabelText('Nombre'), 'Ulises')
  await user.type(screen.getByLabelText('Email'), 'nueva@walabi.ar')
  await user.click(screen.getByRole('button', { name: 'Continuar' }))
}

describe('AuthGate', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.mocked(supabaseAuth.getSession).mockReset()
    vi.mocked(supabaseAuth.onAuthStateChange).mockReset()
    vi.mocked(supabaseAuth.signIn).mockReset()
    vi.mocked(supabaseAuth.signUp).mockReset()
    vi.mocked(supabaseAuth.requestPasswordReset).mockReset()
    vi.mocked(supabaseAuth.updatePassword).mockReset()
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('sin sesión, muestra el login y no el contenido protegido', async () => {
    vi.mocked(supabaseAuth.getSession).mockResolvedValue(null)
    const getListener = captureAuthListener()

    render(
      <AuthGate>
        <p>Contenido secreto</p>
      </AuthGate>,
    )

    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByText('Contenido secreto')).not.toBeInTheDocument()
    expect(getListener()).toBeTruthy()
  })

  it('con sesión ya guardada al montar, entra directo (sin transición de bienvenida)', async () => {
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

  it('al iniciar sesión bien, muestra la transición y desbloquea', async () => {
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
    // La transición de bienvenida (EnterTransition) tarda ~900ms reales antes de revelar la app.
    expect(await screen.findByText('Contenido secreto', {}, { timeout: 2000 })).toBeInTheDocument()
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

  it('registro progresivo: identidad, seguridad y confirmación final de email', async () => {
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

    await goToSecurityStep(user)
    expect(await screen.findByText('Mucho gusto, Ulises.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Contraseña'), 'nueva12345')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'nueva12345')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText('¿Qué te gustaría mejorar primero?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }))

    expect(supabaseAuth.signUp).toHaveBeenCalledWith('nueva@walabi.ar', 'nueva12345', 'Ulises')
    expect(await screen.findByText('¡Listo, Ulises!')).toBeInTheDocument()
    expect(screen.getByText(/Te enviamos un email para confirmar tu cuenta/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ir a iniciar sesión' }))
    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
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

    await goToSecurityStep(user)
    await user.type(screen.getByLabelText('Contraseña'), 'nueva12345')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'otradistinta1')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

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

    await goToSecurityStep(user)
    await user.type(screen.getByLabelText('Contraseña'), 'nueva12345')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'nueva12345')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(await screen.findByRole('button', { name: 'Crear mi cuenta' }))

    expect(await screen.findByText('Esa cuenta ya existe')).toBeInTheDocument()
    expect(screen.getByText(/Ya hay una cuenta con ese email/)).toBeInTheDocument()
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

  it('recuperar contraseña no revela si la cuenta existe o no, y permite reenviar', async () => {
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
    expect(screen.getByRole('heading', { name: '¿No recordás tu contraseña?' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('Email'), 'quien-sea@walabi.ar')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Si existe una cuenta asociada a q********@walabi.ar, te enviamos instrucciones',
    )
    expect(supabaseAuth.requestPasswordReset).toHaveBeenCalledTimes(1)

    // El botón de reenvío arranca con un cooldown real (evita golpear el rate-limit de Supabase).
    const resendButton = screen.getByRole('button', { name: /Reenviar \(\d+s\)/ })
    expect(resendButton).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Cambiar email' }))
    expect(screen.getByRole('heading', { name: '¿No recordás tu contraseña?' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveValue('quien-sea@walabi.ar')
  })

  it('un enlace de recuperación vencido muestra una pantalla propia, no el login mudo', async () => {
    window.history.replaceState(null, '', '/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')
    vi.mocked(supabaseAuth.getSession).mockResolvedValue(null)
    vi.mocked(supabaseAuth.onAuthStateChange).mockReturnValue(() => {})
    const user = userEvent.setup()

    render(
      <AuthGate>
        <p>Contenido secreto</p>
      </AuthGate>,
    )

    expect(await screen.findByRole('heading', { name: 'Este enlace ya venció.' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pedir un enlace nuevo' }))
    expect(await screen.findByRole('heading', { name: '¿No recordás tu contraseña?' })).toBeInTheDocument()
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
    expect(await screen.findByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(screen.queryByText('Contenido secreto')).not.toBeInTheDocument()
  })
})
