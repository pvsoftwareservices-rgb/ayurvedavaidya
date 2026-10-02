import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { LanguageProvider } from './i18n'
import './styles/fonts.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/home.css'
import './styles/pages.css'

// Enables :active feedback on cards and buttons for iOS touch.
document.addEventListener('touchstart', () => {}, { passive: true })

const app = <React.StrictMode>
  <BrowserRouter>
    <LanguageProvider><App/></LanguageProvider>
  </BrowserRouter>
</React.StrictMode>

// Every public page is pre-rendered (scripts/prerender.mjs): hydrate it. The dev server serves an empty shell.
const root = document.getElementById('root')
if (root.firstElementChild) ReactDOM.hydrateRoot(root, app)
else ReactDOM.createRoot(root).render(app)
