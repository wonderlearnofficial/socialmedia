import { useMediaQuery } from './useMediaQuery'

/** True when the user asked the OS to minimize animation. */
export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}
