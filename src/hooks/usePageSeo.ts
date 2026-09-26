import { useEffect } from "react"
import { DEFAULT_DESCRIPTION, DEFAULT_IMAGE, DEFAULT_TITLE, ItemSeo } from "../utils/itemSeo"

// Applies a page's SEO metadata (title, meta, JSON-LD) to <head>, and restores the
// site defaults on unmount. The tags are rewritten whenever `seo` changes identity
// (memoized by the caller or by React Compiler).
export const usePageSeo = (seo: ItemSeo) => {
  useEffect(() => {
    const { title, description, url, ogType, image, jsonLdItem, jsonLdBreadcrumb } = seo

    document.title = title

    const setMeta = (sel: string, attr: string, val: string) => {
      let el = document.querySelector(sel)
      if (!el) {
        el = document.createElement('meta')
        if (sel.includes('property')) { el.setAttribute('property', attr) } else { el.setAttribute('name', attr) }
        document.head.appendChild(el)
      }
      el.setAttribute('content', val)
    }

    setMeta('meta[name="description"]', 'description', description)
    setMeta('meta[property="og:title"]', 'og:title', title)
    setMeta('meta[property="og:description"]', 'og:description', description)
    setMeta('meta[property="og:url"]', 'og:url', url)
    setMeta('meta[property="og:type"]', 'og:type', ogType)
    setMeta('meta[name="twitter:title"]', 'twitter:title', title)
    setMeta('meta[name="twitter:description"]', 'twitter:description', description)
    setMeta('meta[property="og:image"]', 'og:image', image)
    setMeta('meta[name="twitter:image"]', 'twitter:image', image)

    const setSchema = (key: string, value: object) => {
      let el = document.querySelector(`script[data-schema="${key}"]`) as HTMLScriptElement | null
      if (!el) {
        el = document.createElement('script')
        el.setAttribute('type', 'application/ld+json')
        el.setAttribute('data-schema', key)
        document.head.appendChild(el)
      }
      el.textContent = JSON.stringify(value)
    }
    setSchema('item', jsonLdItem)
    setSchema('breadcrumb', jsonLdBreadcrumb)

    return () => {
      document.title = DEFAULT_TITLE
      setMeta('meta[name="description"]', 'description', DEFAULT_DESCRIPTION)
      setMeta('meta[property="og:title"]', 'og:title', DEFAULT_TITLE)
      setMeta('meta[property="og:description"]', 'og:description', DEFAULT_DESCRIPTION)
      setMeta('meta[property="og:url"]', 'og:url', 'https://aerotrips.fr/')
      setMeta('meta[property="og:type"]', 'og:type', 'website')
      setMeta('meta[name="twitter:title"]', 'twitter:title', DEFAULT_TITLE)
      setMeta('meta[name="twitter:description"]', 'twitter:description', DEFAULT_DESCRIPTION)
      setMeta('meta[property="og:image"]', 'og:image', DEFAULT_IMAGE)
      setMeta('meta[name="twitter:image"]', 'twitter:image', DEFAULT_IMAGE)
      document.querySelector('script[data-schema="item"]')?.remove()
      document.querySelector('script[data-schema="breadcrumb"]')?.remove()
    }
  }, [seo]);
}
