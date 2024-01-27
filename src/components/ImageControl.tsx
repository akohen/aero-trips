import { Button } from '@mantine/core';
import { IconPhotoUp } from '@tabler/icons-react';
import { Editor } from '@tiptap/react';
import { useCallback } from 'react';

export const ImageControl = ({editor}:{editor: Editor | undefined}) => {
  const addImage = useCallback(() => {
    const url = window.prompt('Image URL');
    if (url) { editor?.chain().focus().setImage({ src: url }).run() }
  }, [editor]);

  return editor ? (
    <Button
      aria-label={'Image'}
      title={'Image'}
      disabled={!editor.isEditable}
      variant='default'
      value="image"
      size='compact-sm'
      onClick={addImage}
    >
      <IconPhotoUp fontSize="inherit" size={15} />
    </Button>
  ) : null;
};