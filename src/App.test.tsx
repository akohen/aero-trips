import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom';
import { GeoPoint } from 'firebase/firestore';
import { Data } from '.';
import App from './App';


const testData: Data = {
  airfields: new Map([["LFNW", { codeIcao: "LFNW", name: "test", position: new GeoPoint(0, 1), runways: [], status:"CAP" }]]),
  activities: new Map([["XXXX", { name: "name", position: new GeoPoint(0, 0), type: ["other"], description: "description" }]]),
  trips: new Map(),
  profile: null,
  setProfile: vi.fn(),
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
  await userEvent.click(screen.getByText(/Terrains/));
  expect(await screen.getAllByText(/LFNW/i)).toBeDefined();
});