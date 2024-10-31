import { expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom';
import { GeoPoint } from 'firebase/firestore';
import { Data } from '.';
import App from './App';


const testData: Data = {
  airfields: new Map([["LFNW", { codeIcao: "LFNW", name: "test", position: new GeoPoint(0, 1), runways: [], status:"CAP" }]]),
  activities: new Map([["XXXX", { id:"XXXX", name: "name", position: new GeoPoint(0, 0), type: ["other"], description: "description" }]]),
  trips: new Map(),
  profile: undefined,
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