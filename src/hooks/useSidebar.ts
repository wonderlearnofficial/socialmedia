import { useEffect, useState } from 'react'

const COLLAPSE_BREAKPOINT = 1200 // Auto-collapse when window width < 1200px
const STORAGE_KEY = 'wl-sidebar-collapsed'

export function useSidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) return saved === 'true'
    return window.innerWidth < COLLAPSE_BREAKPOINT
  })

  // Track window resize to auto-collapse/expand when crossing the breakpoint
  useEffect(() => {
    let lastWidth = window.innerWidth

    const handleResize = () => {
      const currentWidth = window.innerWidth
      // If crossing from >= 1200 to < 1200, automatically collapse
      if (lastWidth >= COLLAPSE_BREAKPOINT && currentWidth < COLLAPSE_BREAKPOINT) {
        setCollapsed(true)
      }
      // If crossing from < 1200 to >= 1200, automatically expand
      else if (lastWidth < COLLAPSE_BREAKPOINT && currentWidth >= COLLAPSE_BREAKPOINT) {
        setCollapsed(false)
      }
      lastWidth = currentWidth
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  const setManualCollapsed = (value: boolean) => {
    setCollapsed(value)
    localStorage.setItem(STORAGE_KEY, String(value))
  }

  return {
    collapsed,
    toggle,
    setCollapsed: setManualCollapsed,
  }
}
