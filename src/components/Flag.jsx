// Simplified inline flags: emoji flags do not render on Windows, and these stay crisp at 20px.
const tricolour = (a, b, c, vertical = true) => vertical
  ? <><rect width="8" height="16" fill={a}/><rect x="8" width="8" height="16" fill={b}/><rect x="16" width="8" height="16" fill={c}/></>
  : <><rect width="24" height="5.34" fill={a}/><rect y="5.33" width="24" height="5.34" fill={b}/><rect y="10.66" width="24" height="5.34" fill={c}/></>

const FLAGS = {
  gb: <>
    <rect width="24" height="16" fill="#012169"/>
    <path d="M0 0 24 16M24 0 0 16" stroke="#fff" strokeWidth="3.2"/>
    <path d="M0 0 24 16M24 0 0 16" stroke="#C8102E" strokeWidth="1.2"/>
    <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5"/>
    <path d="M12 0v16M0 8h24" stroke="#C8102E" strokeWidth="3"/>
  </>,
  de: tricolour('#000', '#DD0000', '#FFCE00', false),
  fr: tricolour('#002654', '#fff', '#CE1126'),
  it: tricolour('#009246', '#fff', '#CE2B37'),
  es: <><rect width="24" height="16" fill="#AA151B"/><rect y="4" width="24" height="8" fill="#F1BF00"/></>,
  ae: <><rect width="24" height="5.34" fill="#00732F"/><rect y="5.33" width="24" height="5.34" fill="#fff"/><rect y="10.66" width="24" height="5.34" fill="#000"/><rect width="6.5" height="16" fill="#FF0000"/></>,
  ru: tricolour('#fff', '#0039A6', '#D52B1E', false),
  jp: <><rect width="24" height="16" fill="#fff"/><circle cx="12" cy="8" r="4.6" fill="#BC002D"/></>,
  cn: <><rect width="24" height="16" fill="#DE2910"/><path d="m4.8 2.2.9 2.7h2.8l-2.3 1.7.9 2.7-2.3-1.7-2.3 1.7.9-2.7L.9 4.9h2.8Z" fill="#FFDE00"/><g fill="#FFDE00"><circle cx="9.6" cy="1.8" r=".75"/><circle cx="11" cy="3.5" r=".75"/><circle cx="11" cy="5.9" r=".75"/><circle cx="9.6" cy="7.6" r=".75"/></g></>,
  nl: tricolour('#AE1C28', '#fff', '#21468B', false),
  pt: <><rect width="24" height="16" fill="#FF0000"/><rect width="9.6" height="16" fill="#006600"/><circle cx="9.6" cy="8" r="3.4" fill="#FFCC00"/><circle cx="9.6" cy="8" r="2.2" fill="#FF0000"/><circle cx="9.6" cy="8" r="1.3" fill="#fff"/></>,
  in: <><rect width="24" height="5.34" fill="#FF9933"/><rect y="5.33" width="24" height="5.34" fill="#fff"/><rect y="10.66" width="24" height="5.34" fill="#138808"/><circle cx="12" cy="8" r="2.1" fill="none" stroke="#000080" strokeWidth=".6"/><circle cx="12" cy="8" r=".5" fill="#000080"/></>,
}

/** @param {{ code: string, className?: string }} props */
export default function Flag({ code, className = '' }) {
  return <svg className={`flag ${className}`} viewBox="0 0 24 16" aria-hidden="true" focusable="false">{FLAGS[code]}</svg>
}
