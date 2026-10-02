// Server entry used only at build time: scripts/prerender.mjs renders every route to static HTML with it.
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import App from './App'
import { LanguageProvider } from './i18n'

export function render(url) {
  return renderToString(<StaticRouter location={url}><LanguageProvider><App/></LanguageProvider></StaticRouter>)
}

export { CONTACT } from './data'
export { DIAL_CODES } from './countryCodes'
export * from './seo'
