import { JSONContent } from "@tiptap/react";

/**
 * Fill empty `alt` attributes on image nodes with a contextual label (the
 * item's name), for accessibility + SEO. Contributions never capture an alt
 * (see `uploadImage`), so descriptions ship with `alt: null`; this derives a
 * reasonable default at render time — shared by the runtime `Description`
 * component and the SEO prerender — without mutating stored data.
 *
 * Returns a shallow-cloned doc; the input is left untouched. Images that
 * already carry an alt are preserved.
 */
export const fillImageAlt = (content: JSONContent, label?: string): JSONContent => {
  if (!content || !label) return content;
  const walk = (node: JSONContent): JSONContent => {
    let next = node;
    if (node.type === 'image' && !node.attrs?.alt) {
      next = { ...node, attrs: { ...node.attrs, alt: label } };
    }
    if (next.content) {
      next = { ...next, content: next.content.map(walk) };
    }
    return next;
  };
  return walk(content);
};