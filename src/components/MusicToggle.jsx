import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { Icon } from '../ui'

const SRC = '/background-music.mp3'
const STORAGE_KEY = 'av-music'
const VOLUME = 0.35
const FADE_MS = 1200
// Events that count as user activation, so audio.play() is allowed.
const START_EVENTS = ['pointerup', 'keydown', 'touchend', 'click']

function readEnabled() {
  try { return window.localStorage.getItem(STORAGE_KEY) !== 'off' } catch { return true }
}

function storeEnabled(enabled) {
  try { window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off') } catch { /* storage unavailable: keep in memory only */ }
}

/** Fades the volume to `target`, then calls `done`. Returns a cancel function. */
function fade(audio, target, done = () => {}) {
  const from = audio.volume
  const start = performance.now()
  let frame = 0
  const step = (now) => {
    const k = Math.min(1, (now - start) / FADE_MS)
    audio.volume = from + (target - from) * k
    if (k < 1) frame = requestAnimationFrame(step)
    else done()
  }
  frame = requestAnimationFrame(step)
  return () => cancelAnimationFrame(frame)
}

/**
 * Looping background music. Browsers block autoplay with sound, so it starts on the visitor's first
 * click, tap or key press (unless they turned it off earlier); the file is only downloaded at that point.
 */
export default function MusicToggle() {
  const { t } = useI18n()
  const audioRef = useRef(/** @type {HTMLAudioElement | null} */ (null))
  const cancelFade = useRef(() => {})
  const wanted = useRef(false) // the visitor wants music (survives the pause while the tab is hidden)
  const chose = useRef(false) // the visitor used the button, so auto-start no longer applies
  const [playing, setPlaying] = useState(false)

  const play = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return Promise.resolve(false)
    wanted.current = true
    cancelFade.current()
    audio.volume = 0
    return audio.play()
      .then(() => { cancelFade.current = fade(audio, VOLUME); return true })
      .catch(() => { wanted.current = false; return false })
  }, [])

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    wanted.current = false
    cancelFade.current()
    cancelFade.current = fade(audio, 0, () => audio.pause())
  }, [])

  // Start on the first interaction anywhere on the page.
  useEffect(() => {
    if (!readEnabled()) return undefined
    const start = (e) => {
      if (/** @type {Element} */ (e.target).closest?.('.music-toggle')) return // the button handles itself
      if (wanted.current || chose.current) return
      play().then((started) => { if (started) remove() })
    }
    const remove = () => START_EVENTS.forEach((type) => document.removeEventListener(type, start, true))
    START_EVENTS.forEach((type) => document.addEventListener(type, start, { capture: true, passive: true }))
    return remove
  }, [play])

  // Pause while the tab is hidden; resume when the visitor comes back.
  useEffect(() => {
    const onVisibility = () => {
      const audio = audioRef.current
      if (!audio || !wanted.current) return
      if (document.hidden) audio.pause()
      else audio.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const toggle = () => {
    const next = !wanted.current
    chose.current = true
    storeEnabled(next)
    if (!next) pause()
    else play()
  }

  return <>
    <button type="button" className={`music-toggle ${playing ? 'is-playing' : ''}`} aria-pressed={playing} aria-label={t('nav.music')} title={t('nav.music')} onClick={toggle}>
      <Icon name={playing ? 'sound' : 'mute'}/>
      <span className="music-bars" aria-hidden="true"><i/><i/><i/></span>
    </button>
    <audio ref={audioRef} src={SRC} loop preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}/>
  </>
}
