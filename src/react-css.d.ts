// Inline CSS custom properties such as style={{ '--delay': '80ms' }} (JS type check only).
import 'react'

declare module 'react' {
  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined
  }
}
