import { useCallback, useEffect, useMemo, useState } from "react"
import { collection, deleteDoc, deleteField, doc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from "firebase/firestore"
import { Profile, Report } from ".."
import { db } from "../data/firebase"
import { authorName, deriveAirfieldFacts, isPilotReport, sortReports } from "../utils/reports"

export type ReportInput = Pick<Report, 'text' | 'landingFee' | 'aircraftClass'> & { observedAt: Date }

const REPORTS = 'reports'

/** A new pilot report: `local` to show at once, `save` to write it. */
export const newReport = (icao: string, profile: Profile, input: ReportInput) => {
  const ref = doc(collection(db, REPORTS))
  const data = {
    target: { type: 'airfields' as const, id: icao },
    source: { type: 'pilot' as const },
    uid: profile.uid,
    author: authorName(profile.displayName),
    observedAt: Timestamp.fromDate(input.observedAt),
    ...content(input),
  }
  const local: Report = { ...data, id: ref.id, updated_at: Timestamp.now() }
  return { local, save: () => setDoc(ref, { ...data, updated_at: serverTimestamp() }) }
}

/**
 * Every report on one airfield (imports too), read after the page renders. Writes are optimistic and rolled back on
 * failure. `facts` is what applyReports derives from them: fresher than the airfield DataProvider loaded at startup.
 */
export const useReports = (icao: string | undefined, profile: Profile | undefined) => {
  const [loaded, setLoaded] = useState<{ icao: string, reports: Report[] }>()
  const reports = loaded?.icao === icao ? loaded?.reports : undefined

  useEffect(() => {
    if (!icao) return
    let cancelled = false
    getDocs(query(collection(db, REPORTS), where('target.id', '==', icao)))
      .then(snap => snap.docs.map(d => ({ ...d.data(), id: d.id }) as Report).filter(r => r.target?.type === 'airfields'))
      .catch(e => {
        console.error('[useReports]', e)
        return []
      })
      .then(list => { if (!cancelled) setLoaded({ icao, reports: list }) })
    return () => { cancelled = true }
  }, [icao])

  const optimistic = useCallback(async (next: (list: Report[]) => Report[], write: () => Promise<void>) => {
    if (!icao) return
    const before = loaded?.icao === icao ? loaded.reports : []
    setLoaded({ icao, reports: next(before) })
    try {
      await write()
    } catch (e) {
      setLoaded({ icao, reports: before })
      throw e
    }
  }, [icao, loaded])

  const add = useCallback((input: ReportInput) => {
    if (!icao || !profile) return Promise.reject(new Error('Not signed in'))
    const { local, save } = newReport(icao, profile, input)
    return optimistic(list => [...list, local], save)
  }, [icao, profile, optimistic])

  const update = useCallback((report: Report, input: ReportInput) => {
    const changes = { observedAt: Timestamp.fromDate(input.observedAt), ...content(input) }
    const local: Report = { ...withoutContent(report), ...changes, updated_at: Timestamp.now() }
    return optimistic(
      list => list.map(r => r.id === report.id ? local : r),
      () => updateDoc(doc(db, REPORTS, report.id), {
        text: deleteField(), landingFee: deleteField(), aircraftClass: deleteField(),
        ...changes,
        updated_at: serverTimestamp(),
      }),
    )
  }, [optimistic])

  const remove = useCallback((report: Report) =>
    optimistic(list => list.filter(r => r.id !== report.id), () => deleteDoc(doc(db, REPORTS, report.id))), [optimistic])

  const pilotReports = useMemo(() => reports && sortReports(reports.filter(isPilotReport)), [reports])
  const facts = useMemo(() => reports && deriveAirfieldFacts(reports), [reports])

  return { pilotReports, facts, add, update, remove }
}

export type ReportsState = ReturnType<typeof useReports>

// Firestore rejects undefined values
const content = ({ text, landingFee, aircraftClass }: ReportInput) => ({
  ...(text && { text }),
  ...(landingFee && { landingFee: { amount: landingFee.amount, ...(landingFee.note && { note: landingFee.note }) }, aircraftClass }),
})

const withoutContent = (report: Report) => {
  const rest = { ...report }
  delete rest.text
  delete rest.landingFee
  delete rest.aircraftClass
  return rest
}
