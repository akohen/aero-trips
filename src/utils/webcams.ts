import type { Webcam } from '..'

// React-free: shared by the airfield page, the import script and (through the snapshot) the MCP server.

const CAM_AERO_ROOT = 'https://cam-aero.eu/raspicamaero'
export const CAM_AERO_LIST_URL = `${CAM_AERO_ROOT}/mosaic/list`

/** One entry of the Cam-Aéro list: `lfxx_acb` = `{ICAO}_{Club}`, `time` = last capture (epoch s) */
export type CamAeroCam = { id: string, lfxx_acb: string, time: number, old: boolean, replay: boolean }

/** Some IP cameras are published with their login in the URL: never store or display those. */
export const hasCredentials = (url: string) => {
  try {
    const parsed = new URL(url)
    if (parsed.username || parsed.password) return true
    return [...parsed.searchParams.keys()].some(key => /^(usr|user|username|login|pwd|pass|passwd|password)$/i.test(key))
  } catch {
    return true
  }
}

const isHttpUrl = (url: string, protocols: string[]) => {
  try {
    return protocols.includes(new URL(url).protocol)
  } catch {
    return false
  }
}

/** A link may be http; a preview must be https, or the browser blocks it as mixed content. */
export const isValidWebcam = (webcam: Webcam) =>
  isHttpUrl(webcam.url, ['http:', 'https:']) && !hasCredentials(webcam.url) &&
  (webcam.image === undefined || (isHttpUrl(webcam.image, ['https:']) && !hasCredentials(webcam.image)))

/** Cameras still updating, grouped by airfield. Ids that aren't an ICAO code (ULM fields: `LF4724`) are skipped. */
export const camAeroWebcams = (cams: CamAeroCam[]) => {
  const byAirfield = new Map<string, Webcam[]>()
  for (const cam of [...cams].sort((a, b) => a.lfxx_acb.localeCompare(b.lfxx_acb))) {
    const code = cam.lfxx_acb.split('_')[0]
    if (cam.old || !/^LF[A-Z]{2}$/.test(code)) continue
    const page = `${CAM_AERO_ROOT}/${encodeURIComponent(cam.lfxx_acb)}`
    byAirfield.set(code, [...byAirfield.get(code) ?? [], {
      // The replay shows the last hours: the trend matters more than a single frame
      url: `${page}/${cam.replay ? 'replay' : 'img'}`,
      image: page,
      source: 'cam-aero',
    }])
  }
  return byAirfield
}

/** Replaces an airfield's Cam-Aéro entries, keeping manual ones first (and winning on the same image). */
export const mergeWebcams = (current: Webcam[] | undefined, imported: Webcam[]) => {
  const manual = (current ?? []).filter(w => w.source !== 'cam-aero')
  const images = new Set(manual.map(w => w.image).filter(Boolean))
  return [...manual, ...imported.filter(w => !images.has(w.image))]
}

/** Displayed name: the label, or "Webcam" / "Webcam 2" when an airfield has several */
export const webcamLabel = (webcam: Webcam, index: number, count: number) =>
  webcam.label ?? (count > 1 ? `Webcam ${index + 1}` : 'Webcam')

/** Adds proposed webcams to an airfield's list (file imports are additive), skipping known url/image. */
export const appendWebcams = (current: Webcam[] | undefined, added: Webcam[]) => {
  const known = new Set((current ?? []).flatMap(w => [w.url, w.image]).filter(Boolean))
  return [...current ?? [], ...added.filter(w => !known.has(w.url) && !(w.image && known.has(w.image)))]
}
