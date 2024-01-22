import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom';
import { GeoPoint } from 'firebase/firestore';
import { Data } from './types';
import App from './App';


const testData: Data = {
  airfields: new Map([["LFNW", { codeIcao: "LFNW", name: "test", position: new GeoPoint(0, 0), runways: [] }]]),
  activities: new Map([["XXXX", { name: "name", position: new GeoPoint(0, 0), type: ["other"], description: "description" }]]),
  trips: new Map(),
  saveChange: vi.fn(),
}

test('renders learn react link', () => {
  render(<App {...testData} />, {wrapper: MemoryRouter});
  const linkElement = screen.getByText(/learn more/i);
  expect(linkElement).toBeDefined();
});

test('renders the list view', () => {
  render(
    <MemoryRouter initialEntries={['/airfields']}>
      <App {...testData}/>
    </MemoryRouter>,
  )
  expect(screen.getByText(/LFNW/)).toBeDefined()
})

test('goes to field list through the navbar', async () => {
  render(<App {...testData}/>, {wrapper: MemoryRouter});
  await userEvent.click(screen.getByText(/terrains/i));
  expect(await screen.getByText(/LFNW/i)).toBeDefined();
});