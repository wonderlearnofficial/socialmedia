import type { Company, Project } from '@/types'

/**
 * The one colour system for the Time Tracker.
 *
 * THE RULE: a company owns a hue; every project under it is that same hue at a
 * different lightness. A project can therefore never be blue while its company
 * is pink — which is exactly what used to happen, because the company honoured
 * its chosen colour while its projects derived a hue from a hash. Both now come
 * from one place: the company's *effective* hue.
 *
 * Every surface — company card, project card, entry-row dots, the daily chart,
 * legends — reads from `createPalette`. Nothing hardcodes a colour per
 * component, so they cannot drift apart.
 *
 * Colour is never the only signal: every dot in the UI is paired with its text
 * label, and the hue ring below is spaced so the families stay separable under
 * deuteranopia and protanopia (it deliberately avoids relying on a red/green
 * distinction alone, mixing in the blue–yellow axis both dichromacies keep).
 */

/** Eight base hues, ~45° apart. Green (152) and red (12) are far enough apart
 *  in lightness and saturation to survive red/green colour blindness, and the
 *  running-green (#34D399, hue 160) and stop-red (#F87171, hue 0) used by the
 *  timer are excluded from the ring so a company can never impersonate them. */
const COMPANY_HUES = [199, 262, 32, 320, 217, 96, 174, 285]

/**
 * Shades available to projects inside one company. Five is the practical
 * ceiling: below about 10 points of lightness apart, two shades of the same hue
 * stop being reliably distinguishable on a dark surface.
 *
 * Past five projects the shades cycle. That's deliberate — a sixth project
 * repeating the first project's shade is survivable because the name is always
 * rendered next to the dot, whereas inventing an out-of-family hue would break
 * the one rule this system exists to guarantee.
 */
const PROJECT_SHADES = [
  { sat: 68, light: 64 },
  { sat: 82, light: 74 },
  { sat: 58, light: 54 },
  { sat: 90, light: 82 },
  { sat: 48, light: 46 },
]

export const MAX_DISTINCT_PROJECT_SHADES = PROJECT_SHADES.length

const NEUTRAL = 'hsl(215 10% 58%)'

/** Stable across sessions, sort order and new companies: it depends only on
 *  the row's own id. Hashing the *name* would re-colour everything on rename. */
function hash(value: string) {
  let h = 0
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Hue of a #rrggbb colour, so a company's chosen swatch still drives its
 *  projects' shades rather than being a special case. */
export function hueFromHex(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const int = parseInt(m[1], 16)
  const r = ((int >> 16) & 255) / 255
  const g = ((int >> 8) & 255) / 255
  const b = (int & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return Math.round((h * 60 + 360) % 360)
}

export function shadeOfHue(hue: number, index: number) {
  const step = PROJECT_SHADES[index % PROJECT_SHADES.length]
  return `hsl(${hue} ${step.sat}% ${step.light}%)`
}

export interface Palette {
  /** Colour for a project id. Always a shade of its company's hue. */
  project: (projectId: string | undefined) => string
  /** Colour for a company id. */
  company: (companyId: string | undefined) => string
  /** The hue a company owns — what the project shades are built from. */
  hueOf: (companyId: string | undefined) => number | null
  /** The in-family shades a company's projects may use, for the picker. */
  shadesFor: (companyId: string | undefined) => string[]
}

export function createPalette(companies: Company[], projects: Project[]): Palette {
  // One effective hue per company, whether it was chosen or derived. This is
  // the single source both the company colour and its project shades read.
  const hueByCompany = new Map<string, number>()
  const companyCss = new Map<string, string>()

  // Chosen colours are absolute — they're what someone asked for.
  const taken: number[] = []
  for (const c of companies) {
    if (!c.color) continue
    const hue = hueFromHex(c.color)
    if (hue === null) continue
    hueByCompany.set(c.id, hue)
    companyCss.set(c.id, c.color)
    taken.push(hue)
  }

  // Derived hues then avoid what's already taken. Without this a hashed hue can
  // land beside a chosen one — which is how Jisra and ALS both ended up
  // magenta. Assignment walks companies in id order and only ever *skips*, so
  // adding a company later doesn't recolour the ones before it.
  const tooClose = (hue: number) =>
    taken.some((t) => {
      const d = Math.abs(((hue - t + 540) % 360) - 180)
      return 180 - d < 40
    })

  for (const c of [...companies].sort((a, b) => a.id.localeCompare(b.id))) {
    if (hueByCompany.has(c.id)) continue
    const start = hash(c.id) % COMPANY_HUES.length
    let hue = COMPANY_HUES[start]
    for (let i = 0; i < COMPANY_HUES.length; i += 1) {
      const candidate = COMPANY_HUES[(start + i) % COMPANY_HUES.length]
      if (!tooClose(candidate)) {
        hue = candidate
        break
      }
    }
    hueByCompany.set(c.id, hue)
    companyCss.set(c.id, `hsl(${hue} 68% 64%)`)
    taken.push(hue)
  }

  // Rank projects alphabetically inside their company so siblings can't collide
  // on a shade, and so the assignment is stable regardless of insert order.
  const byCompany = new Map<string, Project[]>()
  for (const p of projects) {
    const list = byCompany.get(p.companyId)
    if (list) list.push(p)
    else byCompany.set(p.companyId, [p])
  }

  const projectCss = new Map<string, string>()
  for (const [companyId, list] of byCompany) {
    const hue = hueByCompany.get(companyId) ?? COMPANY_HUES[hash(companyId) % COMPANY_HUES.length]
    const ranked = [...list].sort((a, b) => a.name.localeCompare(b.name))
    ranked.forEach((p, i) => {
      // A stored project colour is honoured only for its *lightness*: the hue
      // always comes from the company, so an old out-of-family value can't
      // resurface as a blue project under a pink company.
      projectCss.set(p.id, shadeOfHue(hue, i))
    })
  }

  return {
    project: (id) => (id ? (projectCss.get(id) ?? NEUTRAL) : NEUTRAL),
    company: (id) => (id ? (companyCss.get(id) ?? NEUTRAL) : NEUTRAL),
    hueOf: (id) => (id ? (hueByCompany.get(id) ?? null) : null),
    shadesFor: (id) => {
      const hue = id ? hueByCompany.get(id) : undefined
      if (hue === undefined) return []
      return PROJECT_SHADES.map((_, i) => shadeOfHue(hue, i))
    },
  }
}
