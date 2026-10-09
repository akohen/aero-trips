import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MantineProvider } from '@mantine/core'
import { Timestamp } from 'firebase/firestore'
import type { Airfield, Profile, Report } from '..'
import ReportForm from './ReportForm'
import { visitDayToUtc } from '../utils/reports'

const profile: Profile = {
  uid: 'u1', displayName: 'Camille Martin', email: 'c@example.com', visited: [], update: vi.fn(),
}
const airfield = {
  codeIcao: 'LFOV', name: 'LAVAL ENTRAMMES',
  landingFee: { amount: 10, source: 'official', checkedAt: Timestamp.fromDate(new Date('2026-04-01')) },
} as unknown as Airfield
const other = { codeIcao: 'LFRS', name: 'NANTES ATLANTIQUE' } as unknown as Airfield
const airfields = new Map([[airfield.codeIcao, airfield], [other.codeIcao, other]])

const renderForm = (props: Partial<Parameters<typeof ReportForm>[0]> = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  render(<MantineProvider env="test">
    <ReportForm airfield={airfield} airfields={airfields} profile={profile} onClose={vi.fn()} onSubmit={onSubmit} {...props} />
  </MantineProvider>)
  return onSubmit
}

const today = () => visitDayToUtc(new Date())
const publish = () => screen.getByRole('button', { name: 'Publier' })

beforeEach(() => {
  localStorage.clear()
  // useMediaQuery (fullScreen on mobile); happy-dom has no matchMedia
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  // Textarea autosize; happy-dom has no document.fonts
  Object.defineProperty(document, 'fonts', { configurable: true, value: { addEventListener: vi.fn(), removeEventListener: vi.fn() } })
})
afterEach(cleanup)

describe('ReportForm', () => {
  it('needs a text or a fee before publishing', async () => {
    renderForm()
    expect(publish()).toBeDisabled()
    expect(screen.getByText('Publié sous le nom Camille Martin')).toBeInTheDocument()
  })

  it('publishes a text report dated today and marks the airfield visited', async () => {
    const onSubmit = renderForm()
    await userEvent.type(screen.getByLabelText('Votre visite'), '  Accueil au top  ')
    await userEvent.click(publish())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(airfield, { observedAt: today(), text: 'Accueil au top' }, true))
  })

  it('publishes a fee with a comma, the weight class and a note', async () => {
    const onSubmit = renderForm()
    await userEvent.type(screen.getByLabelText('Montant payé'), '12,50')
    await userEvent.click(screen.getByText('Plus lourd'))
    await userEvent.type(screen.getByLabelText('Précision'), 'payé à la tour')
    await userEvent.click(screen.getByLabelText('Marquer ce terrain comme visité'))
    await userEvent.click(publish())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(airfield, {
      observedAt: today(), landingFee: { amount: 12.5, note: 'payé à la tour' }, aircraftClass: 'heavy',
    }, false))
  })

  it('confirms the current fee in one tap, and rejects bad amounts', async () => {
    const onSubmit = renderForm()
    expect(screen.queryByText('MTOW ≤ 1,2 t')).not.toBeInTheDocument()
    expect(screen.getByText(/Actuellement : ≈ 10 €/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Montant payé'), 'dix')
    expect(publish()).toBeDisabled()
    expect(screen.getByText('Montant invalide, par exemple 12,50')).toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Montant payé'))
    await userEvent.click(screen.getByRole('button', { name: 'Toujours exact' }))
    expect(screen.getByLabelText('Montant payé')).toHaveValue('10')
    await userEvent.click(publish())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      airfield, { observedAt: today(), landingFee: { amount: 10 }, aircraftClass: 'light' }, true))
  })

  it('keeps a draft per airfield', async () => {
    renderForm()
    await userEvent.type(screen.getByLabelText('Votre visite'), 'Brouillon')
    cleanup()
    renderForm()
    expect(screen.getByLabelText('Votre visite')).toHaveValue('Brouillon')
  })

  it('edits an existing report, without the visited checkbox', async () => {
    const report = {
      id: 'r1', source: { type: 'pilot' }, target: { type: 'airfields', id: 'LFOV' }, observedAt: Timestamp.fromDate(new Date('2026-05-03T00:00:00Z')),
      text: 'Avant', landingFee: { amount: 0 }, aircraftClass: 'light',
    } as Report
    const onSubmit = renderForm({ report })
    expect(screen.queryByLabelText('Marquer ce terrain comme visité')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Date de visite')).toHaveTextContent('03/05/2026')
    expect(screen.getByRole('checkbox', { name: 'Gratuit' })).toBeChecked()
    await userEvent.clear(screen.getByLabelText('Votre visite'))
    await userEvent.type(screen.getByLabelText('Votre visite'), 'Après')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(airfield, {
      observedAt: new Date('2026-05-03T00:00:00Z'), text: 'Après', landingFee: { amount: 0 }, aircraftClass: 'light',
    }, false))
  })

  it('asks for the airfield when it has none', async () => {
    const onSubmit = renderForm({ airfield: undefined })
    expect(screen.getByText('Compte rendu de visite')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Votre visite'), 'Très bien')
    expect(publish()).toBeDisabled()
    await userEvent.type(screen.getAllByLabelText('Aérodrome').find(el => el.tagName === 'INPUT')!, 'LFRS')
    await userEvent.click(await screen.findByRole('option', { name: 'Nantes Atlantique - LFRS' }))
    await userEvent.click(publish())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(other, { observedAt: today(), text: 'Très bien' }, true))
  })

  it('stays open with an error when saving fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('denied'))
    render(<MantineProvider env="test">
      <ReportForm airfield={airfield} airfields={airfields} profile={profile} onClose={vi.fn()} onSubmit={onSubmit} />
    </MantineProvider>)
    await userEvent.type(screen.getByLabelText('Votre visite'), 'Texte')
    await userEvent.click(publish())
    expect(await screen.findByText(/L'enregistrement a échoué/)).toBeInTheDocument()
    expect(screen.getByLabelText('Votre visite')).toHaveValue('Texte')
  })
})
