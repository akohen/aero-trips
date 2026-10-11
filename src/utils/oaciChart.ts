/**
 * SIA 1:1 000 000 aeronautical chart, offered as a background on the map's zoomed-out views.
 * Tiles are built by scripts/oaci-tiles.py (green airway/navaid layer removed) and uploaded to
 * the default bucket under oaci/<edition>/ (procedure in that script's docstring).
 */
export const OACI_EDITION = '2026'

export const OACI_TILES_URL =
  `https://storage.googleapis.com/aero-trips.appspot.com/oaci/${OACI_EDITION}/{z}/{x}/{y}.webp`

/** Tiles exist for zooms 7-9; zoom 10 upscales the zoom 9 ones, OSM takes over from zoom 11. */
export const OACI_ZOOMS = { min: 7, maxNative: 9, max: 10 }

const SIA_LICENCE_URL = 'https://www.sia.aviation-civile.gouv.fr/pub/media/news/file//l/i/licenceopendata-vf_2.pdf'

// The SIA publishes the PDF under its Licence Ouverte (source and date credited, content not
// misrepresented): hence the edition.
export const OACI_ATTRIBUTION =
  `© <a href="https://www.sia.aviation-civile.gouv.fr">SIA</a>, éd. ${OACI_EDITION}, ` +
  `<a href="${SIA_LICENCE_URL}">Licence Ouverte</a>`

const STORAGE_KEY = 'aerotrips.oaciChart'

export const loadOaciPreference = () => {
  try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
}

export const saveOaciPreference = (shown: boolean) => {
  try {
    if (shown) localStorage.setItem(STORAGE_KEY, '1')
    else localStorage.removeItem(STORAGE_KEY)
  } catch { /* private mode, blocked storage: the choice just isn't remembered */ }
}
