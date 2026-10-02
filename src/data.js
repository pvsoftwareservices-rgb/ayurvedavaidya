// Language-independent site data. All visible copy lives in src/i18n/*.js.
// Images are referenced by manifest key ("folder/name"); see components/Picture.jsx and scripts/build-images.mjs.

export const CONTACT = {
  email: 'info@ayurvedavaidya.com',
  emailHref: 'mailto:info@ayurvedavaidya.com',
  phone: '+91 78959 11809',
  phoneHref: 'tel:+917895911809',
  whatsapp: '917895911809',
}

export const LOGO = 'brand/ayurvedavaidya-logo'

export const DOCTOR_IMAGES = {
  portrait: 'people/dr-tejendra-singh-portrait',
  desk: 'people/dr-tejendra-singh-desk',
  profile: 'people/dr-tejendra-singh-profile',
}

export const QUALIFICATIONS = ['BAMS', 'MD (Ayu.)', 'MAPC (Clin. Psych.)', 'DNHE', 'CCIC', 'CCIM', 'PhD Ayurveda (Sch.)']

/** `articles` and `programs` drive the cross-links between service, program and journal pages. */
export const SERVICES = [
  { key: 'ayurveda', icon: 'leaf', image: 'illustrations/service-nadi-pariksha', articles: ['understanding-prakriti'], programs: ['rejuvenation', 'preventive'] },
  { key: 'nutrition', icon: 'bowl', image: 'illustrations/service-ayurvedic-diet', articles: ['balanced-ayurvedic-plate'], programs: ['metabolic'] },
  { key: 'yoga', icon: 'lotus', image: 'illustrations/service-therapeutic-yoga', articles: ['breath-movement-stress'], programs: ['stress'] },
  { key: 'mind-body-wellness', icon: 'mind', image: 'illustrations/service-counselling', articles: ['breath-movement-stress'], programs: ['stress'] },
]

export const PROGRAMS = [
  { key: 'rejuvenation', image: 'illustrations/service-shirodhara', service: 'ayurveda' },
  { key: 'metabolic', image: 'editorial/program-metabolic', service: 'nutrition' },
  { key: 'stress', image: 'editorial/program-stress-sleep', service: 'mind-body-wellness' },
  { key: 'preventive', image: 'illustrations/service-dinacharya', service: 'ayurveda' },
]

export const PROCESS_IMAGES = ['illustrations/service-online-consultation', 'illustrations/service-health-assessment', 'illustrations/service-dinacharya', DOCTOR_IMAGES.desk]

export const GALLERY = ['clinic/clinic-visit-01', 'clinic/clinic-visit-03', 'clinic/clinic-visit-04', 'clinic/clinic-visit-02', 'clinic/clinic-visit-05', DOCTOR_IMAGES.profile]

// Real client meetups, academic events and yoga sessions for the homepage hero wall, split into three drifting columns.
const clientPhoto = (n, kind) => ({ image: `community/client-${String(n).padStart(2, '0')}`, kind })
export const CLIENT_WALL = [
  [clientPhoto(6, 'meetup'), clientPhoto(9, 'event'), clientPhoto(1, 'meetup'), clientPhoto(14, 'yoga'), clientPhoto(12, 'meetup')],
  [clientPhoto(2, 'meetup'), clientPhoto(8, 'yoga'), clientPhoto(13, 'meetup'), clientPhoto(11, 'event'), clientPhoto(4, 'meetup')],
  [clientPhoto(7, 'meetup'), clientPhoto(15, 'event'), clientPhoto(10, 'meetup'), clientPhoto(3, 'meetup'), clientPhoto(16, 'yoga'), clientPhoto(5, 'yoga')],
]
export const CLIENT_AVATARS = [6, 12, 2, 7].map((n) => `community/client-${String(n).padStart(2, '0')}`)

/** `published` = the date the article was first added to the site (git history, commit 53e996b) — confirm with the client, `service` = related service. */
export const POSTS = [
  { slug: 'understanding-prakriti', image: 'editorial/article-prakriti', minutes: 5, published: '2026-09-23', service: 'ayurveda' },
  { slug: 'balanced-ayurvedic-plate', image: 'editorial/article-nutrition', minutes: 4, published: '2026-09-23', service: 'nutrition' },
  { slug: 'breath-movement-stress', image: 'editorial/article-breathing', minutes: 6, published: '2026-09-23', service: 'yoga' },
]

export const IMAGES = {
  hero: 'illustrations/hero-clinic',
  cta: 'illustrations/cta-botanical',
  online: 'illustrations/service-online-consultation',
  booking: 'illustrations/service-health-assessment',
}

// Same-site PHP handler (public/api/contact.php) that sends each enquiry through the clinic's own
// Zoho mailbox over SMTP. Credentials live on the server only — see docs/HOSTINGER-SMTP-SETUP.md.
export const FORM_ENDPOINT = '/api/contact.php'
export const THANK_YOU_PATH = '/thank-you/'
