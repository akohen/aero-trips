import { useEffect, useRef, useState } from 'react';
import { CloseButton, Combobox, InputBase, ScrollArea, useCombobox } from '@mantine/core';

type GroupedItem = { label: string; value: string }
type GroupedData = { group: string; items: GroupedItem[] }[]

type Props = {
  data: GroupedData
  placeholder?: string
  // fire-and-forget mode (uncontrolled)
  addItem?: (value: string) => void
  // controlled mode
  value?: string | null
  onChange?: (value: string | null) => void
  w?: number | string
  [key: string]: unknown
}

export default function TripStepSelect({ data, placeholder, addItem, value, onChange, w, ...rest }: Props) {
  const controlled = value !== undefined

  const allItems = data.flatMap(g => g.items)
  const labelFor = (val: string | null | undefined) =>
    val ? (allItems.find(i => i.value === val)?.label ?? '') : ''

  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() })
  const [search, setSearch] = useState(controlled ? labelFor(value) : '')

  // Sync display when controlled value changes externally (e.g. "clear all filters")
  const prevValue = useRef(value)
  useEffect(() => {
    if (controlled && prevValue.current !== value) {
      prevValue.current = value
      setSearch(labelFor(value))
    }
  // allItems intentionally omitted: value changes are the only meaningful external trigger
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

  const filteredGroups = data.map((group) => {
    const searchWords = normalize(search).split(' ')
    const checkItem = (item: GroupedItem) => {
      const words = normalize(item.label).split(' ')
      return searchWords.every(sw => words.some(w => w.includes(sw)))
    }
    const options = search !== '' ? group.items.filter(checkItem).slice(0, 8) : group.items.slice(0, 3)
    return { ...group, options }
  })

  const totalOptions = filteredGroups.reduce((acc, g) => acc + g.options.length, 0)

  const groups = filteredGroups.map((group) => (
    <Combobox.Group label={group.group} key={group.group}>
      {group.options.map((item) => (
        <Combobox.Option value={item.value} key={item.value}>
          {item.label}
        </Combobox.Option>
      ))}
    </Combobox.Group>
  ))

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      size="xs"
      onOptionSubmit={(val) => {
        if (controlled) {
          setSearch(labelFor(val))
          onChange?.(val)
        } else {
          setSearch('')
          addItem?.(val)
        }
        combobox.closeDropdown()
      }}
      {...rest}
    >
      <Combobox.Target>
        <InputBase
          value={search}
          w={w}
          placeholder={placeholder}
          rightSectionPointerEvents={controlled && value ? 'all' : 'none'}
          rightSection={
            controlled && value
              ? <CloseButton size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange?.(null); setSearch('') }} />
              : <Combobox.Chevron />
          }
          onChange={(e) => {
            combobox.openDropdown()
            combobox.updateSelectedOptionIndex()
            setSearch(e.currentTarget.value)
            if (controlled && value) onChange?.(null)
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => {
            combobox.closeDropdown()
            if (controlled) setSearch(labelFor(value))
          }}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          <ScrollArea.Autosize mah={280} type="always">
            {totalOptions > 0 ? groups : <Combobox.Empty>Aucun résultat</Combobox.Empty>}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  )
}
