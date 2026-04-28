import { useEffect, useState } from "react"

const MOBILE_BREAKPOINT_PX = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX}px)`

/**
 * Returns whether the viewport is at or below the mobile breakpoint.
 *
 * SSR-safe: defaults to false on the server and resolves on first client
 * render. Updates live as the viewport crosses the breakpoint.
 */
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof globalThis.matchMedia !== "function") return false
    return globalThis.matchMedia(MOBILE_QUERY).matches
  })

  useEffect(() => {
    const mql = globalThis.matchMedia(MOBILE_QUERY)
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }
    setIsMobile(mql.matches)
    mql.addEventListener("change", handleChange)
    return () => {
      mql.removeEventListener("change", handleChange)
    }
  }, [])

  return isMobile
}
