import { Link } from 'react-router-dom'

const ICONS = {
  leaf: <><path d="M5 19c0-8 5-14 15-15-.5 9.5-6 15-15 15Z"/><path d="M5 19 14 10"/></>,
  lotus: <><path d="M12 19c-3.5-2.5-4.5-6.5 0-12 4.5 5.5 3.5 9.5 0 12Z"/><path d="M12 19c-5-.5-8-3.5-8.5-8 4 .3 7 2.8 8.5 8Zm0 0c5-.5 8-3.5 8.5-8-4 .3-7 2.8-8.5 8Z"/></>,
  bowl: <><path d="M3 12h18c-.6 5-4.4 8-9 8s-8.4-3-9-8Z"/><path d="M9 12c-1.5-2.5-.5-5 2-6m2 6c1-3 3.5-4.5 6-4"/></>,
  mind: <><path d="M9.5 20v-3.2C6.9 15.8 5 13.3 5 10.2 5 6.2 8.1 3 12 3s7 3.2 7 7.2c0 1.1-.3 2.2-.8 3.1L20 16l-2 .5V19a1 1 0 0 1-1 1h-2"/><path d="M12 7.5c1.8 0 2.8 1.2 2.8 2.6 0 1.7-1.6 2.3-2.8 3.4-1.2-1.1-2.8-1.7-2.8-3.4 0-1.4 1-2.6 2.8-2.6Z"/></>,
  phone: <path d="M6.6 3.5 9 3.3l1.6 4.1-2 1.4a11.5 11.5 0 0 0 6.6 6.6l1.4-2 4.1 1.6-.2 2.4a2 2 0 0 1-2 1.8C10.3 19.2 4.8 13.7 4.8 5.5a2 2 0 0 1 1.8-2Z"/>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></>,
  pin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.4"/></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10.5 5-3v9l-5-3"/></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5"/>,
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9S14.6 18.4 12 21c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3Z"/></>,
  chevron: <path d="m6 9 6 6 6-6"/>,
  close: <path d="M6 6l12 12M18 6 6 18"/>,
  left: <path d="m15 5-7 7 7 7"/>,
  right: <path d="m9 5 7 7-7 7"/>,
  arrow: <path d="M4 12h15m-5-6 6 6-6 6"/>,
  quote: <path d="M10 7H6.5A2.5 2.5 0 0 0 4 9.5V13h5v5H4m16-11h-3.5A2.5 2.5 0 0 0 14 9.5V13h5v5h-5"/>,
  shield: <><path d="M12 3 19 6c0 7.5-2.8 11.8-7 14-4.2-2.2-7-6.5-7-14Z"/><path d="m8.8 12 2.3 2.3 4.3-4.6"/></>,
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z"/>,
  spark: <path d="M12 3c.6 4.5 2.5 6.9 7 8-4.5 1.1-6.4 3.5-7 8-.6-4.5-2.5-6.9-7-8 4.5-1.1 6.4-3.5 7-8Z"/>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4m8-4v4"/></>,
  chat: <path d="M12 3.5a8.5 8.5 0 0 0-7.4 12.7L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5Zm-3 5.2c.3-.4.7-.4 1-.2l.9 1.9c.1.3 0 .6-.2.8l-.5.6c.6 1.2 1.6 2.2 2.8 2.8l.6-.5c.2-.2.5-.3.8-.2l1.9.9c.2.3.2.7-.2 1-.9.9-2.3 1-3.6.4a8.6 8.6 0 0 1-3.9-3.9c-.6-1.3-.5-2.7.4-3.6Z"/>,
  zoom: <><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M11 8.5v5m-2.5-2.5h5"/></>,
}

/** @param {{ name?: string, className?: string, size?: number }} props */
export function Icon({ name = 'leaf', className = '', size = undefined }) {
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true" focusable="false">{ICONS[name] || ICONS.leaf}</svg>
}

/** Sets the fill origin so the colour wash grows from where the pointer enters and retreats where it leaves. */
function trackPointer(event) {
  const el = event.currentTarget
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${event.clientX - rect.left}px`)
  el.style.setProperty('--my', `${event.clientY - rect.top}px`)
}

/**
 * Link (`to`, client-side), anchor (`href`) or button, styled as a button.
 * @param {{ to?: string, href?: string, children?: import('react').ReactNode, variant?: string, icon?: string | null, className?: string,
 *   type?: 'button' | 'submit', [attr: string]: any }} props
 */
export function Button({ to = undefined, href = undefined, children = null, variant = 'gold', icon = 'arrow', className = '', type = 'button', ...rest }) {
  const classes = `btn btn-${variant} ${className}`
  const content = <><span className="btn-label">{children}</span>{icon && <Icon name={icon} className="btn-icon"/>}</>
  const pointer = { onPointerEnter: trackPointer, onPointerLeave: trackPointer }
  if (to) return <Link className={classes} to={to} {...pointer} {...rest}>{content}</Link>
  if (href) return <a className={classes} href={href} {...pointer} {...rest}>{content}</a>
  return <button className={classes} type={type} {...pointer} {...rest}>{content}</button>
}

/** @param {{ children?: import('react').ReactNode, light?: boolean }} props */
export function Eyebrow({ children = null, light = false }) {
  return <p className={`eyebrow ${light ? 'eyebrow-light' : ''}`}><span className="eyebrow-mark" aria-hidden="true"/>{children}</p>
}

/** @param {{ eyebrow: string, title: string, lead?: string, light?: boolean, align?: string, id?: string, children?: import('react').ReactNode }} props */
export function SectionHead({ eyebrow, title, lead = undefined, light = false, align = 'left', id = undefined, children = null }) {
  return <div className={`section-head align-${align}`}>
    <div>
      <Eyebrow light={light}>{eyebrow}</Eyebrow>
      <h2 id={id}>{title}</h2>
      {lead && <p className="section-lead">{lead}</p>}
    </div>
    {children}
  </div>
}
