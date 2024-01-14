import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn more/i);
  screen.logTestingPlaygroundURL()
  expect(linkElement).toBeDefined();
});
