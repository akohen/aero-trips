// Lambert-93 (EPSG:2154), the official projection for metropolitan France: France
// "looks right" in it, unlike in plain lat/lon. Shared by the outline generator
// (scripts/build-france-outline.ts) and the map renderers, so points and outline
// always line up. Dependency-free: bundled into the `passports` function.

const A = 6378137 // GRS80 semi-major axis
const E = 0.0818191910428158 // GRS80 first eccentricity
const rad = (deg: number) => (deg * Math.PI) / 180

const t = (lat: number) => {
  const s = E * Math.sin(lat)
  return Math.tan(Math.PI / 4 - lat / 2) / Math.pow((1 - s) / (1 + s), E / 2)
}
const m = (lat: number) => Math.cos(lat) / Math.sqrt(1 - E * E * Math.sin(lat) ** 2)

const LAT1 = rad(44)
const LAT2 = rad(49)
const LAT0 = rad(46.5)
const LON0 = rad(3)
const X0 = 700000
const Y0 = 6600000

const N = (Math.log(m(LAT1)) - Math.log(m(LAT2))) / (Math.log(t(LAT1)) - Math.log(t(LAT2)))
const F = m(LAT1) / (N * t(LAT1) ** N)
const RHO0 = A * F * t(LAT0) ** N

/** Lambert-93 easting/northing in metres. */
export const lambert93 = (lat: number, lon: number): [number, number] => {
  const rho = A * F * t(rad(lat)) ** N
  const theta = N * (rad(lon) - LON0)
  return [X0 + rho * Math.sin(theta), Y0 + RHO0 - rho * Math.cos(theta)]
}

/** A frame mapping Lambert-93 onto an SVG user space (y down). */
export interface MapFrame {
  minX: number
  maxY: number
  /** SVG units per metre */
  scale: number
}

export const toFramePoint = (frame: MapFrame, lat: number, lon: number): [number, number] => {
  const [x, y] = lambert93(lat, lon)
  return [(x - frame.minX) * frame.scale, (frame.maxY - y) * frame.scale]
}
