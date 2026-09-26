import { describe, expect, it } from 'vitest'
import type { Activity, Airfield } from '..'
import { buildItemSeo, countFood, nearbyActivitiesHeading } from './itemSeo'

const lfov = {
  codeIcao: 'LFOV',
  name: 'LAVAL ENTRAMMES',
  status: 'CAP',
  position: { latitude: 48.03, longitude: -0.74 },
  runways: [],
} as unknown as Airfield

const activity = (id: string, type: string[]) =>
  ({ id, name: id, type, position: { latitude: 48.05, longitude: -0.75 } }) as unknown as Activity

describe('countFood', () => {
  it('counts activities tagged food, including multi-type ones', () => {
    const nearby: [number, Activity, string][] = [
      [100, activity('a', ['food']), 'a'],
      [200, activity('b', ['lodging', 'food']), 'b'],
      [300, activity('c', ['bike']), 'c'],
    ]
    expect(countFood(nearby)).toBe(2)
  })
})

describe('airfield title and heading', () => {
  it('mention restaurants when there are some nearby', () => {
    expect(buildItemSeo(lfov, { nearbyFoodCount: 2 }).title)
      .toBe('Aérodrome de Laval Entrammes (LFOV) : restaurants et activités à proximité | AeroTrips')
    expect(nearbyActivitiesHeading(lfov, 2))
      .toBe("Restaurants et activités près de l'aérodrome de Laval Entrammes")
  })

  it('never promise restaurants that are not listed', () => {
    const { title, description } = buildItemSeo(lfov, { nearbyFoodCount: 0 })
    expect(title).toBe('Aérodrome de Laval Entrammes (LFOV) : que faire à proximité | AeroTrips')
    expect(description).not.toContain('restaurant')
    expect(nearbyActivitiesHeading(lfov, 0)).toBe("Activités près de l'aérodrome de Laval Entrammes")
  })

  it('keep the generic heading on activity pages', () => {
    expect(nearbyActivitiesHeading(activity('x', ['food']), 3)).toBe('Activités à proximité')
  })
})
