import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router'
import { GeoPoint, Timestamp } from 'firebase/firestore'
import type { Airfield, Data, Profile as ProfileType, Report } from '..'
import Profile from './Profile'

vi.mock('../data/firebase', () => ({ storageBucket: 'test-bucket', googleLogin: vi.fn() }))
const userReports = vi.hoisted(() => ({ list: undefined as Report[] | undefined }))
vi.mock('../hooks/useReports', () => ({ useUserReports: () => ({ reports: userReports.list, add: vi.fn() }) }))

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

afterEach(() => { cleanup(); vi.unstubAllGlobals(); userReports.list = undefined })

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

  it('lists visits with their reports, latest first, then airfields with no report', () => {
    userReports.list = [{
      id: 'r1', target: { type: 'airfields', id: 'LFPZ' }, source: { type: 'pilot' }, uid: 'u1', author: 'Camille',
      observedAt: Timestamp.fromDate(new Date(Date.UTC(2026, 8, 12))), updated_at: Timestamp.now(),
      text: 'Accueil sympa', landingFee: { amount: 10 }, aircraftClass: 'light',
    }]
    renderProfile(profile({ visited: [{ type: 'airfields', id: 'LFPZ' }, { type: 'airfields', id: 'LFAT' }] }))
    const links = screen.getAllByRole('link').map(l => l.textContent).filter(t => /^LF/.test(t ?? ''))
    expect(links).toEqual([expect.stringMatching(/^LFPZ/), expect.stringMatching(/^LFAT/)])
    expect(screen.getByRole('link', { name: /Visite du 12\/09\/2026 · Taxe payée : 10/ })).toHaveAttribute('href', '/airfields/LFPZ#report-r1')
    expect(screen.queryByText('Accueil sympa')).toBeNull()
  })

  it('shows the first visits, the rest on demand, and filters the whole list', async () => {
    const visited = Array.from({ length: 30 }, (_, i) => ({ type: 'airfields' as const, id: `LF${String(i).padStart(2, '0')}` }))
    renderProfile(profile({ visited }))
    const visits = () => screen.getAllByRole('listitem').filter(li => /^(LF|Terrain)/.test(li.textContent ?? ''))
    expect(visits()).toHaveLength(15)
    await userEvent.type(screen.getByPlaceholderText(/Filtrer/), 'lf2')
    expect(visits()).toHaveLength(10)
    await userEvent.clear(screen.getByPlaceholderText(/Filtrer/))
    await userEvent.click(screen.getByRole('button', { name: 'Voir les 15 autres terrains' }))
    expect(visits()).toHaveLength(30)
  })

  it('counts the passport airfields and offers to mark a reported one as visited', async () => {
    userReports.list = [{
      id: 'r1', target: { type: 'airfields', id: 'LFAT' }, source: { type: 'pilot' }, uid: 'u1',
      observedAt: Timestamp.now(), updated_at: Timestamp.now(), text: 'Bien',
    }]
    const p = profile({ visited: [{ type: 'airfields', id: 'LFPZ' }] })
    renderProfile(p)
    expect(screen.getByText('Terrains visités (1)')).toBeInTheDocument()
    expect(screen.getByText(/Pas dans votre passeport/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Marquer comme visité' }))
    expect(p.update).toHaveBeenCalledWith({ visited: [{ type: 'airfields', id: 'LFPZ' }, { type: 'airfields', id: 'LFAT' }] })
  })

  it('shows the map next to the visits only once there are some', () => {
    renderProfile(profile())
    expect(screen.getAllByText('Ma carte')).toHaveLength(1) // the share block in « Profil public »
    cleanup()
    renderProfile(profile({ visited: [{ type: 'airfields', id: 'LFAT' }] }))
    expect(screen.getAllByText('Ma carte')).toHaveLength(2)
  })

  it('only renders non-empty sections', () => {
    renderProfile(profile({ visited: [{ type: 'airfields', id: 'LFAT' }] }))
    expect(screen.getByText('Terrains visités (1)')).toBeInTheDocument()
    expect(screen.queryByText(/Sorties partagées/)).toBeNull()
  })

  it('explains what visited airfields are for when there are none', () => {
    renderProfile(profile())
    expect(screen.getByText('Terrains visités (0)')).toBeInTheDocument()
    expect(screen.getByText(/rejoint votre passeport de pilote/)).toBeInTheDocument()
  })

  it('adds the picked airfields to the visited ones in one write', async () => {
    const p = profile({ visited: [{ type: 'airfields', id: 'LFPZ' }] })
    renderProfile(p)
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter plusieurs terrains sans compte rendu' }))
    await userEvent.click(screen.getByPlaceholderText(/Terrains visités/))
    expect(screen.queryByRole('option', { name: /LFPZ/ })).toBeNull()
    await userEvent.click(await screen.findByRole('option', { name: /LFAT/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(p.update).toHaveBeenCalledWith({ visited: [{ type: 'airfields', id: 'LFPZ' }, { type: 'airfields', id: 'LFAT' }] })
    expect(await screen.findByText(/1 terrain ajouté à votre passeport. Ajoutez un compte rendu/)).toBeInTheDocument()
  })

  it('removes a visited airfield without reports', async () => {
    userReports.list = [{
      id: 'r1', target: { type: 'airfields', id: 'LFPZ' }, source: { type: 'pilot' }, uid: 'u1',
      observedAt: Timestamp.now(), updated_at: Timestamp.now(), text: 'Bien',
    }]
    const p = profile({ visited: [{ type: 'airfields', id: 'LFPZ' }, { type: 'airfields', id: 'LFAT' }] })
    renderProfile(p)
    expect(screen.queryByRole('button', { name: 'Retirer LFPZ des terrains visités' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Retirer LFAT des terrains visités' }))
    expect(p.update).toHaveBeenCalledWith({ visited: [{ type: 'airfields', id: 'LFPZ' }] })
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
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('Une erreur est survenue, veuillez réessayer.')).toBeInTheDocument()
  })
})
