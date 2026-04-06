import { Paper } from "@mantine/core";
import { generateHTML, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit"
import Youtube from "@tiptap/extension-youtube";
import { ImageWithFallback } from "../utils/ImageWithFallback";
import { useNavigate } from "react-router";

const Description = ({content}: {content: JSONContent}) => {
  const navigate = useNavigate();
  if(!content) return

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
    dangerouslySetInnerHTML={{__html: generateHTML(content, [StarterKit, ImageWithFallback, Youtube])}}
  />
)}

export default Description