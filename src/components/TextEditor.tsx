import { RichTextEditor } from "@mantine/tiptap";
import { Editor } from "@tiptap/react";
import { ImageControl } from "./ImageControl";
import { Profile } from "..";
import { em } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

const TextEditor = ({editor, profile}:{editor:Editor|null, profile: Profile|null}) => (
  <RichTextEditor editor={editor}>
    <RichTextEditor.Toolbar sticky stickyOffset={useMediaQuery(`(max-width: ${em(768)})`) ? 80 : 0}>
      <RichTextEditor.ControlsGroup>
        <RichTextEditor.Bold />
        <RichTextEditor.Italic />
        <RichTextEditor.Underline />
        <RichTextEditor.Strikethrough />
        <RichTextEditor.ClearFormatting />
      </RichTextEditor.ControlsGroup>

      <RichTextEditor.ControlsGroup>
        <ImageControl editor={editor} profile={profile}/>
      </RichTextEditor.ControlsGroup>

      <RichTextEditor.ControlsGroup>
        <RichTextEditor.H1 />
        <RichTextEditor.H2 />
        <RichTextEditor.H3 />
        <RichTextEditor.H4 />
      </RichTextEditor.ControlsGroup>

      <RichTextEditor.ControlsGroup>
        <RichTextEditor.Link />
        <RichTextEditor.Unlink />
      </RichTextEditor.ControlsGroup>

      <RichTextEditor.ControlsGroup>
        <RichTextEditor.Undo />
        <RichTextEditor.Redo />
      </RichTextEditor.ControlsGroup>
    </RichTextEditor.Toolbar>

    <RichTextEditor.Content />
  </RichTextEditor>
)

export default TextEditor;