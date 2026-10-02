import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getRouteMeta, headTags, jsonLdFor, NOT_FOUND_META, serializeJsonLd } from '../seo'

function syncTag([attr, key, value]) {
  const selector = attr === 'rel' ? `link[rel="${key}"]` : `meta[${attr}="${key}"]`
  let el = document.head.querySelector(selector)
  if (value == null) { el?.remove(); return }
  if (!el) {
    el = document.createElement(attr === 'rel' ? 'link' : 'meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute(attr === 'rel' ? 'href' : 'content', value)
}

function syncJsonLd(data) {
  let el = document.getElementById('ld-json')
  if (!data) { el?.remove(); return }
  if (!el) {
    el = document.createElement('script')
    el.setAttribute('type', 'application/ld+json')
    el.id = 'ld-json'
    document.head.appendChild(el)
  }
  el.textContent = serializeJsonLd(data)
}

/** Keeps description, robots, canonical, social and JSON-LD tags in step with client-side navigation. */
export default function RouteHead() {
  const { pathname } = useLocation()
  useEffect(() => {
    const route = getRouteMeta(pathname) ?? NOT_FOUND_META
    headTags(route).forEach(syncTag)
    syncJsonLd(jsonLdFor(route))
  }, [pathname])
  return null
}
