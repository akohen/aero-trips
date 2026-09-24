import { describe, expect, it } from 'vitest'
import type { Activity, Airfield } from '..'
import { buildEmbedHtml, buildEmbedSnippet, embedUrl, runwayPlanSvg } from './embedWidget'

// Shapes taken from src/data/airfields.json (LFBE) and activities.json
const lfbe = {
  codeIcao: 'LFBE',
  name: 'BERGERAC DORDOGNE PERIGORD',
  status: 'CAP',
  position: { latitude: 44.825, longitude: 0.518 },
  runways: [
    { designation: '09R/27L', length: 770, composition: 'GRASS' },
    { designation: '09/27', length: 2205, composition: 'CONC+ASPH' },
  ],
  description: {
    type: 'doc',
    content: [{ type: 'image', attrs: { src: 'https://firebasestorage.googleapis.com/v0/b/x/o/img%2Fa?alt=media&token=t', alt: null } }],
  },
} as unknown as Airfield

const act = (id: string, type: string[], name = id) =>
  ({ id, name, type, position: { latitude: 44.85, longitude: 0.48 } }) as unknown as Activity
const nearby: [number, Activity, string][] = [
  [2256, act('ludik', ['lodging', 'food', 'other']), 'ludik'],
  [2696, act('oxobikes', ['bike']), 'oxobikes'],
  [4223, act('table', ['food']), 'table'],
  [4282, act('musee', ['culture']), 'musee'],
]

describe('buildEmbedHtml', () => {
  const html = buildEmbedHtml(lfbe, nearby)

  it('titles the widget with the display name, not the uppercase data name', () => {
    expect(html).toContain('À faire autour de Bergerac Dordogne Perigord')
  })

  it('counts each need group, an activity counting in every group it matches', () => {
    expect(html).toContain('2 restaurants')
    expect(html).toContain('1 hébergement')
    expect(html).toContain('2 activités') // ludik (other) + musee
    expect(html).toContain('1 transport') // bike rental
  })

  it('links the CTA to the airfield page with utm attribution', () => {
    expect(html).toContain('Voir les 4 adresses')
    expect(html).toContain('https://aerotrips.fr/airfields/LFBE?utm_source=widget&utm_medium=embed&utm_campaign=LFBE')
  })

  it('shows the airfield photo when the description has one', () => {
    expect(html).toContain('<img src="https://firebasestorage.googleapis.com/v0/b/x/o/img%2Fa?alt=media&amp;token=t"')
    expect(html).not.toContain('class="plan"')
  })

  it('falls back to the runway plan without a photo', () => {
    const noPhoto = buildEmbedHtml({ ...lfbe, description: undefined }, nearby)
    expect(noPhoto).not.toContain('<img')
    expect(noPhoto).toContain('class="plan"')
    expect(noPhoto).toContain('class="v np"')
  })

  it('ignores a non-https photo URL', () => {
    const bad = { ...lfbe, description: { type: 'doc', content: [{ type: 'image', attrs: { src: 'javascript:alert(1)' } }] } }
    expect(buildEmbedHtml(bad as Airfield, nearby)).not.toContain('javascript:')
  })

  it('turns into a contribution prompt when nothing is listed nearby', () => {
    const empty = buildEmbedHtml(lfbe, [])
    expect(empty).toContain('Aucune adresse recensée')
    expect(empty).toContain('Ajouter une adresse')
    expect(empty).toContain('https://aerotrips.fr/edit/44.825/0.518?utm_source=widget')
  })

  it('is standalone: noindex, links open outside the iframe, no analytics', () => {
    expect(html).toContain('<meta name="robots" content="noindex">')
    expect(html).toContain('<base target="_blank">')
    expect(html).not.toMatch(/gtag|googletagmanager/)
  })

  it('escapes names from the data', () => {
    const evil = buildEmbedHtml({ ...lfbe, name: '<script>x</script>' }, nearby)
    expect(evil).not.toContain('<script>x')
  })
})

describe('runwayPlanSvg', () => {
  it('offsets parallel runways and labels the longest one', () => {
    const svg = runwayPlanSvg(lfbe.runways)
    expect(svg.match(/<rect/g)).toHaveLength(2)
    expect(svg).toContain('class="ru"') // grass drawn as outline
    expect(svg).toContain('class="rp"')
    expect(svg).toContain('>09<')
    expect(svg).toContain('>27<')
  })

  it('places thresholds at the end you land from, whatever the designation order', () => {
    const x = (svg: string, label: string) => Number(svg.match(new RegExp(`x="([\\d.]+)" y="[\\d.]+">${label}<`))![1])
    const a = runwayPlanSvg([{ designation: '09/27', length: 1000 }])
    const b = runwayPlanSvg([{ designation: '27/09', length: 1000 }])
    expect(x(a, '09')).toBeLessThan(x(a, '27')) // 09 at the west end
    expect(x(b, '09')).toBeLessThan(x(b, '27'))
  })

  it('skips runways without a usable designation', () => {
    expect(runwayPlanSvg([{ length: 800 }])).toBe('')
    expect(runwayPlanSvg([{ designation: 32 as unknown as string, length: 800 }])).toContain('<rect')
  })
})

describe('embedUrl', () => {
  it('builds absolute or same-origin widget URLs', () => {
    expect(embedUrl('LFBE')).toBe('https://aerotrips.fr/embed/LFBE')
    expect(embedUrl('LFBE', { theme: 'dark' }, '')).toBe('/embed/LFBE?theme=dark')
  })
})

describe('buildEmbedSnippet', () => {
  it('adds the plain backlink after the iframe', () => {
    const s = buildEmbedSnippet(lfbe)
    expect(s).toContain('<iframe src="https://aerotrips.fr/embed/LFBE"')
    expect(s).toContain('<a href="https://aerotrips.fr/airfields/LFBE">')
  })

  it('passes theme and a validated accent', () => {
    expect(buildEmbedSnippet(lfbe, { theme: 'dark', accent: '#0F766E' })).toContain('/embed/LFBE?theme=dark&accent=0F766E')
    expect(buildEmbedSnippet(lfbe, { accent: 'red;x' })).toContain('/embed/LFBE"')
  })
})
