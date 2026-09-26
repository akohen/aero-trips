import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MantineProvider } from '@mantine/core'
import { GeoPoint } from 'firebase/firestore'
import type { Airfield, Profile } from '..'
import PassportMap from './PassportMap'

vi.mock('../data/firebase', () => ({ storageBucket: 'test-bucket' }))

const airfield = (codeIcao: string, lat: number, lon: number) =>
  [codeIcao, { codeIcao, name: codeIcao, position: new GeoPoint(lat, lon), runways: [], status: 'CAP' }] as [string, Airfield]
const airfields = new Map([airfield('LFPN', 48.75, 2.11), airfield('LFAT', 50.51, 1.63)])

const profile: Profile = {
  uid: 'u1',
  displayName: 'Camille',
  email: 'camille@example.com',
  homebase: 'LFPN',
  passportPublic: true,
  visited: [{ type: 'airfields', id: 'LFAT' }, { type: 'activities', id: 'x' }],
  update: vi.fn(),
}

afterEach(cleanup)

describe('PassportMap', () => {
  it('draws the map on demand and offers the hosted link', async () => {
    render(<MantineProvider env="test"><PassportMap profile={profile} airfields={airfields} /></MantineProvider>)
    expect(await screen.findByAltText('Carte : 1 terrain visité')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Partager' }))
    expect(await screen.findByRole('menuitem', { name: 'Télécharger' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: "Lien de l'image" })).toBeEnabled()
    expect(screen.queryByRole('menuitem', { name: 'Code forum' })).not.toBeInTheDocument()
  })
})
