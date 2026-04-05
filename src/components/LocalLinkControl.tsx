import { useState, useMemo, useEffect, useRef } from 'react';
import { Popover } from '@mantine/core';
import { RichTextEditor } from '@mantine/tiptap';
import { IconMapPin } from '@tabler/icons-react';
import { Editor } from '@tiptap/react';
import { Activity, Airfield } from '..';
import TripStepSelect from './TripStepSelect';

export const LocalLinkControl = ({ editor, activities, airfields }: {
  editor: Editor | null;
  activities?: Map<string, Activity>;
  airfields?: Map<string, Airfield>;
}) => {
  const [opened, setOpened] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (opened) requestAnimationFrame(() => dropdownRef.current?.querySelector('input')?.focus());
  }, [opened]);

  const data = useMemo(() => {
    const groups = [];
    if (airfields?.size) groups.push({
      group: 'Terrains',
      items: [...airfields].map(([id, ad]) => ({ label: `${ad.name} - ${ad.codeIcao}`, value: `airfields/${id}` })),
    });
    if (activities?.size) groups.push({
      group: 'Activités',
      items: [...activities].map(([id, a]) => ({ label: a.name, value: `activities/${id}` })),
    });
    return groups;
  }, [airfields, activities]);

  const handleSelect = (value: string) => {
    if (!editor) return;
    setOpened(false);
    const label = data.flatMap(g => g.items).find(i => i.value === value)?.label ?? value;
    const href = `/${value}`;
    if (editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${href}">${label}</a>`).run();
    } else {
      editor.chain().focus().setLink({ href }).run();
    }
  };

  return (
    <Popover opened={opened} onChange={setOpened} withinPortal={false}>
      <Popover.Target>
        <RichTextEditor.Control aria-label="Lien local" title="Lien local" onClick={() => setOpened(o => !o)}>
          <IconMapPin size={16} stroke={1.5} />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown ref={dropdownRef}>
        <TripStepSelect data={data} placeholder="Rechercher..." addItem={handleSelect} w={230} />
      </Popover.Dropdown>
    </Popover>
  );
};
