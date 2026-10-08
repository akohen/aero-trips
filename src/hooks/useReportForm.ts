import { useState } from "react"
import { Profile, Report } from ".."
import { googleLogin } from "../data/firebase"

export interface ReportFormState {
  report?: Report
  focusFee?: boolean
}

/** Shared by the reports section, the « inconnue » fee line and the visited prompt. Signed out, signs in first. */
export const useReportForm = (icao: string, profile: Profile | undefined) => {
  // Keyed by airfield: the page component stays mounted when navigating to another one
  const [form, setForm] = useState<ReportFormState & { icao: string }>()
  const [thanks, setThanks] = useState<{ icao: string, text: string }>()
  const open = (state: ReportFormState = {}) => {
    if (profile) return setForm({ ...state, icao })
    // The profile loads after the popup resolves: the form waits for it (ReportFormHost)
    googleLogin().then(() => setForm({ ...state, icao }), e => console.warn('[Reports] sign-in', e))
  }
  return {
    form: form?.icao === icao ? form : undefined,
    open,
    close: () => setForm(undefined),
    thanks: thanks?.icao === icao ? thanks.text : undefined,
    setThanks: (text: string) => setThanks({ icao, text }),
  }
}

export type ReportFormControl = ReturnType<typeof useReportForm>
