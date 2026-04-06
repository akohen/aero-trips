import Youtube from "@tiptap/extension-youtube";
import { JSONContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit";
import { fetchAndUploadImageUrl, uploadImage } from "../utils/image";
import { Slice } from "@tiptap/pm/model";
import { EditorView } from "@tiptap/pm/view";
import { Profile } from "..";
import { ImageWithFallback } from "../utils/ImageWithFallback";

const extensions = [
  StarterKit,
  ImageWithFallback.configure({ allowBase64: false }),
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
      handlePaste: function(view: EditorView, event: ClipboardEvent) {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        // Actual image binary data
        if (clipboardData.files && clipboardData.files[0]?.type.startsWith('image/')) {
          event.preventDefault();
          const pos = view.state.selection.from;
          uploadImage(view, pos, clipboardData.files[0], profile);
          return true;
        }

        // Remote image URL
        const html = clipboardData.getData('text/html');
        if (html) {
          const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (match) {
            const imageUrl = match[1];
            if (!imageUrl.startsWith('data:')) {
              event.preventDefault();
              const pos = view.state.selection.from;
              fetchAndUploadImageUrl(view, pos, imageUrl, profile);
              return true;
            }
          }
        }

        return false;
      },
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