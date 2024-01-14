import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import App from './App';
import { MemoryRouter } from 'react-router-dom';

test('renders learn react link', () => {
  render(<App />, {wrapper: MemoryRouter});
  const linkElement = screen.getByText(/learn more/i);
  expect(linkElement).toBeDefined();
});

test('renders the list view', () => {
  render(
    <MemoryRouter initialEntries={['/fields']}>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByText(/LFPZ/)).toBeDefined()
})

test('goes to field list through the navbar', async () => {
  render(<App />, {wrapper: MemoryRouter});
  await userEvent.click(screen.getByText(/terrains/i));
  expect(await screen.getByText(/LFPZ/i)).toBeDefined();
});