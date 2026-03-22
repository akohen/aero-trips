import Image from "@tiptap/extension-image"
import { getResizedUrl } from "../utils/image";

export const ImageWithFallback = Image.extend({
  renderHTML({ HTMLAttributes }) {
    const onerror = `if(!this.dataset.fallbackAttempted){this.dataset.fallbackAttempted='true';this.src='${getResizedUrl(HTMLAttributes.src)}';}`;
    return ['img', { ...HTMLAttributes, onerror }];
  },
});