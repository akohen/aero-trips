import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MantineProvider } from '@mantine/core'
import type { Profile } from '..'
import PassportBadge from './PassportBadge'

vi.mock('../data/firebase', () => ({ storageBucket: 'test-bucket' }))

const profile = (passportPublic: boolean): Profile => ({
  uid: 'u1',
  displayName: 'Camille',
  email: 'camille@example.com',
  homebase: 'LFPN',
  passportPublic,
  visited: [{ type: 'airfields', id: 'LFAT' }, { type: 'airfields', id: 'LFPZ' }],
  update: vi.fn(),
})

const renderBadge = (p: Profile) => render(<MantineProvider env="test"><PassportBadge profile={p} /></MantineProvider>)

afterEach(cleanup)

describe('PassportBadge', () => {
  it('shows the badge next to a single share menu', async () => {
    renderBadge(profile(true))
    expect(screen.getByAltText('Base LFPN · 2 terrains visités · aerotrips.fr')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Partager' }))
    expect(await screen.findByRole('menuitem', { name: 'Télécharger' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: "Lien de l'image" })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Code HTML' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Code forum' })).toBeEnabled()
  })

  it('disables embedding until the profile is public', async () => {
    renderBadge(profile(false))
    await userEvent.click(screen.getByRole('button', { name: 'Partager' }))
    expect(await screen.findByRole('menuitem', { name: "Lien de l'image" })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: 'Code forum' })).toBeDisabled()
    expect(screen.getByText('Rendez votre profil public pour intégrer cette image.')).toBeInTheDocument()
  })

  it('copies the forum code', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    renderBadge(profile(true))
    await user.click(screen.getByRole('button', { name: 'Partager' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Code forum' }))

    expect(writeText).toHaveBeenCalledWith(
      `[url=${location.origin}/profile/u1][img]https://storage.googleapis.com/test-bucket/passports/u1/badge.png[/img][/url]`)
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Code forum copié.'))
  })
})
