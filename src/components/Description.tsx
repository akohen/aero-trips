import { Paper } from "@mantine/core";
import { generateHTML, JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit"
import {default as TiptapLink} from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Youtube from "@tiptap/extension-youtube";

const Description = ({content}: {content: JSONContent}) => {
  if(!content) return
  return (
  <Paper 
    shadow="md"
    radius="md"
    p='xs'
    withBorder
    bg="gray.0"
    className="tiptap-content"
    miw={400}
    dangerouslySetInnerHTML={{__html: generateHTML(content, [StarterKit, TiptapLink, Image, Youtube])}} 
  />
)}

export default Description