import React from 'react';
import { Profile } from '..';
import { Button, Tooltip } from '@mantine/core';
import { IconHistory, IconHistoryToggle } from '@tabler/icons-react';

interface VisitedButtonProps {
  item: { type: "activities" | "airfields", id: string };
  profile: Profile;
  icon?: boolean;
}

const VisitedButton: React.FC<VisitedButtonProps> = ({ item, profile, icon }) => {
  const isVisited = profile.visited?.some((v) => v.id === item.id);
  const markAsNotVisited = () => profile.update({ visited: profile.visited?.filter((v) => v.id !== item.id) })
  const markAsVisited = () => profile.update({ visited: (profile.visited ?? []).concat([item]) })

  if(icon) return (isVisited ? 
    <Tooltip label="Marquer comme non visité">
      <IconHistory onClick={markAsNotVisited} className='clickable title-button' />
    </Tooltip>
    : 
    <Tooltip label="Marquer comme visité">
      <IconHistoryToggle onClick={markAsVisited} className='clickable title-button' color='gray' />
    </Tooltip>
  );

  return (isVisited ? 
    <Button onClick={markAsNotVisited}>Marquer comme non visité</Button>
    : 
    <Button onClick={markAsVisited}>Marquer comme visité</Button>
  );
};

export default VisitedButton