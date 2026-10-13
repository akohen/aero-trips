import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import type { Airfield, Data, Profile } from '..'
import AdminChanges from './AdminChanges'

const fb = vi.hoisted(() => ({
  admin: true,
  changes: [] as { id: string, data: Record<string, unknown> }[],
  targets: {} as Record<string, Record<string, unknown> | undefined>,
  apply: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('../data/firebase', () => ({
  db: {},
  googleLogin: vi.fn(),
  auth: { currentUser: { uid: 'u1', getIdTokenResult: async () => ({ claims: fb.admin ? { admin: true } : {} }) } },
}))
vi.mock('../components/Description', () => ({ default: () => <div>description rendue</div> }))
vi.mock('firebase/app', () => ({ getApp: () => ({}) }))
vi.mock('firebase/functions', () => ({ getFunctions: () => ({}), httpsCallable: () => fb.apply }))
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, path: string) => path,
  doc: (_db: unknown, ...path: string[]) => path.join('/'),
  getDocs: async () => ({
    docs: fb.changes.map(c => ({ id: c.id, data: () => c.data, get: (f: string) => c.data[f] })),
  }),
  getDoc: async (path: string) => ({ exists: () => !!fb.targets[path], data: () => fb.targets[path] }),
  deleteDoc: (path: string) => fb.remove(path),
}))

const at = (day: number) => ({ toDate: () => new Date(Date.UTC(2026, 9, day, 10)) })

const profile: Profile = { uid: 'u1', displayName: 'Admin', email: 'a@b.fr', update: vi.fn() }

const Where = () => <div data-testid="where">{useLocation().pathname}</div>

const renderPage = (path = '/admin/changes', p: Profile | null = profile) => {
  const data: Data = {
    airfields: new Map<string, Airfield>([['LFOV', { codeIcao: 'LFOV', name: 'LAVAL ENTRAMMES', runways: [], status: 'CAP' } as unknown as Airfield]]),
    activities: new Map(),
    trips: new Map(),
    events: new Map(),
    profile: p ?? undefined,
    authLoading: false,
    mapView: { center: [], zoom: 0 },
    setMapView: vi.fn(),
  }
  return render(<MantineProvider env="test"><MemoryRouter initialEntries={[path]}>
    <Routes><Route path="/admin/changes/:changeId?" element={<><AdminChanges {...data} /><Where /></>} /></Routes>
  </MemoryRouter></MantineProvider>)
}

beforeEach(() => {
  fb.admin = true
  fb.changes = [
    { id: 'edit', data: { targetDocument: 'airfields/LFOV', website: 'https://new.test', fuels: ['100LL'], updated_by: 'anonymous', updated_at: at(2) } },
    { id: 'contact', data: { targetDocument: 'contacts/x@y.fr', email: 'x@y.fr', message: 'Bonjour !', updated_at: at(3) } },
    { id: 'resto', data: { targetDocument: 'activities/resto', name: 'Le Resto', updated_at: at(1) } },
    { id: 'bad', data: { targetDocument: 'profiles/alice', updated_at: at(4) } },
  ]
  fb.targets = { 'airfields/LFOV': { codeIcao: 'LFOV', website: 'https://old.test', fuels: ['100LL'] } }
  fb.apply.mockReset().mockResolvedValue({ data: { targetDocument: 'airfields/LFOV' } })
  fb.remove.mockReset().mockResolvedValue(undefined)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('AdminChanges', () => {
  it('is closed to non-admins', async () => {
    fb.admin = false
    renderPage()
    expect(await screen.findByText(/réservée aux administrateurs/)).toBeInTheDocument()
    expect(screen.queryByText(/Modifications en attente/)).toBeNull()
  })

  it('asks signed-out visitors to sign in', () => {
    renderPage('/admin/changes', null)
    expect(screen.getByRole('button', { name: /Se connecter avec Google/ })).toBeInTheDocument()
  })

  it('lists the pending changes, oldest first', async () => {
    renderPage()
    expect(await screen.findByText('Modifications en attente (4)')).toBeInTheDocument()
    const links = screen.getAllByRole('link').map(l => l.textContent)
    expect(links[0]).toMatch(/^Le Resto.*Activité · nouveau/)
    expect(links[1]).toMatch(/^LFOV Laval Entrammes.*Terrain · modification/)
    expect(links[2]).toMatch(/^Message de x@y\.fr.*Message/)
    expect(links[3]).toMatch(/^Changement invalide.*Invalide/)
  })

  it('shows only the modified fields and applies the change', async () => {
    renderPage('/admin/changes/edit')
    const website = await screen.findByText('website')
    const card = website.closest('div')!.parentElement!
    expect(within(card).getByText('https://old.test')).toBeInTheDocument()
    expect(within(card).getByText('https://new.test')).toBeInTheDocument()
    expect(screen.queryByText('fuels')).toBeNull()
    expect(screen.queryByText('updated_by')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Appliquer' }))
    expect(fb.apply).toHaveBeenCalledWith({ id: 'edit' })
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/admin/changes/contact'))
    expect(screen.getByText('Modifications en attente (3)')).toBeInTheDocument()
  })

  it('keeps the change and shows the error when applying fails', async () => {
    fb.apply.mockRejectedValue(new Error('Ce changement a déjà été traité'))
    renderPage('/admin/changes/edit')
    await userEvent.click(await screen.findByRole('button', { name: 'Appliquer' }))
    expect(await screen.findByText('Ce changement a déjà été traité')).toBeInTheDocument()
    expect(screen.getByText('Modifications en attente (4)')).toBeInTheDocument()
  })

  it('lists every field of a new document', async () => {
    renderPage('/admin/changes/resto')
    expect(await screen.findByText('name')).toBeInTheDocument()
    expect(screen.queryByText('Actuel')).toBeNull()
    expect(screen.getAllByText('Le Resto').length).toBeGreaterThan(1)
  })

  it('never applies a change to an airfield that does not exist', async () => {
    fb.changes = [{ id: 'ghost', data: { targetDocument: 'airfields/LFZZ', website: 'x', updated_at: at(1) } }]
    renderPage('/admin/changes/ghost')
    expect(await screen.findByText('Cible introuvable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Appliquer' })).toBeDisabled()
  })

  it('reads contact messages, which can only be answered or deleted', async () => {
    vi.stubGlobal('confirm', () => true)
    renderPage('/admin/changes/contact')
    expect(await screen.findByText('Bonjour !')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Appliquer' })).toBeNull()
    expect(screen.getByRole('link', { name: /Répondre/ })).toHaveAttribute('href', expect.stringMatching(/^mailto:x@y\.fr\?/))
    await userEvent.click(screen.getByRole('button', { name: /Supprimer/ }))
    expect(fb.remove).toHaveBeenCalledWith('changes/contact')
    await waitFor(() => expect(screen.getByText('Modifications en attente (3)')).toBeInTheDocument())
  })

  it('deletes nothing without confirmation', async () => {
    vi.stubGlobal('confirm', () => false)
    renderPage('/admin/changes/bad')
    await userEvent.click(await screen.findByRole('button', { name: /Supprimer/ }))
    expect(fb.remove).not.toHaveBeenCalled()
  })
})
