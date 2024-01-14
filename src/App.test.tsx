import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    <MemoryRouter initialEntries={['/list']}>
      <App />
    </MemoryRouter>,
  )
  expect(screen.getByText(/LFPZ/)).toBeDefined()
})