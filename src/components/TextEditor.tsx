import { RichTextEditor } from "@mantine/tiptap";
import { Editor } from "@tiptap/react";
import { ImageControl } from "./ImageControl";
import { Activity, Airfield, Profile } from "..";
import { em } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { YoutubeControl } from "./YoutubeControl";
import { LocalLinkControl } from "./LocalLinkControl";

const TextEditor = ({editor, profile, activities, airfields}:{editor:Editor|null, profile?: Profile, activities?: Map<string, Activity>, airfields?: Map<string, Airfield>}) => (
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
        <YoutubeControl editor={editor} />
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
        {(activities || airfields) && <LocalLinkControl editor={editor} activities={activities} airfields={airfields} />}
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