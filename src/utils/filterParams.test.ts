import { describe, expect, test } from 'vitest';
import {
  EMPTY_ACTIVITY_FILTERS, EMPTY_AIRFIELD_FILTERS, hasActivityFilters, hasAirfieldFilters,
  parseActivityFilters, parseAirfieldFilters, writeActivityFilters, writeAirfieldFilters,
} from './filterParams';

describe('airfield filters', () => {
  test('parse the empty query as empty filters', () => {
    expect(parseAirfieldFilters(new URLSearchParams())).toEqual(EMPTY_AIRFIELD_FILTERS)
  })

  test('round-trip through the query string', () => {
    const filters = { search: 'laval', services: ['fuel', 'food'], ad: ['concrete'], runway: 800, distance: 50, target: 'airfields/LFOV' }
    const params = writeAirfieldFilters(new URLSearchParams(), filters)
    expect(params.toString()).toBe('adSearch=laval&adServices=fuel%2Cfood&adMisc=concrete&rwyLen=800&adDist=50&adTgt=airfields%2FLFOV')
    expect(parseAirfieldFilters(params)).toEqual(filters)
  })

  test('drop cleared filters and keep unrelated params', () => {
    const params = new URLSearchParams('page=3&adSearch=laval&rwyLen=800&s=crepe')
    writeAirfieldFilters(params, { ...EMPTY_AIRFIELD_FILTERS, runway: 800 })
    expect(params.toString()).toBe('page=3&rwyLen=800&s=crepe')
  })

  test('ignore malformed numbers', () => {
    expect(parseAirfieldFilters(new URLSearchParams('rwyLen=abc&adDist=')).runway).toBe('')
  })

  test('tell whether any filter is set', () => {
    expect(hasAirfieldFilters(EMPTY_AIRFIELD_FILTERS)).toBe(false)
    expect(hasAirfieldFilters({ ...EMPTY_AIRFIELD_FILTERS, ad: ['upcomingEvents'] })).toBe(true)
  })
})

describe('activity filters', () => {
  test('parse the empty query as empty filters', () => {
    expect(parseActivityFilters(new URLSearchParams())).toEqual(EMPTY_ACTIVITY_FILTERS)
  })

  test('round-trip through the query string', () => {
    const filters = { search: 'crepe', type: ['food'], distance: 5, target: 'airfields/LFOV' }
    const params = writeActivityFilters(new URLSearchParams('page=2'), filters)
    expect(parseActivityFilters(params)).toEqual(filters)
    expect(params.get('page')).toBe('2')
  })

  test('tell whether any filter is set', () => {
    expect(hasActivityFilters(EMPTY_ACTIVITY_FILTERS)).toBe(false)
    expect(hasActivityFilters({ ...EMPTY_ACTIVITY_FILTERS, search: 'x' })).toBe(true)
  })
})
