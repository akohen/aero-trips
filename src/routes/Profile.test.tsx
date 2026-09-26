import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router'
import { GeoPoint } from 'firebase/firestore'
import type { Airfield, Data, Profile as ProfileType } from '..'
import Profile from './Profile'

vi.mock('../data/firebase', () => ({ storageBucket: 'test-bucket', googleLogin: vi.fn() }))

const airfield = (codeIcao: string, name: string): [string, Airfield] =>
  [codeIcao, { codeIcao, name, position: new GeoPoint(48, 2), runways: [], status: 'CAP' }]

const profile = (changes: Partial<ProfileType> = {}): ProfileType => ({
  uid: 'u1',
  displayName: 'Camille',
  email: 'camille@example.com',
  update: vi.fn().mockResolvedValue(undefined),
  ...changes,
})

const renderProfile = (p?: ProfileType, authLoading = false) => {
  const data: Data = {
    airfields: new Map([airfield('LFPZ', 'SAINT CYR L ECOLE'), airfield('LFAT', 'LE TOUQUET')]),
    activities: new Map(),
    trips: new Map(),
    events: new Map(),
    profile: p,
    authLoading,
    mapView: { center: [], zoom: 0 },
    setMapView: vi.fn(),
  }
  return render(<MantineProvider env="test"><MemoryRouter><Profile {...data} /></MemoryRouter></MantineProvider>)
}

afterEach(cleanup)

describe('Profile', () => {
  it('shows a loader, not the login button, while auth resolves', () => {
    renderProfile(undefined, true)
    expect(screen.queryByText(/Se connecter avec Google/)).toBeNull()
  })

  it('sorts visited airfields by ICAO code', () => {
    renderProfile(profile({ visited: [{ type: 'airfields', id: 'LFPZ' }, { type: 'airfields', id: 'LFAT' }] }))
    const links = screen.getAllByRole('link').map(l => l.textContent).filter(t => /^LF/.test(t ?? ''))
    expect(links).toEqual([expect.stringMatching(/^LFAT/), expect.stringMatching(/^LFPZ/)])
  })

  it('only renders non-empty sections', () => {
    renderProfile(profile({ visited: [{ type: 'airfields', id: 'LFAT' }] }))
    expect(screen.getByText('Terrains visités (1)')).toBeInTheDocument()
    expect(screen.queryByText(/Sorties partagées/)).toBeNull()
    expect(screen.queryByText(/ni terrain visité/)).toBeNull()
  })

  it('explains what to do when there is nothing to show', () => {
    renderProfile(profile())
    expect(screen.getByText(/ni terrain visité, ni favori, ni sortie partagée/)).toBeInTheDocument()
  })

  it('names a missing activity as such', () => {
    renderProfile(profile({ favorites: [{ type: 'activities', id: 'gone' }] }))
    expect(screen.getByText('Activité inconnue')).toBeInTheDocument()
  })

  it('confirms a saved profile', async () => {
    renderProfile(profile())
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('Vos informations ont été enregistrées.')).toBeInTheDocument()
  })

  it('reports a failed save', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderProfile(profile({ update: vi.fn().mockRejectedValue(new Error('offline')) }))
    await userEvent.click(screen.getByRole('switch', { name: 'Rendre mon profil public' }))
    expect(await screen.findByText('Une erreur est survenue, veuillez réessayer.')).toBeInTheDocument()
  })
})
