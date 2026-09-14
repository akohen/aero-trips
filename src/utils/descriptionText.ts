// Serializes a tiptap/ProseMirror document to plain text or markdown.
//
// Deliberately standalone: no tiptap import, no DOM. @tiptap/html's generateHTML
// needs the extension list *and* a DOM (happy-dom), which is far too heavy for a
// cloud function that would only strip the HTML again. prerender.ts genuinely
// needs HTML and keeps using generateHTML; consumers that want text use this.

type Mark = { type?: string; attrs?: Record<string, unknown> }

type Node = {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  content?: Node[]
  marks?: Mark[]
}

type Options = {
  /** Truncate on a word boundary, appending an ellipsis. */
  maxLength?: number
  /** Emit markdown syntax for links, emphasis and images. Defaults to true. */
  markdown?: boolean
  /**
   * Keep image nodes. Defaults to true. Consumers paying by the token (the MCP
   * server) turn this off: CDN image URLs routinely run 300+ characters and
   * carry nothing a reader needs.
   */
  images?: boolean
}

const attrString = (node: Node, key: string) => {
  const value = node.attrs?.[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

type Ctx = { markdown: boolean; images: boolean }

const inline = (node: Node, markdown: boolean): string => {
  let text = node.text ?? ''
  if (!markdown) return text
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case 'bold': text = `**${text}**`; break
      case 'italic': text = `*${text}*`; break
      case 'code': text = `\`${text}\``; break
      case 'link': {
        const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : undefined
        if (href) text = `[${text}](${href})`
        break
      }
    }
  }
  return text
}

const children = (node: Node, ctx: Ctx, separator: string): string =>
  (node.content ?? []).map(child => serialize(child, ctx)).filter(Boolean).join(separator)

const indent = (text: string, prefix: string) =>
  text.split('\n').map((line, i) => (i === 0 ? line : prefix + line)).join('\n')

function serialize(node: Node, ctx: Ctx): string {
  const { markdown } = ctx
  switch (node.type) {
    case 'text':
      return inline(node, markdown)
    case 'hardBreak':
      return '\n'
    case 'paragraph':
      return children(node, ctx, '')
    case 'heading': {
      const level = typeof node.attrs?.level === 'number' ? node.attrs.level : 1
      const content = children(node, ctx, '')
      return markdown && content ? `${'#'.repeat(level)} ${content}` : content
    }
    case 'bulletList':
      return (node.content ?? [])
        .map(item => `- ${indent(serialize(item, ctx), '  ')}`)
        .join('\n')
    case 'orderedList':
      return (node.content ?? [])
        .map((item, i) => `${i + 1}. ${indent(serialize(item, ctx), '   ')}`)
        .join('\n')
    case 'listItem':
      return children(node, ctx, '\n')
    case 'blockquote':
      return children(node, ctx, '\n\n')
        .split('\n').map(line => `> ${line}`).join('\n')
    case 'codeBlock': {
      const content = children(node, ctx, '')
      return markdown ? `\`\`\`\n${content}\n\`\`\`` : content
    }
    case 'horizontalRule':
      return '---'
    case 'image': {
      if (!ctx.images) return ''
      const alt = attrString(node, 'alt') ?? attrString(node, 'title') ?? 'image'
      const src = attrString(node, 'src')
      if (!markdown) return `(image : ${alt})`
      return src ? `![${alt}](${src})` : `![${alt}]`
    }
    case 'youtube': {
      const src = attrString(node, 'src')
      return src ? (markdown ? `[vidéo](${src})` : `(vidéo : ${src})`) : ''
    }
    // 'doc' and anything unknown: recurse and drop the wrapper, so new editor
    // extensions degrade to their text content instead of disappearing.
    default:
      return children(node, ctx, '\n\n')
  }
}

const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  const cut = text.slice(0, maxLength)
  const boundary = cut.lastIndexOf(' ')
  return (boundary > maxLength * 0.6 ? cut.slice(0, boundary) : cut).trimEnd() + '…'
}

export function descriptionToText(doc: unknown, opts: Options = {}): string {
  if (!doc || typeof doc !== 'object') return ''
  const { maxLength, markdown = true, images = true } = opts

  const text = serialize(doc as Node, { markdown, images })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return maxLength ? truncate(text, maxLength) : text
}
