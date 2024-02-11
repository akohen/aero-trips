import { useState } from 'react';
import { Combobox, InputBase, ScrollArea, useCombobox } from '@mantine/core';


export default function TripStepSelect({data, addItem, placeholder,...rest}: 
  {data:{group: string, items: {label: string, value: string}[]}[], addItem: (value: string) => void, placeholder: string}) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const [value, setValue] = useState<string | null>(null);
  const [search, setSearch] = useState('');


  const filteredGroups = data.map((group) => {
    const searchWords = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().split(' ')
    const checkItem = (item: {label:string}) => {
      const words = item.label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().split(' ')
      return searchWords.every(searchWord => words.some(word => word.includes(searchWord)))
    }
    const filteredOptions = search != ''
      ? group.items.filter(checkItem).slice(0,8)
      : group.items.slice(0,3);

    return { ...group, options: filteredOptions };
  });

  const totalOptions = filteredGroups.reduce((acc, group) => acc + group.options.length, 0);

  const groups = filteredGroups.map((group) => {
    const options = group.options.map((item) => (
      <Combobox.Option value={item.value} key={item.value}>
        {item.label.normalize('NFD')}
      </Combobox.Option>
    ));

    return (
      <Combobox.Group label={group.group} key={group.group}>
        {options}
      </Combobox.Group>
    );
  });

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(val) => {
        setValue('');
        setSearch('');
        combobox.closeDropdown();
        addItem(val)
      }}
      {...rest}
    >
      <Combobox.Target>
        <InputBase
          rightSection={<Combobox.Chevron />}
          value={search}
          onChange={(event) => {
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
            setSearch(event.currentTarget.value);
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => {
            combobox.closeDropdown();
            setSearch(value || '');
          }}
          placeholder={placeholder}
          rightSectionPointerEvents="none"
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
  );
}