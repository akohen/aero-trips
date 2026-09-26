import { expect, test, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
// Not react-router/dom's RouterProvider (the app's): under vitest it resolves to another instance of the router context.
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router';
import { GeoPoint } from 'firebase/firestore';
import { Data } from '.';
import App from './App';


const testData: Data = {
  airfields: new Map([["LFNW", { codeIcao: "LFNW", name: "test", position: new GeoPoint(0, 1), runways: [], status:"CAP" }]]),
  activities: new Map([["XXXX", { id:"XXXX", name: "name", position: new GeoPoint(0, 0), type: ["other"], description: "description" }]]),
  trips: new Map(),
  events: new Map(),
  profile: undefined,
  authLoading: false,
  mapView: {center:[], zoom:0},
  setMapView: vi.fn()
}

test('renders learn react link', () => {
  render(<App {...testData} />, {wrapper: MemoryRouter});
  const linkElement = screen.getByText(/Bienvenue sur Aero trips/i);
  expect(linkElement).toBeDefined();
});

test('renders the list view', () => {
  render(
    <MemoryRouter initialEntries={['/airfields']}>
      <App {...testData}/>
    </MemoryRouter>,
  )
  expect(screen.getAllByText(/LFNW/)).toBeDefined()
})

test('goes to field list through the navbar', async () => {
  render(<App {...testData}/>, {wrapper: MemoryRouter});
  await userEvent.click(within(screen.getByRole('navigation')).getByRole('link', {name: /Terrains/i}));
  expect(await screen.getAllByText(/LFNW/i)).toBeDefined();
});
test('does not offer to log in while auth is still loading', () => {
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <App {...testData} authLoading/>
    </MemoryRouter>,
  )
  expect(screen.queryByText(/Se connecter avec Google/i)).toBeNull()
})

test('offers to log in once auth resolved without a user', () => {
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <App {...testData}/>
    </MemoryRouter>,
  )
  expect(screen.getByText(/Se connecter avec Google/i)).toBeDefined()
})

// Enough airfields for two pages, so a filter changes the page count and CardList/TableList rewrite `page`.
const manyAirfields: Data = {
  ...testData,
  airfields: new Map(Array.from({ length: 20 }, (_, i) => {
    const code = `LF${String.fromCharCode(65 + i)}A`
    return [code, { codeIcao: code, name: i === 0 ? 'LAVAL' : `TERRAIN ${i}`, position: new GeoPoint(0, i), runways: [], status: 'CAP' }]
  })),
}
const renderInRouter = (url: string) => {
  const router = createMemoryRouter([{ path: '*', element: <App {...manyAirfields} /> }], { initialEntries: [url] })
  render(<RouterProvider router={router} />)
  return router
}

test('keeps the filters in the URL when they change the page count', async () => {
  const router = renderInRouter('/airfields?page=2')
  // One change, like a chip click (typing would write the search back on the next keystroke)
  await userEvent.click(screen.getByPlaceholderText('Chercher un terrain'))
  await userEvent.paste('laval')
  const params = new URLSearchParams(router.state.location.search)
  expect(params.get('adSearch')).toBe('laval')
  expect(params.get('page')).toBe('1')
  expect(screen.getByPlaceholderText('Chercher un terrain')).toHaveValue('laval')
})

test('restores the last filters when coming back to the list from the navbar', async () => {
  const router = renderInRouter('/airfields?adSearch=laval')
  await act(() => router.navigate('/trips'))
  await act(() => router.navigate('/airfields'))
  expect(new URLSearchParams(router.state.location.search).get('adSearch')).toBe('laval')
  expect(screen.getByPlaceholderText('Chercher un terrain')).toHaveValue('laval')
})
