import { useState } from 'react';
import { Combobox, InputBase, useCombobox } from '@mantine/core';


export default function TripStepSelect({data, addItem, ...rest}: 
  {data:{group: string, items: {label: string, value: string}[]}[], addItem: (value: string) => void}) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const allData = data.reduce<string[]>((acc, group) => [...acc, ...group.items.map(a => a.label)], []);
  const [value, setValue] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const shouldFilterOptions = allData.every((item) => item !== search);
  const filteredGroups = data.map((group) => {
    const filteredOptions = shouldFilterOptions
      ? group.items.filter((item) => item.label.toLowerCase().includes(search.toLowerCase().trim())).slice(0,5)
      : group.items.slice(0,5);

    return { ...group, options: filteredOptions };
  });

  const totalOptions = filteredGroups.reduce((acc, group) => acc + group.options.length, 0);

  const groups = filteredGroups.map((group) => {
    const options = group.options.map((item) => (
      <Combobox.Option value={item.value} key={item.value}>
        {item.label}
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
          placeholder="Chercher un lieu"
          rightSectionPointerEvents="none"
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {totalOptions > 0 ? groups : <Combobox.Empty>Aucun résultat</Combobox.Empty>}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}