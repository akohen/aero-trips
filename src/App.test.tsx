import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import App from './App';
import { MemoryRouter } from 'react-router-dom';
import { DataContext } from './DataProvider';
import { GeoPoint } from 'firebase/firestore';
import { Airfield } from './types';

const testAirport: Airfield = {codeIcao:"LFNW", position: new GeoPoint(0,0), runways: []}
const testWrapper = ({ children }: { children: React.ReactNode } ) => (
  <MemoryRouter><DataContext.Provider value={{airfields:[testAirport]}}>{children}</DataContext.Provider></MemoryRouter>
)

test('renders learn react link', () => {
  render(<App />, {wrapper: MemoryRouter});
  const linkElement = screen.getByText(/learn more/i);
  expect(linkElement).toBeDefined();
});

test('renders the list view', () => {
  render(
    <MemoryRouter initialEntries={['/fields']}>
      <DataContext.Provider value={{airfields:[testAirport]}}>
        <App />
      </DataContext.Provider>
    </MemoryRouter>,
  )
  expect(screen.getByText(/LFNW/)).toBeDefined()
})

test('goes to field list through the navbar', async () => {
  render(<App />, {wrapper: testWrapper});
  await userEvent.click(screen.getByText(/terrains/i));
  expect(await screen.getByText(/LFNW/i)).toBeDefined();
});