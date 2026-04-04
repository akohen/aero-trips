import { useSessionStorage } from '@mantine/hooks'
import { JSONContent } from '@tiptap/react'
import { ActivityType } from '..'

type TripDraft = {
  id?: string
  name: string
  date: string | undefined
  description: JSONContent
  steps: { type: 'activities' | 'airfields', id: string }[]
  type: 'short' | 'day' | 'multi' | ''
  tags: ActivityType[]
}

const EMPTY_DRAFT: TripDraft = {
  id: undefined,
  name: '',
  date: undefined,
  description: { type: 'doc', content: [] },
  steps: [],
  type: '',
  tags: [],
}

export function useDraftTrip() {
  const [draft, setDraft] = useSessionStorage<TripDraft>({
    key: 'draft-trip',
    defaultValue: EMPTY_DRAFT,
    getInitialValueInEffect: false,
  })

  const clearDraft = () => setDraft(EMPTY_DRAFT)
  const hasNewTripDraft = !draft.id && (draft.name !== '' || draft.steps.length > 0)
  const hasDraftForTrip = (id: string) => draft.id === id

  return { draft, setDraft, clearDraft, hasNewTripDraft, hasDraftForTrip }
}
