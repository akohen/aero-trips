import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom';
import { GeoPoint } from 'firebase/firestore';
import { Airfield, Data } from './types';
import App from './App';

const testAirport: Airfield = {codeIcao:"LFNW", name:"test", position: new GeoPoint(0,0), runways: []}
const testData: Data = {airfields:[testAirport], activities:[{ id:"xxx", name:"name", position: new GeoPoint(0,0), type:["other"], description:"description"}]}

test('renders learn react link', () => {
  render(<App data={testData}/>, {wrapper: MemoryRouter});
  const linkElement = screen.getByText(/learn more/i);
  expect(linkElement).toBeDefined();
});

test('renders the list view', () => {
  render(
    <MemoryRouter initialEntries={['/airfields']}>
      <App data={testData}/>
    </MemoryRouter>,
  )
  expect(screen.getByText(/LFNW/)).toBeDefined()
})

test('goes to field list through the navbar', async () => {
  render(<App data={testData}/>, {wrapper: MemoryRouter});
  await userEvent.click(screen.getByText(/terrains/i));
  expect(await screen.getByText(/LFNW/i)).toBeDefined();
});