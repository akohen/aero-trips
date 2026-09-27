import { describe, expect, it } from 'vitest'
import { camAeroWebcams, hasCredentials, isValidWebcam, mergeWebcams } from './webcams'

const cam = (lfxx_acb: string, extra = {}) => ({ id: lfxx_acb, lfxx_acb, time: 1790510400, old: false, replay: true, ...extra })

describe('hasCredentials', () => {
  it('flags logins in the query string or the authority', () => {
    expect(hasCredentials('http://193.251.176.121:157/cgi-bin/CGIProxy.fcgi?cmd=snapPicture2&usr=aca&pwd=secret')).toBe(true)
    expect(hasCredentials('https://user:pass@example.com/cam.jpg')).toBe(true)
    expect(hasCredentials('https://example.com/cam.jpg?Password=x')).toBe(true)
  })

  it('accepts plain URLs and treats unparsable ones as unsafe', () => {
    expect(hasCredentials('https://cam-aero.eu/raspicamaero/LFGO_AeroClubDeSens')).toBe(false)
    expect(hasCredentials('https://example.com/cam.jpg?t=123')).toBe(false)
    expect(hasCredentials('not a url')).toBe(true)
  })
})

describe('isValidWebcam', () => {
  it('allows an http link but only an https preview', () => {
    expect(isValidWebcam({ url: 'http://club.fr/webcam' })).toBe(true)
    expect(isValidWebcam({ url: 'https://club.fr/webcam', image: 'https://club.fr/cam.jpg' })).toBe(true)
    expect(isValidWebcam({ url: 'https://club.fr/webcam', image: 'http://club.fr/cam.jpg' })).toBe(false)
  })

  it('rejects credentials and non-web schemes', () => {
    expect(isValidWebcam({ url: 'https://club.fr/webcam', image: 'https://club.fr/cam.jpg?usr=a&pwd=b' })).toBe(false)
    expect(isValidWebcam({ url: 'javascript:alert(1)' })).toBe(false)
  })
})

describe('camAeroWebcams', () => {
  it('groups fresh cameras by ICAO code, in a stable order', () => {
    const result = camAeroWebcams([cam('LFAI_AeroclubMarcelDassault2'), cam('LFAI_AeroclubMarcelDassault', { replay: false })])
    expect(result.get('LFAI')).toEqual([
      { url: 'https://cam-aero.eu/raspicamaero/LFAI_AeroclubMarcelDassault/img', image: 'https://cam-aero.eu/raspicamaero/LFAI_AeroclubMarcelDassault', source: 'cam-aero' },
      { url: 'https://cam-aero.eu/raspicamaero/LFAI_AeroclubMarcelDassault2/replay', image: 'https://cam-aero.eu/raspicamaero/LFAI_AeroclubMarcelDassault2', source: 'cam-aero' },
    ])
  })

  it('skips stale cameras and non-ICAO ids', () => {
    const result = camAeroWebcams([cam('LFAD_ACCM60', { old: true }), cam('LF4724_MontpezatDAgenais'), cam('EBAV_AeroClubHesbaye')])
    expect(result.size).toBe(0)
  })
})

describe('mergeWebcams', () => {
  const imported = { url: 'https://cam-aero.eu/raspicamaero/LFGO_X/replay', image: 'https://cam-aero.eu/raspicamaero/LFGO_X', source: 'cam-aero' as const }
  const manual = { url: 'https://club.fr/webcam', label: 'Parking' }

  it('keeps manual entries first and replaces imported ones', () => {
    const stale = { ...imported, url: 'https://cam-aero.eu/raspicamaero/LFGO_Old/img', image: 'https://cam-aero.eu/raspicamaero/LFGO_Old' }
    expect(mergeWebcams([stale, manual], [imported])).toEqual([manual, imported])
    expect(mergeWebcams([stale], [])).toEqual([])
    expect(mergeWebcams(undefined, [imported])).toEqual([imported])
  })

  it('lets a manual entry win on the same image', () => {
    const edited = { ...imported, source: undefined, label: 'Piste 29' }
    expect(mergeWebcams([edited], [imported])).toEqual([edited])
  })
})
