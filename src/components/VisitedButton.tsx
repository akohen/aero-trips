import React from 'react';
import { Profile } from '..';
import { Button } from '@mantine/core';

interface VisitedButtonProps {
  item: { type: "activities" | "airfields", id: string };
  profile: Profile;
}

const VisitedButton: React.FC<VisitedButtonProps> = ({ item, profile }) => {
  const isVisited = profile.visited?.some((v) => v.id === item.id);

  return isVisited ? (
    <Button onClick={() => {
        profile.update({ visited: profile.visited?.filter((v) => v.id !== item.id) });
    }}>
      Marquer comme non visité
    </Button>
  ) : (
    <Button onClick={() => {
      profile.update({ visited: (profile.visited ?? []).concat([item]) });
    }}>
      Marquer comme visité
    </Button>
  );
};

export default VisitedButton