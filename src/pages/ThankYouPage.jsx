import { PageHero } from '../components/Blocks'
import { CONTACT, IMAGES } from '../data'
import { useI18n, usePageTitle } from '../i18n'
import { Button } from '../ui'
import { HelpfulLinks } from './NotFound'

/** Landing page after a successful enquiry (JavaScript redirect or the no-JS 303). Kept out of search results. */
export default function ThankYouPage() {
  const { t } = useI18n()
  usePageTitle(t('thankYou.title'))
  return <main id="main-content">
    <PageHero eyebrow={t('thankYou.eyebrow')} title={t('thankYou.title')} lead={t('thankYou.lead')} image={IMAGES.cta}>
      <p className="thank-you-note">{t('thankYou.urgent')} <a href={CONTACT.phoneHref}>{CONTACT.phone}</a></p>
      <div className="btn-row">
        <Button to="/">{t('notFound.home')}</Button>
        <Button to="/articles/" variant="glass">{t('journal.viewAll')}</Button>
      </div>
    </PageHero>
    <HelpfulLinks title={t('thankYou.linksTitle')}/>
  </main>
}
