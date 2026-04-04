import { useSessionStorage } from '@mantine/hooks'
import { JSONContent } from '@tiptap/react'
import { ActivityType } from '..'

type TripDraft = {
  name: string
  date: string | undefined
  description: JSONContent
  steps: { type: 'activities' | 'airfields', id: string }[]
  type: 'short' | 'day' | 'multi' | ''
  tags: ActivityType[]
}

const EMPTY_DRAFT: TripDraft = {
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
  const hasDraft = draft.name !== '' || draft.steps.length > 0

  return { draft, setDraft, clearDraft, hasDraft }
}
