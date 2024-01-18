import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import App from './App';
import { MemoryRouter } from 'react-router-dom';
import { DataContext } from './DataProvider';

const testWrapper = ({ children }: { children: React.ReactNode } ) => (
  <MemoryRouter><DataContext.Provider value={{airfields:[{codeIcao:"LFNW"}]}}>{children}</DataContext.Provider></MemoryRouter>
)

test('renders learn react link', () => {
  render(<App />, {wrapper: MemoryRouter});
  const linkElement = screen.getByText(/learn more/i);
  expect(linkElement).toBeDefined();
});

test('renders the list view', () => {
  render(
    <MemoryRouter initialEntries={['/fields']}>
      <DataContext.Provider value={{airfields:[{codeIcao:"LFNW"}]}}>
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