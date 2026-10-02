import { ContactCTA, PageHero, ProgramStack } from '../components/Blocks'
import { PROGRAMS } from '../data'
import { useI18n, usePageTitle } from '../i18n'

export default function ProgramsPage() {
  const { t } = useI18n()
  usePageTitle(t('programs.eyebrow'))
  return <main id="main-content">
    <PageHero eyebrow={t('programs.eyebrow')} title={t('programs.pageTitle')} lead={t('programs.pageLead')} image={PROGRAMS[0].image} crumbs={[[t('nav.programs'), '/programs/']]}/>
    <section className="section programs programs-page">
      <div className="container stack-solo"><ProgramStack headingLevel="h2"/></div>
    </section>
    <ContactCTA/>
  </main>
}
