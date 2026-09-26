import { useEffect, useState } from "react"
import { Airfield } from ".."

export interface MapInput {
  displayName?: string
  homebase?: string
  /** Distinct visited airfield codes */
  visited: string[]
  airfields: Map<string, Airfield>
}

/**
 * Builds the passport map SVG client-side. The builder and the France outline
 * are loaded on demand, keeping them out of the eager profile bundle.
 */
export const usePassportMapSvg = ({ displayName, homebase, visited, airfields }: MapInput, enabled = true) => {
  const [svg, setSvg] = useState<string>()
  const key = `${displayName}|${homebase}|${visited.join(',')}|${airfields.size}`

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    import("../utils/passportMap").then(({ buildPassportMap }) => {
      const at = (code: string) => {
        const p = airfields.get(code)?.position
        return p ? { lat: p.latitude, lon: p.longitude } : undefined
      }
      const map = buildPassportMap({
        displayName,
        homebase,
        home: homebase ? at(homebase) : undefined,
        visitedCount: visited.length,
        visited: visited.flatMap(code => at(code) ?? []),
      })
      if (!cancelled) setSvg(map.svg)
    }).catch(e => console.error('[PassportMap]', e))
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])

  return svg
}
