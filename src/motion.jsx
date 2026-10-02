import { useEffect, useRef, useState } from 'react'

const clamp = (value) => Math.min(1, Math.max(0, value))

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Reveals children once they enter the viewport.
 * Variants: up | left | right | scale | clip | fade
 */
/**
 * @param {{ as?: any, variant?: string, delay?: number, className?: string, style?: import('react').CSSProperties,
 *   children?: import('react').ReactNode, [attr: string]: any }} props
 */
export function Reveal({ as: Tag = 'div', variant = 'up', delay = 0, className = '', style = undefined, children = null, ...rest }) {
  const ref = useRef(null)
  // Kept in state (not classList) so re-renders that change `className` never drop the visible state.
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (!('IntersectionObserver' in window) || prefersReducedMotion()) { setVisible(true); return undefined }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return <Tag ref={ref} className={`reveal reveal-${variant} ${visible ? 'is-visible' : ''} ${className}`} style={{ ...style, '--delay': `${delay}ms` }} {...rest}>{children}</Tag>
}

/**
 * Writes scroll progress (0 → 1) into the element's `--p` CSS variable without React re-renders.
 * - through: element entering the bottom edge (0) until it leaves the top edge (1)
 * - exit:    element top at viewport top (0) until the element has fully scrolled away (1)
 * - pin:     tall section with a sticky child; 0 at pin start, 1 at pin end
 */
/**
 * @param {import('react').RefObject<HTMLElement>} ref
 * @param {{ mode?: 'through' | 'exit' | 'pin', onProgress?: (progress: number) => void }} [options]
 */
export function useScrollProgress(ref, { mode = 'through', onProgress = undefined } = {}) {
  const callbackRef = useRef(onProgress)
  callbackRef.current = onProgress

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const reduced = prefersReducedMotion()
    let frame = 0

    const update = () => {
      frame = 0
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight
      let progress
      if (mode === 'pin') progress = clamp(-rect.top / Math.max(1, rect.height - vh))
      else if (mode === 'exit') progress = clamp(-rect.top / Math.max(1, rect.height))
      else progress = clamp((vh - rect.top) / (vh + rect.height))
      const visual = reduced && mode !== 'pin' ? (mode === 'exit' ? 0 : 0.5) : progress
      el.style.setProperty('--p', visual.toFixed(4))
      callbackRef.current?.(progress)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [ref, mode])
}

/** Counts up from 0 to `to` once visible. */
export function Counter({ to, duration = 1600 }) {
  const ref = useRef(null)
  const [value, setValue] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) { setValue(to); return undefined }
    let frame = 0
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      const start = performance.now()
      const tick = (now) => {
        const t = clamp((now - start) / duration)
        setValue(Math.round(to * (1 - Math.pow(1 - t, 3))))
        if (t < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }, { threshold: 0.6 })
    observer.observe(el)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [to, duration])
  return <span ref={ref} className="counter">{value}</span>
}

/** Pointer-driven 3D tilt and spotlight for cards (mouse only; touch uses :active styles). */
export const tilt = {
  onPointerMove(event) {
    if (event.pointerType !== 'mouse') return
    const el = event.currentTarget
    const rect = el.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    el.style.setProperty('--rx', `${((0.5 - y) * 6).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${((x - 0.5) * 8).toFixed(2)}deg`)
    el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`)
    el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`)
  },
  onPointerLeave(event) {
    const style = event.currentTarget.style
    style.removeProperty('--rx')
    style.removeProperty('--ry')
  },
}
