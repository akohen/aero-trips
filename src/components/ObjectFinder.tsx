import { ComboboxItem, Select } from "@mantine/core";
import { Activity, Airfield } from "..";

const ObjectFinder = ({
  activities,
  airfields,
  value,
  onChange,
  ...props
}: {
  activities: Map<string, Activity>;
  airfields: Map<string, Airfield>;
  value: string | null;
  onChange: (value: string | null, option: ComboboxItem) => void;
}) => {
  const options = [
    {
      group: "Terrains",
      items: [...airfields].map(([id, ad]) => ({
        label: `${ad.name} - ${ad.codeIcao}`,
        value: `airfields/${id}`
      }))
    },
    {
      group: "Activités",
      items: [...activities].map(([id, activity]) => ({
        label: activity.name,
        value: `activities/${id}`
      }))
    }
  ];

  return (
    <Select
      value={value}
      onChange={onChange}
      data={options}
      placeholder="Terrain ou activité"
      searchable
      clearable
      limit={8}
      size="xs"
      w={210}
      {...props}
    />
  );
};

export default ObjectFinder;
