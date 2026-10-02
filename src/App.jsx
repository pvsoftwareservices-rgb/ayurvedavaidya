import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Footer, { MobileActionBar } from './components/Footer'
import Header from './components/Header'
import RouteHead from './components/RouteHead'
import { SERVICES } from './data'
import HomePage from './HomePage'
import AboutPage from './pages/AboutPage'
import { ArticlePage, ArticlesPage } from './pages/ArticlesPage'
import ContactPage from './pages/ContactPage'
import LegalPage from './pages/LegalPage'
import NotFound from './pages/NotFound'
import ProgramsPage from './pages/ProgramsPage'
import ServicesPage from './pages/ServicesPage'
import ThankYouPage from './pages/ThankYouPage'

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
      return
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, hash])
  return null
}

export default function App() {
  return <>
    <ScrollManager/>
    <RouteHead/>
    <Header/>
    <Routes>
      <Route path="/" element={<HomePage/>}/>
      <Route path="/about" element={<AboutPage/>}/>
      <Route path="/services" element={<ServicesPage/>}/>
      {SERVICES.map((s) => <Route key={s.key} path={`/services/${s.key}`} element={<ServicesPage single={s.key}/>}/>)}
      <Route path="/programs" element={<ProgramsPage/>}/>
      <Route path="/ayurveda" element={<Navigate to="/services/ayurveda/" replace/>}/>
      <Route path="/articles" element={<ArticlesPage/>}/>
      <Route path="/articles/:slug" element={<ArticlePage/>}/>
      <Route path="/book-consultation" element={<ContactPage/>}/>
      <Route path="/contact" element={<Navigate to="/book-consultation/" replace/>}/>
      <Route path="/thank-you" element={<ThankYouPage/>}/>
      <Route path="/privacy" element={<LegalPage type="privacy"/>}/>
      <Route path="/terms" element={<LegalPage type="terms"/>}/>
      <Route path="/disclaimer" element={<LegalPage type="disclaimer"/>}/>
      <Route path="*" element={<NotFound/>}/>
    </Routes>
    <Footer/>
    <MobileActionBar/>
  </>
}
