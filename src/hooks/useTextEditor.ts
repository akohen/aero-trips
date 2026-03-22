import Youtube from "@tiptap/extension-youtube";
import { JSONContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit";
import { default as TiptapImage } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { fetchAndUploadImageUrl, uploadImage } from "../utils/image";
import { Slice } from "@tiptap/pm/model";
import { EditorView } from "@tiptap/pm/view";
import { Profile } from "..";

const extensions = [
  StarterKit,
  Link,
  TiptapImage.configure({ allowBase64: false }),
  Youtube.configure({ controls: true }),
];


interface UseTextEditorOptions {
  profile?: Profile;
  content?: JSONContent | string;
  onUpdate?: (content: JSONContent) => void;
}


const useTextEditor = ({profile, content, onUpdate}: UseTextEditorOptions) => (
  useEditor({
    extensions,
    content,
    onUpdate: ({ editor }) => onUpdate?.(editor.getJSON()),
    editorProps: {
      handleDrop: function(view: EditorView, event: DragEvent, _slice: Slice, moved: boolean) {
        if (!moved && event.dataTransfer) {
          if (event.dataTransfer.files && event.dataTransfer.files[0]) {
            const file = event.dataTransfer.files[0];
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            uploadImage(view, coordinates!.pos, file, profile);
            return true; // handled
          }

          const html = event.dataTransfer.getData('text/html');
          const uriList = event.dataTransfer.getData('text/uri-list');

          let imageUrl: string | null = null;

          if (html) {
            const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
            if (match) imageUrl = match[1];
          }

          if (!imageUrl && uriList) {
            const firstUri = uriList.split('\n').find(line => !line.startsWith('#'))?.trim();
            if (firstUri && /\.(jpe?g|png|webp)(\?.*)?$/i.test(firstUri)) {
              imageUrl = firstUri;
            }
          }

          if (imageUrl) {
            event.preventDefault();
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            fetchAndUploadImageUrl(view, coordinates!.pos, imageUrl, profile);
            return true;
          }
        }
        return false; // not handled use default behaviour
      }
    },
  },
  [profile])
)


export default useTextEditor