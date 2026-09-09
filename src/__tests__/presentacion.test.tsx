import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PresentacionPage } from '../presentacion/PresentacionPage'

describe('PresentacionPage', () => {
  it('renderiza la narrativa comercial completa', () => {
    render(<PresentacionPage />)

    expect(
      screen.getByRole('heading', { name: /Dejá de adivinar si estás progresando/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Hacés cosas todos los días/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Mi Progreso conecta lo que hacés/i })).toBeInTheDocument()
    expect(screen.getByText(/Para lo que no es diario/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /¿Qué significa realmente ese número\?/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /De elegir qué te importa/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Tu progreso ya está pasando/i })).toBeInTheDocument()
    expect(document.title).toMatch(/Mi Progreso/)
  })

  it('la recreación de "Hoy" reacciona al marcar un objetivo', async () => {
    render(<PresentacionPage />)

    // El día arranca en 60% (Entrenar peso 2 + Agua, sobre peso total 5).
    const dayCard = screen
      .getByText('Así se ve tu progreso, todos los días.')
      .closest('.pr-section') as HTMLElement
    expect(within(dayCard).getByTestId('ring-percent')).toHaveTextContent('60%')

    await userEvent.click(within(dayCard).getByRole('checkbox', { name: /Bloque de trabajo profundo/i }))

    // 3/5 → 4/5 = 80% — el mismo cálculo puro que la app real.
    expect(within(dayCard).getByTestId('ring-percent')).toHaveTextContent('80%')
    expect(within(dayCard).getByText('Muy buen día')).toBeInTheDocument()
  })
})
