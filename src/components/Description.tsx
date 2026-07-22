import { Paper } from "@mantine/core";
import { generateHTML, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit"
import Youtube from "@tiptap/extension-youtube";
import { ImageWithFallback } from "../utils/ImageWithFallback";
import { getResizedUrl } from "../utils/image";
import { useNavigate } from "react-router";
import DOMPurify from "dompurify";

const Description = ({content}: {content: JSONContent}) => {
  const navigate = useNavigate();
  if(!content) return

  // DOMPurify strips the inline `onerror` fallback that ImageWithFallback emits,
  // so we re-attach it here in the capture phase (error events don't bubble).
  // Original upload URLs can 404 once Firebase's resize extension purges them;
  // fall back to the resized (`_1000x1000`) variant, which is kept.
  const handleError = (e: React.SyntheticEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!(target instanceof HTMLImageElement)) return;
    if (target.dataset.fallbackAttempted) return;
    target.dataset.fallbackAttempted = 'true';
    target.src = getResizedUrl(target.src);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href) return;
    try {
      const url = new URL(href, window.location.origin);
      if (url.origin === window.location.origin) {
        e.preventDefault();
        navigate(url.pathname + url.search + url.hash);
      }
    } catch {
      // malformed URL — let browser handle it
    }
  };

  return (
  <Paper
    shadow="md"
    radius="md"
    p='xs'
    withBorder
    bg="gray.0"
    className="tiptap-content"
    miw={320}
    onClick={handleClick}
    onErrorCapture={handleError}
    dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(generateHTML(content, [StarterKit, ImageWithFallback, Youtube]), { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'] })}}
  />
)}

export default Description