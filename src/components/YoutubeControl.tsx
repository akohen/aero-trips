import { Button } from '@mantine/core';
import { IconBrandYoutubeFilled } from '@tabler/icons-react';
import { Editor } from '@tiptap/react';
import { useCallback } from 'react';
import { Profile } from '..';

export const YoutubeControl = ({editor}:{editor:Editor|null, profile?: Profile}) => {
  const addVideo = useCallback(() => {
    const url = window.prompt('Youtube video URL');
    if (url) { editor!.commands.setYoutubeVideo({
  src: url,
  width: 640,
  height: 480,
}) }
  }, [editor]);

  return (<>
    <Button
      aria-label={'Youtube'}
      title={'Youtube'}
      variant='default'
      value="image"
      size='compact-sm'
      onClick={addVideo}
    >
      <IconBrandYoutubeFilled fontSize="inherit" size={15} />
    </Button>
  </>
    
  )
};