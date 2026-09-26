import { ADfilter, ActivityFilter } from '..';

// The airfield and activity filters live in the query string, so a filtered list can be shared.
// The URL is their only source of truth: App derives the filters from it on every render.

export const EMPTY_AIRFIELD_FILTERS: ADfilter = { search: '', services: [], ad: [], runway: '', distance: '', target: null }
export const EMPTY_ACTIVITY_FILTERS: ActivityFilter = { search: '', type: [], distance: '', target: null }

const list = (value: string | null) => value ? value.split(',') : []
const num = (value: string | null) => {
  const n = value ? parseInt(value) : NaN
  return isNaN(n) ? '' : n
}
const put = (params: URLSearchParams, key: string, value: string | number | null | undefined) => {
  if (value) params.set(key, value.toString())
  else params.delete(key)
}

export const parseAirfieldFilters = (params: URLSearchParams): ADfilter => ({
  search: params.get('adSearch') || '',
  services: list(params.get('adServices')),
  ad: list(params.get('adMisc')),
  runway: num(params.get('rwyLen')),
  distance: num(params.get('adDist')),
  target: params.get('adTgt') || null,
})

export const writeAirfieldFilters = (params: URLSearchParams, filters: ADfilter) => {
  put(params, 'adSearch', filters.search)
  put(params, 'adServices', filters.services.join(','))
  put(params, 'adMisc', filters.ad.join(','))
  put(params, 'rwyLen', filters.runway)
  put(params, 'adDist', filters.distance)
  put(params, 'adTgt', filters.target)
  return params
}

export const parseActivityFilters = (params: URLSearchParams): ActivityFilter => ({
  search: params.get('s') || '',
  type: list(params.get('t')),
  distance: num(params.get('d')),
  target: params.get('a') || null,
})

export const writeActivityFilters = (params: URLSearchParams, filters: ActivityFilter) => {
  put(params, 's', filters.search)
  put(params, 't', filters.type.join(','))
  put(params, 'd', filters.distance)
  put(params, 'a', filters.target)
  return params
}

export const hasAirfieldFilters = (filters: ADfilter) => writeAirfieldFilters(new URLSearchParams(), filters).toString() !== ''
export const hasActivityFilters = (filters: ActivityFilter) => writeActivityFilters(new URLSearchParams(), filters).toString() !== ''
