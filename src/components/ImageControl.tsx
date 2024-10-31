import { Button } from '@mantine/core';
import { IconPhotoUp } from '@tabler/icons-react';
import { ChangeEvent, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { uploadImage } from '../utils';
import { Profile } from '..';

export const ImageControl = ({editor, profile}:{editor:Editor|null, profile?: Profile}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const handleClick = () => {
    if(!inputRef.current) return
    inputRef.current.click()
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if(!editor || !files) return
    const pos = editor.view.state.selection.anchor
    uploadImage(editor.view, pos, files[0], profile)
    inputRef.current!.value = ''
  }

  return (<>
    <Button
      aria-label={'Image'}
      title={'Image'}
      variant='default'
      value="image"
      size='compact-sm'
      onClick={handleClick}
    >
      <IconPhotoUp fontSize="inherit" size={15} />
    </Button>
    <input
      ref={inputRef}
      type="file"
      accept='image/png,image/jpeg'
      style={{ display: 'none' }}
      onChange={onChange}
    />
  </>
    
  )
};