import * as React from 'react'

/** A screen too short for the stacked layout, such as a phone held sideways. Matches the `short:` variant. */
const QUERY = '(max-height: 520px)'

export function useShortScreen() {
  const [short, setShort] = React.useState(() => typeof window !== 'undefined' && window.matchMedia(QUERY).matches)
  React.useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const on = () => setShort(mql.matches)
    on()
    mql.addEventListener('change', on)
    return () => mql.removeEventListener('change', on)
  }, [])
  return short
}
