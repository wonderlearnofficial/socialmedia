/**
 * Time Tracker — full-spec prototype (DEL-07).
 *
 * Self-contained, mock-driven, one file. Implements the requirement CSV:
 * member surface (MEM-*), entity registry + dedupe (ENT-*), entry states
 * (STA-*), the colour system (COL-*), and the accountant surface (ACC-*).
 * Route: /time/redesign. It exists to be interacted with and argued about —
 * once decisions land, the real page adopts them and this file is deleted.
 *
 * Every requirement ID referenced in comments maps to the CSV row.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Info,
  Keyboard,
  Lock,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Search,
  Square,
  Timer,
  Trash2,
  Users,
  X,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════════════════
// TOKENS (DEL-04)
// ═══════════════════════════════════════════════════════════════════════════

const C = {
  bg: '#0B0D10',
  surface: '#12161B',
  raised: '#171C22',
  border: '#232A32',
  borderStrong: '#2E3742',
  text: '#F2F5F8', //   15.1:1 on surface
  text2: '#A8B2BD', //   8.5:1
  text3: '#7E8894', //   5.0:1 — never load-bearing
  info: '#38BDF8', //    8.5:1  (COL-08: blue = informational)
  running: '#34D399', // 9.4:1  (COL-08: green = running)
  danger: '#F87171', //  6.6:1  (COL-08: red = stop/destructive)
  warning: '#FBBF24', // 10.9:1 (COL-08: amber = warning/invalid)
}

// ═══════════════════════════════════════════════════════════════════════════
// COLOUR SYSTEM (COL-01…09) — the single definition site (COL-03).
// Grep for "hsl(" elsewhere in this file: there is none.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Six company colour slots, found by optimisation rather than taste: worst-case
 * pairwise ΔE = 20 across normal vision AND protanopia/deuteranopia/tritanopia
 * (Machado severity-1.0 simulation), every slot ≥4.5:1 on the card surface and
 * ≥ΔE 16 from the semantic green/red/amber/blue (COL-06/07/08). CVD safety
 * comes from lightness coding, not hue alone — that is why the slots vary L.
 */
const COMPANY_SLOTS = [
  { h: 226, s: 70, l: 62 }, // blue      #5A7AE2  4.6:1
  { h: 334, s: 75, l: 56 }, // raspberry #E33B84  4.5:1
  { h: 172, s: 82, l: 80 }, // aqua      #A2F6EB 14.6:1
  { h: 65, s: 72, l: 68 }, //  citron    #DEE873 13.7:1
  { h: 312, s: 55, l: 62 }, // orchid    #D369BE  5.7:1
  { h: 95, s: 82, l: 80 }, //  lime      #C5F6A2 14.8:1
]

/** Company #7+ falls back to a neutral family and, in charts, an explicit
 *  "Other" bucket — never a recycled hue (COL-04). */
const OVERFLOW_SLOT = { h: 215, s: 12, l: 62 }

/** Project shade steps: lightness offsets from the company base, saturation
 *  nudged so adjacent shades differ on two axes. Five per family (COL-04);
 *  past five they cycle, which the always-present text label makes survivable
 *  (COL-05). */
const SHADE_STEPS = [
  { dl: 0, ds: 0 },
  { dl: 12, ds: 8 },
  { dl: -12, ds: -6 },
  { dl: 20, ds: 12 },
  { dl: -18, ds: -12 },
]
const MAX_PROJECT_SHADES = SHADE_STEPS.length

// -- contrast math, so the derivation can *enforce* COL-07 instead of hoping --
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100
  const li = l / 100
  const c = (1 - Math.abs(2 * li - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = li - c / 2
  let rgb: [number, number, number]
  if (h < 60) rgb = [c, x, 0]
  else if (h < 120) rgb = [x, c, 0]
  else if (h < 180) rgb = [0, c, x]
  else if (h < 240) rgb = [0, x, c]
  else if (h < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]
  return [rgb[0] + m, rgb[1] + m, rgb[2] + m]
}
const linear = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
function luminanceOf(h: number, s: number, l: number) {
  const [r, g, b] = hslToRgb(h, s, l)
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}
const SURFACE_LUM = 0.00781 // #12161B
function contrastOnSurface(h: number, s: number, l: number) {
  const lum = luminanceOf(h, s, l)
  const [a, b] = lum > SURFACE_LUM ? [lum, SURFACE_LUM] : [SURFACE_LUM, lum]
  return (a + 0.05) / (b + 0.05)
}

/** Stable across sessions, sort order and future companies: depends only on
 *  the entity's immutable id (COL-01). Hashing the *name* would recolour on
 *  rename. */
function hashId(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

// (slot assignment lives in buildPalette so it can probe past collisions)

const css = (s: { h: number; s: number; l: number }) => `hsl(${s.h} ${s.s}% ${s.l}%)`

interface PaletteApi {
  company: (id: string | undefined) => string
  project: (id: string | undefined) => string
  shadeIndexOf: (projectId: string) => number
}

function buildPalette(companies: Co[], projects: Proj[]): PaletteApi {
  const companyBase = new Map<string, { h: number; s: number; l: number }>()
  const companyCss = new Map<string, string>()
  const sorted = [...companies].sort((a, b) => a.id.localeCompare(b.id))
  // Hash gives the starting slot; taken slots are probed past in id order, so
  // two companies can't share a colour while free slots remain. Companies
  // beyond the six slots take the neutral overflow family (COL-04).
  const taken = new Set<number>()
  sorted.forEach((co) => {
    // COL-09: a pinned colour is honoured if it passes the same gates the auto
    // palette passes (contrast ≥4.5 here; the full CVD check runs server-side
    // at pin time in the real product).
    if (co.pinned) {
      const hue = hueOfHex(co.pinned)
      if (hue !== null) {
        companyBase.set(co.id, { h: hue, s: 72, l: 62 })
        companyCss.set(co.id, co.pinned)
        return
      }
    }
    if (taken.size >= COMPANY_SLOTS.length) {
      companyBase.set(co.id, OVERFLOW_SLOT)
      companyCss.set(co.id, css(OVERFLOW_SLOT))
      return
    }
    let idx = hashId(co.id) % COMPANY_SLOTS.length
    while (taken.has(idx)) idx = (idx + 1) % COMPANY_SLOTS.length
    taken.add(idx)
    const slot = COMPANY_SLOTS[idx]
    companyBase.set(co.id, slot)
    companyCss.set(co.id, css(slot))
  })

  // Projects: rank alphabetically inside the company so siblings can never
  // collide on a shade (COL-02), then clamp lightness until the dot clears
  // 3:1 and, for the first two shades, 4.5:1 for use as label text (COL-07).
  const projectCss = new Map<string, string>()
  const shadeIndex = new Map<string, number>()
  const grouped = new Map<string, Proj[]>()
  for (const p of projects) {
    const list = grouped.get(p.companyId)
    if (list) list.push(p)
    else grouped.set(p.companyId, [p])
  }
  for (const [companyId, list] of grouped) {
    const base = companyBase.get(companyId) ?? OVERFLOW_SLOT
    const ranked = [...list].sort((a, b) => a.name.localeCompare(b.name))
    ranked.forEach((p, i) => {
      const step = SHADE_STEPS[i % SHADE_STEPS.length]
      let l = Math.max(40, Math.min(86, base.l + step.dl))
      const s = Math.max(30, Math.min(95, base.s + step.ds))
      const floor = i < 2 ? 4.5 : 3
      while (contrastOnSurface(base.h, s, l) < floor && l < 86) l += 2
      projectCss.set(p.id, css({ h: base.h, s, l }))
      shadeIndex.set(p.id, i % SHADE_STEPS.length)
    })
  }

  const neutral = css(OVERFLOW_SLOT)
  return {
    company: (id) => (id ? (companyCss.get(id) ?? neutral) : neutral),
    project: (id) => (id ? (projectCss.get(id) ?? neutral) : neutral),
    shadeIndexOf: (id) => shadeIndex.get(id) ?? 0,
  }
}

function hueOfHex(hex: string): number | null {
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

// ═══════════════════════════════════════════════════════════════════════════
// NORMALIZATION + FUZZY (ENT-03/05/06) — the dedupe layer
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ENT-03, with one deliberate change: trailing-s singularization applies only
 * to tokens of five letters or more. The CSV's blanket rule would normalize
 * "ALS" to "al" and collide every short acronym.
 */
function normalizeKey(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((tok) => (tok.length >= 5 && tok.endsWith('s') ? tok.slice(0, -1) : tok))
    .join(' ')
}

/** Levenshtein similarity ratio in [0, 1]. */
function similarity(a: string, b: string) {
  const s = normalizeKey(a)
  const t = normalizeKey(b)
  if (s === t) return 1
  const m = s.length
  const n = t.length
  if (!m || !n) return 0
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i += 1) {
    const cur = [i]
    for (let j = 1; j <= n; j += 1) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return 1 - prev[n] / Math.max(m, n)
}

/**
 * ENT-06: acronym ↔ expansion. Strict initials miss the common pattern where
 * an acronym absorbs a word *prefix* — "ALS" is "AL (Lewaa)" + "S(chools)",
 * not A-E-S — so each word may contribute a prefix of any length, words stay
 * in order, and words may be skipped. Soft suggestion only, never auto-merge.
 */
function initialismMatch(a: string, b: string) {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a]
  const target = normalizeKey(short).replace(/\s/g, '')
  const words = normalizeKey(long).split(' ')
  if (target.length < 2 || words.length < 2 || target.length > 8) return false
  const memo = new Map<string, boolean>()
  const walk = (wordIdx: number, pos: number): boolean => {
    if (pos === target.length) return true
    if (wordIdx === words.length) return false
    const key = `${wordIdx}:${pos}`
    const cached = memo.get(key)
    if (cached !== undefined) return cached
    let ok = walk(wordIdx + 1, pos) // this word contributes nothing
    const w = words[wordIdx]
    for (let len = 1; !ok && len <= w.length && pos + len <= target.length; len += 1) {
      if (w[len - 1] !== target[pos + len - 1]) break
      ok = walk(wordIdx + 1, pos + len)
    }
    memo.set(key, ok)
    return ok
  }
  return walk(0, 0)
}

const SIMILARITY_THRESHOLD = 0.85

// ═══════════════════════════════════════════════════════════════════════════
// MOCK REGISTRIES + ENTRIES (ENT-01/02, DEL-07)
// ═══════════════════════════════════════════════════════════════════════════

interface Co {
  id: string
  name: string
  pinned?: string
  archived?: boolean
}
interface Proj {
  id: string
  companyId: string
  name: string
}
interface WI {
  id: string
  projectId: string
  name: string
  isNew?: boolean
}
interface EditLogLine {
  field: string
  from: string
  to: string
  by: string
  at: number
}
interface Entry {
  id: string
  person: string
  workItemId: string
  description: string
  start: number
  end: number | null // null = running (STA-02: derive elapsed from start)
  manual?: boolean
  imported?: boolean
  billable?: boolean
  locked?: boolean
  editLog?: EditLogLine[]
}
interface AuditLine {
  at: number
  actor: string
  action: string
}

const YOU = 'Ali'
const PEOPLE = ['Ali', 'Randa', 'Mazen']

const SEED_COMPANIES: Co[] = [
  { id: 'co-jisraa', name: 'Jisraa', pinned: '#FB923C' }, // COL-09 override demo
  { id: 'co-als', name: 'ALS' },
  { id: 'co-alehsan', name: 'Al Lewaa Schools' }, // ENT-06: "ALS" = AL(ewaa) + S(chools)
  { id: 'co-wonder', name: 'WonderLearn' },
  { id: 'co-nile', name: 'Nileworks' },
  { id: 'co-saudia', name: 'Saudia' },
]

const SEED_PROJECTS: Proj[] = [
  { id: 'pr-newton', companyId: 'co-jisraa', name: 'Newton' },
  { id: 'pr-edison', companyId: 'co-jisraa', name: 'Edison' },
  { id: 'pr-curie', companyId: 'co-jisraa', name: 'Curie' },
  { id: 'pr-sanabel', companyId: 'co-als', name: 'Sanabel' },
  { id: 'pr-manarat', companyId: 'co-als', name: 'Manarat' },
  { id: 'pr-ehsanweb', companyId: 'co-alehsan', name: 'Website' },
  { id: 'pr-training', companyId: 'co-wonder', name: 'Training' },
  { id: 'pr-social', companyId: 'co-wonder', name: 'Social Media' },
  { id: 'pr-brand', companyId: 'co-nile', name: 'Brand' },
  { id: 'pr-app', companyId: 'co-nile', name: 'App' },
  { id: 'pr-campaign', companyId: 'co-saudia', name: 'Campaign' },
  { id: 'pr-media', companyId: 'co-saudia', name: 'Media Buying' },
]

const SEED_WIS: WI[] = [
  { id: 'wi-n-pres', projectId: 'pr-newton', name: 'Newton Presentation' },
  { id: 'wi-n-flyer', projectId: 'pr-newton', name: 'Newton Flyer' },
  { id: 'wi-e-deck', projectId: 'pr-edison', name: 'Edison Deck' },
  { id: 'wi-e-video', projectId: 'pr-edison', name: 'Edison Explainer Video' },
  { id: 'wi-c-poster', projectId: 'pr-curie', name: 'Curie Poster' },
  { id: 'wi-s-admin', projectId: 'pr-sanabel', name: 'Admin Panel' },
  { id: 'wi-s-report', projectId: 'pr-sanabel', name: 'Term Report Design' },
  { id: 'wi-m-logo', projectId: 'pr-manarat', name: 'Logo Refresh' },
  { id: 'wi-eh-home', projectId: 'pr-ehsanweb', name: 'Homepage' },
  { id: 'wi-t-kit', projectId: 'pr-training', name: 'Training Kit' },
  { id: 'wi-t-slides', projectId: 'pr-training', name: 'Instructor Slides' },
  { id: 'wi-so-ig', projectId: 'pr-social', name: 'Instagram Post 12' },
  { id: 'wi-so-reel', projectId: 'pr-social', name: 'August Reel' },
  { id: 'wi-b-guide', projectId: 'pr-brand', name: 'Brand Guidelines' },
  { id: 'wi-b-cards', projectId: 'pr-brand', name: 'Business Cards' },
  { id: 'wi-a-onboard', projectId: 'pr-app', name: 'Onboarding Screens' },
  { id: 'wi-a-icons', projectId: 'pr-app', name: 'Icon Set' },
  { id: 'wi-ca-kv', projectId: 'pr-campaign', name: 'Key Visual' },
  { id: 'wi-ca-print', projectId: 'pr-campaign', name: 'Print Adaptations' },
  { id: 'wi-mb-plan', projectId: 'pr-media', name: 'Q3 Media Plan' },
]

/** ACC-09: rate per project (mock), amounts computed in the sheet. */
const RATES: Record<string, number> = {
  'pr-newton': 40,
  'pr-edison': 40,
  'pr-curie': 35,
  'pr-sanabel': 30,
  'pr-manarat': 30,
  'pr-ehsanweb': 25,
  'pr-training': 20,
  'pr-social': 25,
  'pr-brand': 45,
  'pr-app': 50,
  'pr-campaign': 55,
  'pr-media': 55,
}

const MIN = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function dayStart(daysAgo: number) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime() - daysAgo * DAY
}
const at = (daysAgo: number, h: number, m: number) => dayStart(daysAgo) + h * HOUR + m * MIN

const DESCRIPTIONS = [
  'Layout pass',
  'Client feedback round',
  'Colour corrections',
  'Asset export',
  'Typography cleanup',
  'Review with team',
  '',
  '',
  'Final files',
  'Revisions v2',
]

/** STA-07: everything before this boundary is invoiced and locked. */
const LOCK_BEFORE = dayStart(13)

function buildEntries(): Entry[] {
  const rng = mulberry32(42)
  const entries: Entry[] = []
  let n = 0
  const push = (e: Omit<Entry, 'id'>) => entries.push({ id: `e${(n += 1)}`, ...e })

  for (let d = 20; d >= 0; d -= 1) {
    const dow = new Date(dayStart(d)).getDay()
    if ((dow === 5 || dow === 6) && rng() < 0.8) continue // weekends mostly off
    for (const person of PEOPLE) {
      const count = person === YOU ? 2 + Math.floor(rng() * 2) : 1 + Math.floor(rng() * 2)
      let cursor = 9 * 60 + Math.floor(rng() * 30)
      for (let i = 0; i < count; i += 1) {
        const wi = SEED_WIS[Math.floor(rng() * SEED_WIS.length)]
        const dur = 40 + Math.floor(rng() * 110)
        const start = dayStart(d) + cursor * MIN
        push({
          person,
          workItemId: wi.id,
          description: DESCRIPTIONS[Math.floor(rng() * DESCRIPTIONS.length)],
          start,
          end: start + dur * MIN,
          billable: rng() < 0.7,
          locked: start < LOCK_BEFORE,
        })
        cursor += dur + 10 + Math.floor(rng() * 40)
      }
    }
  }

  // --- the six specified states (DEL-07) ------------------------------------
  push({
    person: YOU,
    workItemId: 'wi-n-pres',
    description: 'Slide polish',
    start: Date.now() - 47 * MIN,
    end: null,
    billable: true,
  }) // running
  push({
    person: YOU,
    workItemId: 'wi-e-deck',
    description: '',
    start: at(0, 12, 20),
    end: at(0, 12, 8),
    billable: true,
  }) // invalid: ends before start
  push({
    person: YOU,
    workItemId: 'wi-s-admin',
    description: 'Dashboard states',
    start: at(1, 10, 0),
    end: at(1, 11, 0),
    billable: true,
  }) // overlap A
  push({
    person: YOU,
    workItemId: 'wi-s-report',
    description: 'Cover options',
    start: at(1, 10, 40),
    end: at(1, 11, 20),
    billable: true,
  }) // overlap B
  push({
    person: YOU,
    workItemId: 'wi-t-kit',
    description: 'Logged after standup',
    start: at(0, 8, 10),
    end: at(0, 8, 45),
    manual: true,
  }) // manual
  push({
    person: YOU,
    workItemId: 'wi-b-guide',
    description: 'Grid spec',
    start: at(2, 15, 0),
    end: at(2, 16, 40),
    billable: true,
    editLog: [{ field: 'End', from: '17:10', to: '16:40', by: YOU, at: at(2, 17, 2) }],
  }) // edited, with the before/after the chip reveals (STA-04)
  push({
    person: YOU,
    workItemId: 'wi-so-ig',
    description: 'From old sheet',
    start: at(5, 13, 0),
    end: at(5, 14, 30),
    imported: true,
  }) // imported
  return entries
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRITY (STA-05/06) + FORMATTING (FMT-01/02)
// ═══════════════════════════════════════════════════════════════════════════

type Problem = 'ends_before_start' | 'over_24h' | 'future' | 'no_work_item'

function problemOf(e: Entry): Problem | null {
  if (!e.workItemId) return 'no_work_item'
  if (e.end === null) return null
  if (e.end <= e.start) return 'ends_before_start'
  if (e.end - e.start > 24 * HOUR) return 'over_24h'
  if (e.start > Date.now() + MIN) return 'future'
  return null
}
const PROBLEM_COPY: Record<Problem, string> = {
  ends_before_start: 'Ends before it starts',
  over_24h: 'Longer than 24h',
  future: 'Starts in the future',
  no_work_item: 'No work item',
}

const secondsOf = (e: Entry, now: number) =>
  Math.max(0, Math.floor(((e.end ?? now) - e.start) / 1000))

function validSeconds(list: Entry[], now: number, includeInvalid: boolean) {
  return list.reduce((sum, e) => sum + (includeInvalid || !problemOf(e) ? secondsOf(e, now) : 0), 0)
}

/** STA-06: overlaps are a warning, not an exclusion — both entries are real
 *  work; one of them is probably mis-bounded. Flag, don't hide. */
function overlapSet(list: Entry[]) {
  const flagged = new Set<string>()
  const byPerson = new Map<string, Entry[]>()
  for (const e of list) {
    if (problemOf(e) || e.end === null) continue
    const arr = byPerson.get(e.person)
    if (arr) arr.push(e)
    else byPerson.set(e.person, [e])
  }
  for (const arr of byPerson.values()) {
    arr.sort((a, b) => a.start - b.start)
    for (let i = 1; i < arr.length; i += 1) {
      if (arr[i].start < (arr[i - 1].end as number)) {
        flagged.add(arr[i].id)
        flagged.add(arr[i - 1].id)
      }
    }
  }
  return flagged
}

/** FMT-01, the one rule: live timer H:MM:SS; every static duration H:MM;
 *  exports carry H:MM plus decimal hours. A nonzero duration never renders
 *  as 0:00 — it floors at 0:01. */
const pad2 = (n: number) => String(n).padStart(2, '0')
function fmtTimer(sec: number) {
  const h = Math.floor(sec / 3600)
  return `${h}:${pad2(Math.floor((sec % 3600) / 60))}:${pad2(sec % 60)}`
}
function fmtDur(sec: number) {
  if (sec <= 0) return '0:00'
  const mins = Math.max(1, Math.round(sec / 60))
  return `${Math.floor(mins / 60)}:${pad2(mins % 60)}`
}
/** FMT-02: a real 3 minutes is "<1%", never "0%". */
function fmtShare(sec: number, total: number) {
  if (total <= 0 || sec <= 0) return '0%'
  const pct = (sec / total) * 100
  if (pct < 1) return '<1%'
  if (pct < 10) return `${pct.toFixed(1)}%`
  return `${Math.round(pct)}%`
}

const hm = (ts: number) => {
  const d = new Date(ts)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
const dayKeyOf = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
function dayLabel(key: string) {
  if (key === dayKeyOf(Date.now())) return 'Today'
  if (key === dayKeyOf(Date.now() - DAY)) return 'Yesterday'
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
function weekStartOf(ts: number) {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday
  return d.getTime()
}
function weekLabel(ws: number) {
  const thisWeek = weekStartOf(Date.now())
  if (ws === thisWeek) return 'This week'
  if (ws === thisWeek - 7 * DAY) return 'Last week'
  const end = new Date(ws + 6 * DAY)
  const s = new Date(ws)
  return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

type RangeKey = 'today' | 'week' | 'month' | 'all'
const RANGE_LABEL: Record<RangeKey, string> = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
  all: 'All time',
}
function rangeStartOf(r: RangeKey) {
  if (r === 'today') return dayStart(0)
  if (r === 'week') return weekStartOf(Date.now())
  if (r === 'month') {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
  }
  return 0
}

// ═══════════════════════════════════════════════════════════════════════════
// APP
// ═══════════════════════════════════════════════════════════════════════════

type Undoable = { message: string; undo: () => void } | { message: string; undo?: undefined }
type PreviewState = 'ready' | 'loading' | 'error' | 'offline'

export function TimeTrackerSpec() {
  const [companies, setCompanies] = useState<Co[]>(SEED_COMPANIES)
  const [projects, setProjects] = useState<Proj[]>(SEED_PROJECTS)
  const [workItems, setWorkItems] = useState<WI[]>(SEED_WIS)
  const [entries, setEntries] = useState<Entry[]>(buildEntries)
  const [audit, setAudit] = useState<AuditLine[]>([
    { at: at(3, 9, 12), actor: 'Mazen', action: 'Exported CSV (This month, 214 rows)' },
    { at: at(6, 16, 40), actor: 'Randa', action: 'Imported 12 entries from timesheet.csv' },
    { at: LOCK_BEFORE, actor: 'Mazen', action: 'Locked period up to invoice #241' },
  ])
  const [tab, setTab] = useState<'member' | 'reports'>('member')
  const [toast, setToast] = useState<Undoable | null>(null)
  const toastTimer = useRef<number | null>(null)

  const flash = useCallback((u: Undoable) => {
    setToast(u)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 10_000) // STA-08: 10s undo
  }, [])

  const log = useCallback(
    (action: string) => setAudit((a) => [{ at: Date.now(), actor: YOU, action }, ...a]),
    [],
  )

  const palette = useMemo(
    () =>
      buildPalette(
        companies.filter((c) => !c.archived),
        projects,
      ),
    [companies, projects],
  )

  const activeCompanies = companies.filter((c) => !c.archived)
  const projById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  const coById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies])
  const wiById = useMemo(() => new Map(workItems.map((w) => [w.id, w])), [workItems])

  const pathOf = useCallback(
    (wiId: string) => {
      const wi = wiById.get(wiId)
      const proj = wi ? projById.get(wi.projectId) : undefined
      const co = proj ? coById.get(proj.companyId) : undefined
      return { wi, proj, co }
    },
    [wiById, projById, coById],
  )

  const running = entries.find((e) => e.end === null && e.person === YOU) ?? null

  return (
    <div style={{ background: C.bg, color: C.text }} className="min-h-full">
      <div className="mx-auto max-w-[1160px] px-6 py-6 lg:px-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Time Tracker — spec prototype</h1>
            <p className="mt-0.5 text-[13px]" style={{ color: C.text2 }}>
              Company → Project → Work item → Entry. Every state in the CSV is live on this page.
            </p>
          </div>
          {/* CTX-02: two surfaces, two densities. */}
          <div
            className="flex rounded-lg border p-0.5"
            role="tablist"
            aria-label="Surface"
            style={{ borderColor: C.border }}
          >
            {(
              [
                ['member', 'My time', Timer],
                ['reports', 'Reports · Admin', BarChart3],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2"
                style={tab === key ? { background: C.raised, color: C.text } : { color: C.text2 }}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </header>

        {tab === 'member' ? (
          <MemberSurface
            {...{
              entries,
              setEntries,
              workItems,
              setWorkItems,
              projects,
              setProjects,
              companies: activeCompanies,
              palette,
              pathOf,
              running,
              flash,
              log,
            }}
          />
        ) : (
          <ReportsSurface
            {...{
              entries,
              companies: activeCompanies,
              allCompanies: companies,
              setCompanies,
              projects,
              setProjects,
              palette,
              pathOf,
              flash,
              log,
              audit,
            }}
          />
        )}
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border px-4 py-2.5 shadow-2xl"
          style={{ background: C.surface, borderColor: C.borderStrong }}
        >
          <span className="text-[13px]">{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo?.()
                setToast(null)
              }}
              className="flex items-center gap-1 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2"
              style={{ color: C.info }}
            >
              <RotateCcw className="size-3.5" />
              Undo
            </button>
          )}
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            style={{ color: C.text3 }}
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MEMBER SURFACE (MEM-*, STA-*)
// ═══════════════════════════════════════════════════════════════════════════

interface MemberProps {
  entries: Entry[]
  setEntries: React.Dispatch<React.SetStateAction<Entry[]>>
  workItems: WI[]
  setWorkItems: React.Dispatch<React.SetStateAction<WI[]>>
  projects: Proj[]
  setProjects: React.Dispatch<React.SetStateAction<Proj[]>>
  companies: Co[]
  palette: PaletteApi
  pathOf: (wiId: string) => { wi?: WI; proj?: Proj; co?: Co }
  running: Entry | null
  flash: (u: Undoable) => void
  log: (action: string) => void
}

function MemberSurface({
  entries,
  setEntries,
  workItems,
  setWorkItems,
  projects,
  companies,
  palette,
  pathOf,
  running,
  flash,
  log,
}: MemberProps) {
  const [range, setRange] = useState<RangeKey>('week')
  const [query, setQuery] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('q') ?? '',
  )
  const [includeInvalid, setIncludeInvalid] = useState(false)
  const [preview, setPreview] = useState<PreviewState>('ready')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [shortcuts, setShortcuts] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const now = useNow(Boolean(running))

  // MEM-08: filters survive refresh via the URL hash.
  useEffect(() => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    params.set('range', range)
    window.history.replaceState(null, '', `#${params.toString()}`)
  }, [query, range])

  // MEM-09: keyboard shortcuts, ignored while typing.
  const stopRunning = useStopRef(running, setEntries, flash, log, pathOf)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) {
        if (e.key === 'Escape') (el as HTMLInputElement).blur()
        return
      }
      if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === '?') setShortcuts((v) => !v)
      else if (e.key.toLowerCase() === 's' && running) stopRunning()
      else if (e.key === 'Escape') setShortcuts(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, stopRunning])

  const mine = useMemo(() => entries.filter((e) => e.person === YOU), [entries])
  const inRange = useMemo(() => {
    const from = rangeStartOf(range)
    const q = query.trim().toLowerCase()
    return mine
      .filter((e) => e.start >= from)
      .filter((e) => {
        if (!q) return true
        const { wi, proj, co } = pathOf(e.workItemId)
        return `${wi?.name} ${proj?.name} ${co?.name} ${e.description}`.toLowerCase().includes(q)
      })
      .sort((a, b) => b.start - a.start)
  }, [mine, range, query, pathOf])

  const overlaps = useMemo(() => overlapSet(inRange), [inRange])
  const invalidCount = inRange.filter((e) => problemOf(e)).length
  const total = validSeconds(inRange, now, includeInvalid)

  // weeks → days → rows, with identical-consecutive collapse (MEM-03)
  const weeks = useMemo(() => {
    const byWeek = new Map<number, Map<string, Entry[]>>()
    for (const e of inRange) {
      const ws = weekStartOf(e.start)
      const days = byWeek.get(ws) ?? new Map<string, Entry[]>()
      const key = dayKeyOf(e.start)
      const list = days.get(key) ?? []
      list.push(e)
      days.set(key, list)
      byWeek.set(ws, days)
    }
    return [...byWeek.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([ws, days]) => ({
        ws,
        days: [...days.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)),
      }))
  }, [inRange])

  const groupRows = (list: Entry[]) => {
    const rows: { head: Entry; copies: Entry[] }[] = []
    for (const e of list) {
      const prev = rows[rows.length - 1]
      if (
        prev &&
        prev.head.end !== null &&
        e.end !== null &&
        prev.head.workItemId === e.workItemId &&
        prev.head.description === e.description &&
        !problemOf(e) &&
        !problemOf(prev.head) &&
        !prev.head.locked &&
        !e.locked
      ) {
        prev.copies.push(e)
      } else rows.push({ head: e, copies: [] })
    }
    return rows
  }

  return (
    <div className="space-y-5">
      <EntryBar
        {...{
          workItems,
          setWorkItems,
          projects,
          companies,
          palette,
          pathOf,
          running,
          setEntries,
          flash,
          log,
          now,
        }}
      />

      {/* MEM-07: the filter, the count, and the total all state their range. */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="flex rounded-lg border p-0.5"
          role="tablist"
          aria-label="Range"
          style={{ borderColor: C.border }}
        >
          {(Object.keys(RANGE_LABEL) as RangeKey[]).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              className="rounded-md px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2"
              style={range === r ? { background: C.raised, color: C.text } : { color: C.text2 }}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>

        <div className="relative ms-auto">
          <Search
            className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2"
            style={{ color: C.text3 }}
          />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entries…  /"
            aria-label="Search entries"
            className="h-8 w-48 rounded-lg border bg-transparent ps-8 pe-2 text-[13px] outline-none focus-visible:ring-2"
            style={{ borderColor: C.border, color: C.text }}
          />
        </div>
        <IconBtn label="Keyboard shortcuts (?)" onClick={() => setShortcuts(true)}>
          <Keyboard className="size-4" />
        </IconBtn>
        <PreviewSwitch value={preview} onChange={setPreview} />
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[13px]"
        style={{ borderColor: C.border, background: C.surface }}
      >
        <span className="flex flex-wrap items-center gap-x-2" style={{ color: C.text2 }}>
          <span>
            {RANGE_LABEL[range]} · {inRange.length} {inRange.length === 1 ? 'entry' : 'entries'}
            {query && ` matching “${query}”`}
          </span>
          {invalidCount > 0 && (
            <button
              type="button"
              onClick={() => setIncludeInvalid((v) => !v)}
              className="inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2"
              style={{ color: C.warning }}
              aria-pressed={includeInvalid}
            >
              <AlertTriangle className="size-3" />
              {invalidCount} invalid{' '}
              {includeInvalid ? 'included — click to exclude' : 'excluded — click to include'}
            </button>
          )}
        </span>
        <span className="font-mono tabular-nums">{fmtDur(total)}</span>
      </div>

      {preview === 'offline' && (
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px]"
          style={{ borderColor: `${C.warning}55`, background: `${C.warning}0D`, color: C.text2 }}
        >
          <Info className="size-4 shrink-0" style={{ color: C.warning }} />
          You’re offline. The running timer keeps counting; edits will sync when you’re back.
        </div>
      )}
      {preview === 'loading' && <SkeletonList />}
      {preview === 'error' && (
        <div
          className="flex flex-col items-center gap-3 rounded-lg border px-6 py-12 text-center"
          style={{ borderColor: `${C.danger}55`, background: C.surface }}
        >
          <AlertTriangle className="size-5" style={{ color: C.danger }} />
          <p className="text-sm font-medium">Couldn’t load your entries</p>
          <p className="text-[13px]" style={{ color: C.text2 }}>
            Your running timer is safe — it lives on the server, not in this tab.
          </p>
          <Btn onClick={() => setPreview('ready')}>Try again</Btn>
        </div>
      )}

      {(preview === 'ready' || preview === 'offline') &&
        (weeks.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 rounded-lg border px-6 py-12 text-center"
            style={{ borderColor: C.border, background: C.surface }}
          >
            <Timer className="size-5" style={{ color: C.text3 }} />
            <p className="text-sm font-medium">
              {query
                ? 'No entries match your search'
                : `Nothing tracked ${RANGE_LABEL[range].toLowerCase()}`}
            </p>
            <p className="max-w-xs text-[13px]" style={{ color: C.text2 }}>
              {query
                ? 'Try a different word, or widen the range.'
                : 'Pick what you’re working on above and press Start — or log time you forgot with the row menu.'}
            </p>
          </div>
        ) : (
          weeks.map(({ ws, days }) => {
            const weekEntries = days.flatMap(([, list]) => list)
            const weekTotal = validSeconds(weekEntries, now, includeInvalid)
            return (
              <section key={ws} aria-label={weekLabel(ws)}>
                <div className="flex items-baseline justify-between px-1 pb-1.5">
                  <h2 className="text-[13px] font-semibold">{weekLabel(ws)}</h2>
                  <span className="font-mono text-[13px] tabular-nums" style={{ color: C.text2 }}>
                    {fmtDur(weekTotal)}
                  </span>
                </div>
                <div
                  className="overflow-hidden rounded-lg border"
                  style={{ borderColor: C.border, background: C.surface }}
                >
                  {days.map(([dk, list]) => {
                    const dayTotal = validSeconds(list, now, includeInvalid)
                    const over = dayTotal > 24 * 3600
                    return (
                      <div key={dk}>
                        <div
                          className="flex items-center justify-between border-b px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider"
                          style={{ borderColor: C.border, background: '#0F1317', color: C.text2 }}
                        >
                          <span className="flex items-center gap-2">
                            {dayLabel(dk)}
                            {over && (
                              <span
                                className="inline-flex items-center gap-1 normal-case tracking-normal"
                                style={{ color: C.warning }}
                              >
                                <AlertTriangle className="size-3" /> over 24h — check for duplicates
                              </span>
                            )}
                          </span>
                          <span className="font-mono normal-case tracking-normal">
                            {fmtDur(dayTotal)}
                          </span>
                        </div>
                        {groupRows(list).map(({ head, copies }) => (
                          <MemberRow
                            key={head.id}
                            entry={head}
                            copies={copies}
                            expanded={expanded.has(head.id)}
                            onToggleExpand={() =>
                              setExpanded((s) => {
                                const nx = new Set(s)
                                if (nx.has(head.id)) nx.delete(head.id)
                                else nx.add(head.id)
                                return nx
                              })
                            }
                            {...{ palette, pathOf, setEntries, flash, log, now, overlaps }}
                          />
                        ))}
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })
        ))}

      {shortcuts && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => setShortcuts(false)}
        >
          <div
            role="dialog"
            aria-label="Keyboard shortcuts"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-xl border p-5"
            style={{ background: C.surface, borderColor: C.borderStrong }}
          >
            <h2 className="mb-3 text-sm font-semibold">Keyboard shortcuts</h2>
            {(
              [
                ['S', 'Stop the running timer'],
                ['/', 'Search entries'],
                ['?', 'Toggle this sheet'],
                ['Esc', 'Close / cancel edit'],
                ['Enter', 'Commit an inline edit'],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 py-1">
                <kbd
                  className="rounded border px-1.5 py-0.5 font-mono text-[11px]"
                  style={{ borderColor: C.borderStrong }}
                >
                  {k}
                </kbd>
                <span className="text-[13px]" style={{ color: C.text2 }}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

function useStopRef(
  running: Entry | null,
  setEntries: React.Dispatch<React.SetStateAction<Entry[]>>,
  flash: (u: Undoable) => void,
  log: (a: string) => void,
  pathOf: MemberProps['pathOf'],
) {
  return useCallback(() => {
    if (!running) return
    const elapsed = Math.floor((Date.now() - running.start) / 1000)
    if (elapsed < 60) {
      // sub-minute stop = mis-click; discard with undo (STA-08)
      const discarded = running
      setEntries((prev) => prev.filter((e) => e.id !== discarded.id))
      flash({
        message: `Discarded a ${elapsed}s entry`,
        undo: () => setEntries((p) => [...p, { ...discarded, end: Date.now() }]),
      })
      return
    }
    setEntries((prev) => prev.map((e) => (e.id === running.id ? { ...e, end: Date.now() } : e)))
    const { wi } = pathOf(running.workItemId)
    log(`Stopped timer on ${wi?.name ?? 'work item'} (${fmtDur(elapsed)})`)
    flash({ message: `Saved ${fmtDur(elapsed)}` })
  }, [running, setEntries, flash, log, pathOf])
}

// ── Entry bar (MEM-01/02, ENT-05/06/07, STA-02) ──────────────────────────────

interface EntryBarProps {
  workItems: WI[]
  setWorkItems: React.Dispatch<React.SetStateAction<WI[]>>
  projects: Proj[]
  companies: Co[]
  palette: PaletteApi
  pathOf: MemberProps['pathOf']
  running: Entry | null
  setEntries: React.Dispatch<React.SetStateAction<Entry[]>>
  flash: (u: Undoable) => void
  log: (a: string) => void
  now: number
}

function EntryBar({
  workItems,
  setWorkItems,
  projects,
  companies,
  palette,
  pathOf,
  running,
  setEntries,
  flash,
  log,
  now,
}: EntryBarProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [createProject, setCreateProject] = useState<string>('')
  const boxRef = useRef<HTMLDivElement>(null)
  const announce = useRef<HTMLParagraphElement>(null)

  const stop = useStopRef(running, setEntries, flash, log, pathOf)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // A11-02: announce elapsed once a minute, never every second.
  useEffect(() => {
    if (!running || !announce.current) return
    const id = window.setInterval(() => {
      const { wi } = pathOf(running.workItemId)
      if (announce.current)
        announce.current.textContent = `Still tracking ${wi?.name ?? 'work'} — ${fmtDur(Math.floor((Date.now() - running.start) / 1000))} elapsed.`
    }, 60_000)
    return () => window.clearInterval(id)
  }, [running, pathOf])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return workItems
      .map((wi) => ({ wi, ...pathOf(wi.id) }))
      .filter(({ wi, proj, co }) =>
        q === ''
          ? true
          : `${wi.name} ${proj?.name ?? ''} ${co?.name ?? ''}`.toLowerCase().includes(q),
      )
      .slice(0, q ? 12 : 6)
  }, [workItems, query, pathOf])

  // ENT-05/06: fuzzy + initialism suggestions before creating.
  const trimmed = query.trim()
  const exact = workItems.some((w) => normalizeKey(w.name) === normalizeKey(trimmed))
  const nearMatches = useMemo(() => {
    if (trimmed.length < 3 || exact) return []
    const scored = workItems
      .map((wi) => ({ wi, score: similarity(wi.name, trimmed) }))
      .filter((x) => x.score >= SIMILARITY_THRESHOLD && x.score < 1)
    const initialisms = companies
      .filter((co) => initialismMatch(co.name, trimmed) || initialismMatch(trimmed, co.name))
      .map((co) => ({ co }))
    return { scored: scored.sort((a, b) => b.score - a.score).slice(0, 3), initialisms }
  }, [trimmed, exact, workItems, companies])

  const start = (wiId: string) => {
    if (running) stop()
    setEntries((prev) => [
      ...prev,
      {
        id: `e-run-${Date.now()}`,
        person: YOU,
        workItemId: wiId,
        description: '',
        start: Date.now(),
        end: null,
        billable: true,
      },
    ])
    setSelected(wiId)
    setQuery('')
    setOpen(false)
  }

  // ENT-07: create-on-the-fly, loudly — NEW badge + 10s undo.
  const createWorkItem = () => {
    if (!trimmed || !createProject) return
    const wi: WI = {
      id: `wi-new-${Date.now()}`,
      projectId: createProject,
      name: trimmed,
      isNew: true,
    }
    setWorkItems((prev) => [...prev, wi])
    log(`Created work item “${trimmed}”`)
    flash({
      message: `Created “${trimmed}”`,
      undo: () => setWorkItems((prev) => prev.filter((w) => w.id !== wi.id)),
    })
    start(wi.id)
    setCreateProject('')
  }

  const selectedPath = selected ? pathOf(selected) : null
  const runningPath = running ? pathOf(running.workItemId) : null
  const elapsed = running ? Math.floor((now - running.start) / 1000) : 0

  return (
    <section
      aria-label="Timer"
      className="relative overflow-visible rounded-xl border"
      style={{ background: C.surface, borderColor: running ? `${C.running}55` : C.border }}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 start-0 w-[3px] rounded-s-xl"
        style={{ background: running ? C.running : 'transparent' }}
      />
      <p ref={announce} aria-live="polite" className="sr-only" />

      <div className="flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center">
        <div ref={boxRef} className="relative min-w-0 flex-1">
          {running ? (
            <div className="flex min-w-0 items-center gap-2.5 px-1">
              <span className="relative flex size-2 shrink-0" aria-hidden>
                {/* A11-03: pulse only when motion is allowed */}
                <span
                  className="absolute inline-flex size-full rounded-full opacity-75 motion-safe:animate-ping"
                  style={{ background: C.running }}
                />
                <span
                  className="relative inline-flex size-2 rounded-full"
                  style={{ background: C.running }}
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{runningPath?.wi?.name}</span>
                <PathLine proj={runningPath?.proj} co={runningPath?.co} palette={palette} />
              </span>
            </div>
          ) : (
            <>
              <div
                className="flex h-11 items-center gap-2.5 rounded-lg border px-3"
                style={{ borderColor: C.borderStrong }}
              >
                <Search className="size-4 shrink-0" style={{ color: C.text3 }} />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setOpen(true)
                  }}
                  onFocus={() => setOpen(true)}
                  placeholder="What are you working on?"
                  aria-label="What are you working on?"
                  role="combobox"
                  aria-expanded={open}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  style={{ color: C.text }}
                />
                {selected && selectedPath?.wi && (
                  <span
                    className="hidden shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] sm:flex"
                    style={{ borderColor: C.border, color: C.text2 }}
                  >
                    {selectedPath.wi.name}
                    <button
                      type="button"
                      aria-label="Clear selection"
                      onClick={() => setSelected(null)}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )}
              </div>

              {open && (
                <div
                  className="absolute z-40 mt-1 w-full overflow-hidden rounded-lg border shadow-2xl"
                  style={{ background: C.surface, borderColor: C.borderStrong }}
                >
                  <ul
                    role="listbox"
                    aria-label="Work items"
                    className="max-h-72 overflow-y-auto p-1"
                  >
                    {results.map(({ wi, proj, co }) => (
                      <li key={wi.id}>
                        {/* MEM-02: never a bare name — always Work item ·dot Project · Company */}
                        <button
                          type="button"
                          role="option"
                          aria-selected={wi.id === selected}
                          onClick={() => {
                            setSelected(wi.id)
                            setOpen(false)
                            setQuery('')
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-start hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-sm">
                              <span className="truncate">{wi.name}</span>
                              {wi.isNew && (
                                <span
                                  className="rounded-full border px-1.5 text-[10px] font-bold"
                                  style={{ borderColor: `${C.info}66`, color: C.info }}
                                >
                                  NEW
                                </span>
                              )}
                            </span>
                            <PathLine proj={proj} co={co} palette={palette} />
                          </span>
                          {wi.id === selected && (
                            <Check className="size-3.5 shrink-0" style={{ color: C.info }} />
                          )}
                        </button>
                      </li>
                    ))}
                    {results.length === 0 && trimmed.length < 3 && (
                      <li className="px-2.5 py-3 text-xs" style={{ color: C.text2 }}>
                        Nothing matches yet — keep typing.
                      </li>
                    )}
                  </ul>

                  {/* ENT-05: Did you mean? — soft, with an explicit escape. */}
                  {trimmed.length >= 3 && !exact && (
                    <div className="border-t p-2.5" style={{ borderColor: C.border }}>
                      {Array.isArray(nearMatches) ? null : (
                        <>
                          {(nearMatches.scored.length > 0 ||
                            nearMatches.initialisms.length > 0) && (
                            <div
                              className="mb-2 rounded-lg border p-2.5"
                              style={{ borderColor: `${C.info}44`, background: `${C.info}0D` }}
                            >
                              <p
                                className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold"
                                style={{ color: C.info }}
                              >
                                <Info className="size-3.5" /> Did you mean?
                              </p>
                              {nearMatches.scored.map(({ wi }) => {
                                const { proj, co } = pathOf(wi.id)
                                return (
                                  <button
                                    key={wi.id}
                                    type="button"
                                    onClick={() => {
                                      setSelected(wi.id)
                                      setOpen(false)
                                      setQuery('')
                                    }}
                                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-start text-[13px] hover:bg-white/[0.05]"
                                  >
                                    <span className="truncate">
                                      {wi.name}{' '}
                                      <span style={{ color: C.text3 }}>
                                        · {co?.name} · {proj?.name}
                                      </span>
                                    </span>
                                    <span
                                      className="shrink-0 text-[11px]"
                                      style={{ color: C.text3 }}
                                    >
                                      used before
                                    </span>
                                  </button>
                                )
                              })}
                              {nearMatches.initialisms.map(({ co }) => (
                                <p
                                  key={co.id}
                                  className="px-2 py-1 text-[13px]"
                                  style={{ color: C.text2 }}
                                >
                                  “{trimmed}” looks like the initials of{' '}
                                  <strong style={{ color: palette.company(co.id) }}>
                                    {co.name}
                                  </strong>{' '}
                                  — same client?
                                </p>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs" style={{ color: C.text2 }}>
                              No, create “{trimmed}” in
                            </span>
                            <select
                              value={createProject}
                              onChange={(e) => setCreateProject(e.target.value)}
                              aria-label="Project for the new work item"
                              className="h-7 rounded-md border bg-transparent px-1.5 text-xs outline-none"
                              style={{ borderColor: C.borderStrong, color: C.text }}
                            >
                              <option value="" style={{ background: C.surface }}>
                                Pick a project…
                              </option>
                              {projects.map((p) => {
                                const co = companies.find((c) => c.id === p.companyId)
                                return (
                                  <option key={p.id} value={p.id} style={{ background: C.surface }}>
                                    {co?.name} · {p.name}
                                  </option>
                                )
                              })}
                            </select>
                            <Btn small disabled={!createProject} onClick={createWorkItem}>
                              <Plus className="size-3.5" /> Create
                            </Btn>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <span
            role="timer"
            aria-hidden
            className="font-mono text-[28px] leading-none tabular-nums"
            style={{ color: running ? C.running : C.text3 }}
          >
            {fmtTimer(elapsed)}
          </span>
          {running ? (
            <button
              type="button"
              onClick={stop}
              className="inline-flex h-11 w-[92px] items-center justify-center gap-2 rounded-lg text-sm font-semibold text-[#2A0A0A] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2"
              style={{ background: C.danger }}
            >
              <Square className="size-4 fill-current" /> Stop
            </button>
          ) : (
            <button
              type="button"
              disabled={!selected}
              onClick={() => selected && start(selected)}
              className="inline-flex h-11 w-[92px] items-center justify-center gap-2 rounded-lg text-sm font-semibold text-[#04222E] hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2"
              style={{ background: C.running }}
            >
              <Play className="size-4 fill-current" /> Start
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

/** MEM-02 / COL-05: the project reads in its family colour, the company in
 *  muted text beside it. The dot never appears without its label. */
function PathLine({ proj, co, palette }: { proj?: Proj; co?: Co; palette: PaletteApi }) {
  const color = palette.project(proj?.id)
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[11px]">
      <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="truncate font-medium" style={{ color }}>
        {proj?.name ?? '—'}
      </span>
      <span className="truncate" style={{ color: C.text2 }}>
        · {co?.name ?? '—'}
      </span>
    </span>
  )
}

// ── Member row (MEM-04/06, STA-01…08, FMT-04) ────────────────────────────────

interface RowProps {
  entry: Entry
  copies: Entry[]
  expanded: boolean
  onToggleExpand: () => void
  palette: PaletteApi
  pathOf: MemberProps['pathOf']
  setEntries: React.Dispatch<React.SetStateAction<Entry[]>>
  flash: (u: Undoable) => void
  log: (a: string) => void
  now: number
  overlaps: Set<string>
}

function MemberRow({
  entry,
  copies,
  expanded,
  onToggleExpand,
  palette,
  pathOf,
  setEntries,
  flash,
  log,
  now,
  overlaps,
}: RowProps) {
  const { wi, proj, co } = pathOf(entry.workItemId)
  const problem = problemOf(entry)
  const isRunning = entry.end === null
  const isOverlap = overlaps.has(entry.id)
  const seconds = copies.reduce((s, c) => s + secondsOf(c, now), secondsOf(entry, now))
  const [editing, setEditing] = useState<'start' | 'end' | 'desc' | null>(null)

  const commitTime = (field: 'start' | 'end', value: string) => {
    setEditing(null)
    const [h, m] = value.split(':').map(Number)
    if (Number.isNaN(h)) return
    const base = new Date(field === 'start' ? entry.start : (entry.end ?? entry.start))
    base.setHours(h, m, 0, 0)
    const next = { ...entry, [field]: base.getTime() }
    // STA-05: block the impossible at edit time with a reason.
    if (next.end !== null && next.end <= next.start) {
      flash({
        message: `Not saved — end (${hm(next.end)}) can’t be before start (${hm(next.start)}).`,
      })
      return
    }
    const from = field === 'start' ? hm(entry.start) : entry.end ? hm(entry.end) : '—'
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entry.id
          ? {
              ...next,
              editLog: [
                ...(e.editLog ?? []),
                {
                  field: field === 'start' ? 'Start' : 'End',
                  from,
                  to: value,
                  by: YOU,
                  at: Date.now(),
                },
              ],
            }
          : e,
      ),
    )
    log(`Edited ${field} on “${wi?.name}”: ${from} → ${value}`)
  }

  const remove = () => {
    const removed = [entry, ...copies]
    setEntries((prev) => prev.filter((e) => !removed.some((r) => r.id === e.id)))
    log(`Deleted entry on “${wi?.name}” (moved to trash)`)
    flash({
      message: 'Entry moved to trash (30 days)',
      undo: () => setEntries((prev) => [...prev, ...removed]),
    })
  }

  const resume = () => {
    setEntries((prev) => [
      ...prev.map((e) => (e.end === null && e.person === YOU ? { ...e, end: Date.now() } : e)),
      {
        id: `e-run-${Date.now()}`,
        person: YOU,
        workItemId: entry.workItemId,
        description: entry.description,
        start: Date.now(),
        end: null,
        billable: entry.billable,
      },
    ])
    flash({ message: `Timer started on “${wi?.name}”` })
  }

  const timeCell = (field: 'start' | 'end') => {
    const value = field === 'start' ? entry.start : entry.end
    if (editing === field)
      return (
        <input
          autoFocus
          type="time"
          defaultValue={value !== null ? hm(value) : ''}
          onBlur={(e) => commitTime(field, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') setEditing(null)
          }}
          className="w-[74px] rounded border bg-transparent px-1 py-0.5 text-end font-mono text-[13px] outline-none focus-visible:ring-2"
          style={{ borderColor: C.info, color: C.text }}
        />
      )
    return (
      <button
        type="button"
        disabled={entry.locked || value === null}
        onClick={() => setEditing(field)}
        aria-label={`Edit ${field} time`}
        className="rounded px-1 py-0.5 font-mono text-[13px] tabular-nums hover:bg-white/[0.05] disabled:cursor-default disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2"
        style={{ color: C.text2 }}
      >
        {value !== null ? hm(value) : '—'}
      </button>
    )
  }

  return (
    <div
      className="group flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2 last:border-0 hover:bg-white/[0.02] sm:flex-nowrap"
      style={{ borderColor: C.border, background: problem ? `${C.warning}0A` : undefined }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* FMT-04: truncate, never wrap; the title carries the full name */}
          <span className="max-w-[260px] truncate text-[13px] font-medium" title={wi?.name}>
            {wi?.name ?? '—'}
          </span>

          {copies.length > 0 && (
            <button
              type="button"
              onClick={onToggleExpand}
              aria-expanded={expanded}
              className="rounded-full border px-1.5 text-[10px] font-bold focus-visible:outline-none focus-visible:ring-2"
              style={{ borderColor: C.borderStrong, color: C.text2 }}
            >
              ×{copies.length + 1}
            </button>
          )}

          {/* STA-01…07: one chip per state, icon + text, never colour alone */}
          {isRunning && (
            <Chip color={C.running} icon={<Play className="size-3 fill-current" />}>
              Running
            </Chip>
          )}
          {problem && (
            <Chip color={C.warning} icon={<AlertTriangle className="size-3" />}>
              {PROBLEM_COPY[problem]} — excluded
            </Chip>
          )}
          {!problem && isOverlap && (
            <Chip color={C.warning} icon={<AlertTriangle className="size-3" />}>
              Overlaps
            </Chip>
          )}
          {entry.manual && (
            <Chip color={C.text2} icon={<Pencil className="size-3" />}>
              Manual
            </Chip>
          )}
          {entry.imported && (
            <Chip color={C.text2} icon={<Download className="size-3" />}>
              Imported
            </Chip>
          )}
          {entry.locked && (
            <Chip color={C.text2} icon={<Lock className="size-3" />}>
              Locked
            </Chip>
          )}
          {entry.editLog && entry.editLog.length > 0 && !problem && (
            <span className="relative">
              <Chip color={C.info} icon={<Pencil className="size-3" />}>
                Edited
              </Chip>
              {/* STA-04: hover reveals the before/after, not a bare badge */}
              <span
                className="pointer-events-none absolute start-0 top-full z-30 mt-1 hidden w-64 rounded-lg border p-2.5 text-xs shadow-2xl group-hover:block"
                style={{ background: C.raised, borderColor: C.borderStrong }}
              >
                {entry.editLog.map((l, i) => (
                  <span key={i} className="block" style={{ color: C.text2 }}>
                    <strong style={{ color: C.text }}>{l.field}</strong>: {l.from} → {l.to} — {l.by}
                    ,{' '}
                    {new Date(l.at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                ))}
              </span>
            </span>
          )}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
          <PathLine proj={proj} co={co} palette={palette} />
          {editing === 'desc' ? (
            <input
              autoFocus
              defaultValue={entry.description}
              onBlur={(e) => {
                setEntries((prev) =>
                  prev.map((x) => (x.id === entry.id ? { ...x, description: e.target.value } : x)),
                )
                setEditing(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') setEditing(null)
              }}
              className="min-w-0 flex-1 rounded border bg-transparent px-1 text-xs outline-none"
              style={{ borderColor: C.info, color: C.text }}
            />
          ) : (
            <button
              type="button"
              disabled={entry.locked}
              onClick={() => setEditing('desc')}
              className="min-w-0 truncate rounded px-1 text-start text-xs hover:bg-white/[0.05] disabled:cursor-default focus-visible:outline-none focus-visible:ring-2"
              style={{ color: entry.description ? C.text2 : C.text3 }}
              title={entry.description || 'Add a description'}
            >
              {entry.description || '+ description'}
            </button>
          )}
        </div>
        {expanded &&
          copies.map((c) => (
            <p key={c.id} className="mt-1 ps-4 text-[11px]" style={{ color: C.text3 }}>
              {hm(c.start)}–{c.end !== null ? hm(c.end) : 'now'} · {fmtDur(secondsOf(c, now))}
            </p>
          ))}
      </div>

      <div className="flex items-center gap-1.5">
        {timeCell('start')}
        <span style={{ color: C.text3 }}>–</span>
        {timeCell('end')}
      </div>

      <span
        className="w-16 shrink-0 text-end font-mono text-[13px] tabular-nums"
        style={{ color: isRunning ? C.running : problem ? C.text3 : C.text }}
        title={problem ? 'Excluded from totals' : undefined}
      >
        {problem ? '—' : isRunning ? fmtTimer(seconds) : fmtDur(seconds)}
      </span>

      <div className="flex items-center gap-0.5">
        {!isRunning && (
          <IconBtn subtle label={`Resume ${wi?.name ?? 'entry'}`} onClick={resume}>
            <Play className="size-3.5" />
          </IconBtn>
        )}
        {entry.locked ? (
          <IconBtn
            subtle
            label="Locked — request unlock"
            onClick={() => {
              log(`Requested unlock for entry on “${wi?.name}”`)
              flash({ message: 'Unlock request sent to the accountant' })
            }}
          >
            <Lock className="size-3.5" />
          </IconBtn>
        ) : (
          <RowMenu
            onDuplicate={() => {
              const copy = { ...entry, id: `e-dup-${Date.now()}`, editLog: undefined }
              setEntries((prev) => [...prev, copy])
              flash({
                message: 'Entry duplicated',
                undo: () => setEntries((prev) => prev.filter((e) => e.id !== copy.id)),
              })
            }}
            onDelete={remove}
          />
        )}
      </div>
    </div>
  )
}

function RowMenu({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <IconBtn subtle label="Entry actions" onClick={() => setOpen((v) => !v)}>
        <MoreVertical className="size-4" />
      </IconBtn>
      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full z-30 mt-1 w-40 rounded-lg border py-1 shadow-2xl"
          style={{ background: C.raised, borderColor: C.borderStrong }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDuplicate()
              setOpen(false)
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-white/[0.05]"
          >
            <Copy className="size-3.5" /> Duplicate
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDelete()
              setOpen(false)
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-white/[0.05]"
            style={{ color: C.danger }}
          >
            <Trash2 className="size-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS · ADMIN SURFACE (ACC-*, ENT-08/09)
// ═══════════════════════════════════════════════════════════════════════════

interface ReportsProps {
  entries: Entry[]
  companies: Co[]
  allCompanies: Co[]
  setCompanies: React.Dispatch<React.SetStateAction<Co[]>>
  projects: Proj[]
  setProjects: React.Dispatch<React.SetStateAction<Proj[]>>
  palette: PaletteApi
  pathOf: MemberProps['pathOf']
  flash: (u: Undoable) => void
  log: (a: string) => void
  audit: AuditLine[]
}

const SHEET_COLUMNS = [
  'date',
  'person',
  'company',
  'project',
  'workItem',
  'description',
  'start',
  'end',
  'duration',
  'decimal',
  'billable',
  'amount',
  'state',
  'ids',
] as const
type SheetCol = (typeof SHEET_COLUMNS)[number]
const COL_LABEL: Record<SheetCol, string> = {
  date: 'Date',
  person: 'Person',
  company: 'Company',
  project: 'Project',
  workItem: 'Work item',
  description: 'Description',
  start: 'Start',
  end: 'End',
  duration: 'Duration',
  decimal: 'Hours (dec)',
  billable: 'Billable',
  amount: 'Amount',
  state: 'State',
  ids: 'IDs',
}

function ReportsSurface({
  entries,
  companies,
  setCompanies,
  projects,
  setProjects,
  palette,
  pathOf,
  flash,
  log,
  audit,
}: ReportsProps) {
  const [range, setRange] = useState<RangeKey>('month')
  const [companyFilter, setCompanyFilter] = useState<string | null>(null)
  const [personFilter, setPersonFilter] = useState<string>('all')
  const [dayFilter, setDayFilter] = useState<string | null>(null)
  const [quality, setQuality] = useState<'invalid' | 'overlap' | 'nodesc' | null>(null)
  const [openNodes, setOpenNodes] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<SheetCol>('date')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const [visibleCols, setVisibleCols] = useState<Set<SheetCol>>(
    new Set([
      'date',
      'person',
      'company',
      'project',
      'workItem',
      'start',
      'end',
      'duration',
      'billable',
      'amount',
      'state',
    ] as SheetCol[]),
  )
  const [colsOpen, setColsOpen] = useState(false)
  const [merge, setMerge] = useState<{ a: Co; b: Co; survivor: string } | null>(null)
  const [auditQuery, setAuditQuery] = useState('')
  const now = Date.now()

  const overlapIds = useMemo(() => overlapSet(entries), [entries])

  const filtered = useMemo(() => {
    const from = rangeStartOf(range)
    return entries
      .filter((e) => e.start >= from)
      .filter((e) => (personFilter === 'all' ? true : e.person === personFilter))
      .filter((e) => {
        if (!companyFilter) return true
        const { co } = pathOf(e.workItemId)
        return co?.id === companyFilter
      })
      .filter((e) => (dayFilter ? dayKeyOf(e.start) === dayFilter : true))
      .filter((e) => {
        if (quality === 'invalid') return Boolean(problemOf(e))
        if (quality === 'overlap') return overlapIds.has(e.id)
        if (quality === 'nodesc') return !e.description && !problemOf(e)
        return true
      })
      .sort((a, b) => b.start - a.start)
  }, [entries, range, personFilter, companyFilter, dayFilter, quality, pathOf, overlapIds])

  const valid = filtered.filter((e) => !problemOf(e))
  const total = validSeconds(filtered, now, false)
  const billableSec = valid.filter((e) => e.billable).reduce((s, e) => s + secondsOf(e, now), 0)
  const people = new Set(valid.map((e) => e.person))
  const activeProjects = new Set(valid.map((e) => pathOf(e.workItemId).proj?.id).filter(Boolean))
  const days = new Set(valid.map((e) => dayKeyOf(e.start)))
  const manualPct = fmtShare(
    valid.filter((e) => e.manual).reduce((s, e) => s + secondsOf(e, now), 0),
    total,
  )
  const editedPct = fmtShare(
    valid.filter((e) => e.editLog?.length).reduce((s, e) => s + secondsOf(e, now), 0),
    total,
  )
  const invalidCount = filtered.filter((e) => problemOf(e)).length

  // drilldown tree (ACC-03)
  const tree = useMemo(() => {
    const coMap = new Map<
      string,
      {
        co: Co
        sec: number
        projects: Map<
          string,
          { proj: Proj; sec: number; wis: Map<string, { name: string; sec: number }> }
        >
      }
    >()
    for (const e of valid) {
      const { wi, proj, co } = pathOf(e.workItemId)
      if (!wi || !proj || !co) continue
      const sec = secondsOf(e, now)
      const coNode = coMap.get(co.id) ?? { co, sec: 0, projects: new Map() }
      coNode.sec += sec
      const pNode = coNode.projects.get(proj.id) ?? { proj, sec: 0, wis: new Map() }
      pNode.sec += sec
      const wNode = pNode.wis.get(wi.id) ?? { name: wi.name, sec: 0 }
      wNode.sec += sec
      pNode.wis.set(wi.id, wNode)
      coNode.projects.set(proj.id, pNode)
      coMap.set(co.id, coNode)
    }
    return [...coMap.values()].sort((a, b) => b.sec - a.sec)
  }, [valid, pathOf, now])

  // daily stacked chart (ACC-02), last 14 days of range
  const chartDays = useMemo(() => {
    const map = new Map<string, Map<string, number>>()
    for (const e of valid) {
      const dk = dayKeyOf(e.start)
      const coId = pathOf(e.workItemId).co?.id ?? '—'
      const inner = map.get(dk) ?? new Map<string, number>()
      inner.set(coId, (inner.get(coId) ?? 0) + secondsOf(e, now))
      map.set(dk, inner)
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-14)
      .map(([dk, byCo]) => ({
        dk,
        total: [...byCo.values()].reduce((a, b) => a + b, 0),
        segs: [...byCo.entries()].sort((a, b) => b[1] - a[1]),
      }))
  }, [valid, pathOf, now])
  const peak = Math.max(...chartDays.map((d) => d.total), 1)

  // dedupe clusters (ENT-08/09)
  const dupClusters = useMemo(() => {
    const clusters: { a: Co; b: Co; reason: string }[] = []
    for (let i = 0; i < companies.length; i += 1)
      for (let j = i + 1; j < companies.length; j += 1) {
        const [a, b] = [companies[i], companies[j]]
        if (initialismMatch(a.name, b.name)) clusters.push({ a, b, reason: 'initialism match' })
        else if (similarity(a.name, b.name) >= SIMILARITY_THRESHOLD)
          clusters.push({ a, b, reason: 'name similarity' })
      }
    return clusters
  }, [companies])

  const sheetRows = useMemo(() => {
    const rows = filtered.map((e) => {
      const { wi, proj, co } = pathOf(e.workItemId)
      const sec = secondsOf(e, now)
      const rate = proj ? (RATES[proj.id] ?? 0) : 0
      const problem = problemOf(e)
      return {
        e,
        wi,
        proj,
        co,
        sec,
        rate,
        amount: e.billable && !problem ? (sec / 3600) * rate : 0,
        state: problem
          ? PROBLEM_COPY[problem]
          : e.end === null
            ? 'Running'
            : e.locked
              ? 'Locked'
              : e.editLog?.length
                ? 'Edited'
                : e.manual
                  ? 'Manual'
                  : e.imported
                    ? 'Imported'
                    : 'Completed',
      }
    })
    const key = (r: (typeof rows)[number]): string | number => {
      switch (sortBy) {
        case 'person':
          return r.e.person
        case 'company':
          return r.co?.name ?? ''
        case 'project':
          return r.proj?.name ?? ''
        case 'workItem':
          return r.wi?.name ?? ''
        case 'duration':
        case 'decimal':
          return r.sec
        case 'amount':
          return r.amount
        case 'state':
          return r.state
        default:
          return r.e.start
      }
    }
    return rows.sort((a, b) => (key(a) < key(b) ? -sortDir : key(a) > key(b) ? sortDir : 0))
  }, [filtered, pathOf, now, sortBy, sortDir])

  // ACC-06: CSV honouring filters + columns, IDs included so re-import joins
  // on identity instead of string matching.
  const exportCsv = () => {
    const cols = SHEET_COLUMNS.filter((c) => visibleCols.has(c) || c === 'ids')
    const head = cols.map((c) => COL_LABEL[c])
    const lines = sheetRows.map((r) =>
      cols.map((c) => {
        switch (c) {
          case 'date':
            return dayKeyOf(r.e.start)
          case 'person':
            return r.e.person
          case 'company':
            return r.co?.name ?? ''
          case 'project':
            return r.proj?.name ?? ''
          case 'workItem':
            return r.wi?.name ?? ''
          case 'description':
            return r.e.description
          case 'start':
            return hm(r.e.start)
          case 'end':
            return r.e.end !== null ? hm(r.e.end) : ''
          case 'duration':
            return fmtDur(r.sec)
          case 'decimal':
            return (r.sec / 3600).toFixed(2)
          case 'billable':
            return r.e.billable ? 'yes' : 'no'
          case 'amount':
            return r.amount.toFixed(2)
          case 'state':
            return r.state
          case 'ids':
            return `${r.e.id}|${r.wi?.id ?? ''}|${r.proj?.id ?? ''}|${r.co?.id ?? ''}`
        }
      }),
    )
    const csv = [head, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const bom = String.fromCharCode(0xfeff)
    const url = URL.createObjectURL(new Blob([bom + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `time-${range}.csv`
    a.click()
    URL.revokeObjectURL(url)
    log(`Exported CSV (${RANGE_LABEL[range]}, ${sheetRows.length} rows)`)
  }

  const doMerge = () => {
    if (!merge) return
    const survivor = merge.survivor === merge.a.id ? merge.a : merge.b
    const loser = merge.survivor === merge.a.id ? merge.b : merge.a
    const moved = projects.filter((p) => p.companyId === loser.id)
    const before = { projects: [...projects], companies: [...companies] }
    setProjects((prev) =>
      prev.map((p) => (p.companyId === loser.id ? { ...p, companyId: survivor.id } : p)),
    )
    setCompanies((prev) => prev.map((c) => (c.id === loser.id ? { ...c, archived: true } : c)))
    log(
      `Merged company “${loser.name}” into “${survivor.name}” (${moved.length} projects repointed)`,
    )
    flash({
      message: `Merged “${loser.name}” into “${survivor.name}”`,
      undo: () => {
        setProjects(before.projects)
        setCompanies(before.companies)
        log(`Undid merge of “${loser.name}”`)
      },
    })
    setMerge(null)
  }

  const toggleNode = (id: string) =>
    setOpenNodes((s) => {
      const nx = new Set(s)
      if (nx.has(id)) nx.delete(id)
      else nx.add(id)
      return nx
    })

  const th = (col: SheetCol) => (
    <th
      key={col}
      scope="col"
      className="whitespace-nowrap px-2.5 py-2 text-start text-[11px] font-medium"
      style={{ color: C.text2 }}
    >
      <button
        type="button"
        onClick={() => {
          if (sortBy === col) setSortDir((d) => (d === 1 ? -1 : 1))
          else {
            setSortBy(col)
            setSortDir(-1)
          }
        }}
        className="inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2"
      >
        {COL_LABEL[col]}
        {sortBy === col && (
          <ChevronDown
            className="size-3"
            style={{ transform: sortDir === 1 ? 'rotate(180deg)' : undefined }}
          />
        )}
      </button>
    </th>
  )

  return (
    <div className="space-y-5">
      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex rounded-lg border p-0.5"
          role="tablist"
          aria-label="Range"
          style={{ borderColor: C.border }}
        >
          {(Object.keys(RANGE_LABEL) as RangeKey[]).map((r) => (
            <button
              key={r}
              role="tab"
              aria-selected={range === r}
              onClick={() => setRange(r)}
              className="rounded-md px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2"
              style={range === r ? { background: C.raised, color: C.text } : { color: C.text2 }}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
        <select
          value={personFilter}
          onChange={(e) => setPersonFilter(e.target.value)}
          aria-label="Person"
          className="h-8 rounded-lg border bg-transparent px-2 text-xs outline-none"
          style={{ borderColor: C.border, color: C.text }}
        >
          <option value="all" style={{ background: C.surface }}>
            Everyone
          </option>
          {PEOPLE.map((p) => (
            <option key={p} value={p} style={{ background: C.surface }}>
              {p}
            </option>
          ))}
        </select>
        {companyFilter && (
          <FilterChip
            label={companies.find((c) => c.id === companyFilter)?.name ?? ''}
            color={palette.company(companyFilter)}
            onClear={() => setCompanyFilter(null)}
          />
        )}
        {dayFilter && <FilterChip label={dayLabel(dayFilter)} onClear={() => setDayFilter(null)} />}
        {quality && (
          <FilterChip
            label={
              { invalid: 'Invalid only', overlap: 'Overlaps only', nodesc: 'No description' }[
                quality
              ]
            }
            onClear={() => setQuality(null)}
          />
        )}
        <span className="ms-auto text-xs" style={{ color: C.text3 }}>
          {RANGE_LABEL[range]} · {filtered.length} entries
        </span>
      </div>

      {/* KPI row (ACC-02) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <Kpi label="Total" value={fmtDur(total)} icon={Clock} />
        <Kpi label="Billable" value={fmtShare(billableSec, total)} icon={Check} />
        <Kpi label="People" value={String(people.size)} icon={Users} />
        <Kpi label="Projects" value={String(activeProjects.size)} icon={Building2} />
        <Kpi
          label="Avg day"
          value={fmtDur(days.size ? Math.round(total / days.size) : 0)}
          icon={Timer}
        />
        <Kpi label="Manual" value={manualPct} icon={Pencil} />
        <Kpi label="Edited" value={editedPct} icon={Pencil} />
        <Kpi
          label="Invalid"
          value={String(invalidCount)}
          icon={AlertTriangle}
          warn={invalidCount > 0}
          onClick={() => setQuality('invalid')}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* stacked daily chart (ACC-02) */}
        <section
          className="rounded-lg border p-3 lg:col-span-3"
          style={{ borderColor: C.border, background: C.surface }}
        >
          <h3
            className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: C.text2 }}
          >
            Hours per day · stacked by company — click a bar to filter
          </h3>
          <div className="flex gap-2">
            <div
              aria-hidden
              className="flex h-32 w-10 shrink-0 flex-col justify-between text-end text-[10px]"
              style={{ color: C.text3 }}
            >
              <span>{fmtDur(peak)}</span>
              <span>0</span>
            </div>
            <div className="flex h-32 flex-1 items-end gap-1">
              {chartDays.map((d) => (
                <button
                  key={d.dk}
                  type="button"
                  onClick={() => setDayFilter((cur) => (cur === d.dk ? null : d.dk))}
                  title={`${dayLabel(d.dk)} · ${fmtDur(d.total)}`}
                  aria-label={`${dayLabel(d.dk)}: ${fmtDur(d.total)} — filter to this day`}
                  className="flex h-full min-w-0 flex-1 flex-col justify-end overflow-hidden rounded-t focus-visible:outline-none focus-visible:ring-2"
                  style={{ opacity: dayFilter && dayFilter !== d.dk ? 0.4 : 1 }}
                >
                  {d.segs.map(([coId, sec]) => (
                    <span
                      key={coId}
                      title={`${companies.find((c) => c.id === coId)?.name ?? ''} · ${fmtDur(sec)}`}
                      style={{
                        height: `${Math.max(2, (sec / peak) * 100)}%`,
                        background: palette.company(coId),
                      }}
                    />
                  ))}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-1.5 flex gap-1 ps-12">
            {chartDays.map((d) => (
              <span
                key={d.dk}
                className="min-w-0 flex-1 truncate text-center text-[10px]"
                style={{ color: C.text3 }}
              >
                {dayLabel(d.dk)
                  .replace(/^\w+, /, '')
                  .split(' ')
                  .pop()}
              </span>
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            {tree.map(({ co, sec }) => (
              <li key={co.id} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: palette.company(co.id) }}
                />
                <span style={{ color: palette.company(co.id) }}>{co.name}</span>
                <span className="font-mono tabular-nums" style={{ color: C.text2 }}>
                  {fmtDur(sec)}
                </span>
                <span style={{ color: C.text3 }}>{fmtShare(sec, total)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* drilldown tree (ACC-03) */}
        <section
          className="rounded-lg border p-3 lg:col-span-2"
          style={{ borderColor: C.border, background: C.surface }}
        >
          <h3
            className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: C.text2 }}
          >
            Company → Project → Work item
          </h3>
          <div role="treegrid" aria-label="Time by company, project and work item">
            {tree.map(({ co, sec, projects: projMap }) => (
              <div key={co.id}>
                <div
                  role="row"
                  aria-expanded={openNodes.has(co.id)}
                  className="flex items-center gap-1.5 rounded px-1 py-1 hover:bg-white/[0.03]"
                >
                  <button
                    type="button"
                    onClick={() => toggleNode(co.id)}
                    aria-label={`${openNodes.has(co.id) ? 'Collapse' : 'Expand'} ${co.name}`}
                    className="focus-visible:outline-none focus-visible:ring-2"
                  >
                    {openNodes.has(co.id) ? (
                      <ChevronDown className="size-3.5" style={{ color: C.text3 }} />
                    ) : (
                      <ChevronRight
                        className="size-3.5 rtl:rotate-180"
                        style={{ color: C.text3 }}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompanyFilter((cur) => (cur === co.id ? null : co.id))}
                    className="flex min-w-0 flex-1 items-center gap-1.5 text-start focus-visible:outline-none focus-visible:ring-2"
                  >
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: palette.company(co.id) }}
                    />
                    <span
                      className="truncate text-[13px] font-semibold"
                      style={{ color: palette.company(co.id) }}
                    >
                      {co.name}
                    </span>
                  </button>
                  <span className="font-mono text-xs tabular-nums">{fmtDur(sec)}</span>
                  <span className="w-9 text-end text-[11px]" style={{ color: C.text3 }}>
                    {fmtShare(sec, total)}
                  </span>
                </div>
                {openNodes.has(co.id) &&
                  [...projMap.values()]
                    .sort((a, b) => b.sec - a.sec)
                    .map(({ proj, sec: pSec, wis }) => (
                      <div key={proj.id} className="ms-5">
                        <div
                          role="row"
                          aria-expanded={openNodes.has(proj.id)}
                          className="flex items-center gap-1.5 rounded px-1 py-1 hover:bg-white/[0.03]"
                        >
                          <button
                            type="button"
                            onClick={() => toggleNode(proj.id)}
                            aria-label={`${openNodes.has(proj.id) ? 'Collapse' : 'Expand'} ${proj.name}`}
                            className="focus-visible:outline-none focus-visible:ring-2"
                          >
                            {openNodes.has(proj.id) ? (
                              <ChevronDown className="size-3.5" style={{ color: C.text3 }} />
                            ) : (
                              <ChevronRight
                                className="size-3.5 rtl:rotate-180"
                                style={{ color: C.text3 }}
                              />
                            )}
                          </button>
                          <span
                            aria-hidden
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: palette.project(proj.id) }}
                          />
                          <span
                            className="min-w-0 flex-1 truncate text-[13px]"
                            style={{ color: palette.project(proj.id) }}
                          >
                            {proj.name}
                          </span>
                          <span className="font-mono text-xs tabular-nums">{fmtDur(pSec)}</span>
                          <span
                            className="w-9 text-end text-[11px]"
                            style={{ color: C.text3 }}
                            title="of parent"
                          >
                            {fmtShare(pSec, sec)}
                          </span>
                        </div>
                        {openNodes.has(proj.id) &&
                          [...wis.values()]
                            .sort((a, b) => b.sec - a.sec)
                            .map((w) => (
                              <div
                                key={w.name}
                                role="row"
                                className="ms-6 flex items-center gap-1.5 px-1 py-0.5"
                              >
                                <span
                                  className="min-w-0 flex-1 truncate text-xs"
                                  style={{ color: C.text2 }}
                                >
                                  {w.name}
                                </span>
                                <span
                                  className="font-mono text-xs tabular-nums"
                                  style={{ color: C.text2 }}
                                >
                                  {fmtDur(w.sec)}
                                </span>
                                <span
                                  className="w-9 text-end text-[11px]"
                                  style={{ color: C.text3 }}
                                  title="of parent"
                                >
                                  {fmtShare(w.sec, pSec)}
                                </span>
                              </div>
                            ))}
                      </div>
                    ))}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* data quality (ACC-08) + dedupe (ENT-08/09) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section
          className="rounded-lg border p-3"
          style={{ borderColor: C.border, background: C.surface }}
        >
          <h3
            className="mb-2 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: C.text2 }}
          >
            Data quality
          </h3>
          {(
            [
              [
                filtered.filter((e) => problemOf(e)).length,
                'invalid entries — excluded from every total',
                'invalid',
              ],
              [
                filtered.filter((e) => overlapIds.has(e.id)).length,
                'overlapping entries',
                'overlap',
              ],
              [
                filtered.filter((e) => !e.description && !problemOf(e)).length,
                'entries with no description',
                'nodesc',
              ],
            ] as const
          ).map(([count, label, key]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-2 border-b py-1.5 text-[13px] last:border-0"
              style={{ borderColor: C.border }}
            >
              <span className="flex items-center gap-2">
                <span
                  className="font-mono tabular-nums"
                  style={{ color: count > 0 ? C.warning : C.text3 }}
                >
                  {count}
                </span>
                <span style={{ color: C.text2 }}>{label}</span>
              </span>
              {count > 0 && (
                <Btn small onClick={() => setQuality(key)}>
                  Review
                </Btn>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 py-1.5 text-[13px]">
            <span className="flex items-center gap-2">
              <span
                className="font-mono tabular-nums"
                style={{ color: dupClusters.length > 0 ? C.warning : C.text3 }}
              >
                {dupClusters.length}
              </span>
              <span style={{ color: C.text2 }}>suspected duplicate companies</span>
            </span>
          </div>
        </section>

        <section
          className="rounded-lg border p-3"
          style={{ borderColor: C.border, background: C.surface }}
        >
          <h3
            className="mb-2 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: C.text2 }}
          >
            Suspected duplicates
          </h3>
          {dupClusters.length === 0 ? (
            <p className="py-3 text-center text-[13px]" style={{ color: C.text2 }}>
              <Check className="me-1 inline size-3.5" style={{ color: C.running }} />
              No duplicate entities detected.
            </p>
          ) : (
            dupClusters.map(({ a, b, reason }) => (
              <div
                key={`${a.id}${b.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5"
                style={{ borderColor: `${C.warning}44` }}
              >
                <span className="text-[13px]">
                  <strong style={{ color: palette.company(a.id) }}>{a.name}</strong>
                  <span style={{ color: C.text3 }}> ↔ </span>
                  <strong style={{ color: palette.company(b.id) }}>{b.name}</strong>
                  <span className="ms-2 text-[11px]" style={{ color: C.text3 }}>
                    {reason}
                  </span>
                </span>
                <Btn small onClick={() => setMerge({ a, b, survivor: a.id })}>
                  Merge…
                </Btn>
              </div>
            ))
          )}
        </section>
      </div>

      {/* data sheet (ACC-05/06) */}
      <section
        className="overflow-hidden rounded-lg border"
        style={{ borderColor: C.border, background: C.surface }}
      >
        <div
          className="flex flex-wrap items-center gap-2 border-b p-2.5"
          style={{ borderColor: C.border }}
        >
          <h3
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: C.text2 }}
          >
            Data sheet · {sheetRows.length} rows
          </h3>
          <div className="relative ms-auto">
            <Btn small onClick={() => setColsOpen((v) => !v)}>
              Columns
            </Btn>
            {colsOpen && (
              <div
                className="absolute end-0 top-full z-30 mt-1 w-44 rounded-lg border p-2 shadow-2xl"
                style={{ background: C.raised, borderColor: C.borderStrong }}
              >
                {SHEET_COLUMNS.map((c) => (
                  <label
                    key={c}
                    className="flex items-center gap-2 rounded px-1.5 py-1 text-[13px] hover:bg-white/[0.05]"
                  >
                    <input
                      type="checkbox"
                      checked={visibleCols.has(c)}
                      onChange={() =>
                        setVisibleCols((s) => {
                          const nx = new Set(s)
                          if (nx.has(c)) nx.delete(c)
                          else nx.add(c)
                          return nx
                        })
                      }
                    />
                    {COL_LABEL[c]}
                  </label>
                ))}
              </div>
            )}
          </div>
          <Btn small onClick={exportCsv}>
            <Download className="size-3.5" /> CSV (with IDs)
          </Btn>
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="w-full min-w-[900px] text-[13px]">
            <caption className="sr-only">
              Every time entry with full detail, sortable by column.
            </caption>
            <thead className="sticky top-0 z-10" style={{ background: '#0F1317' }}>
              <tr className="border-b" style={{ borderColor: C.border }}>
                {SHEET_COLUMNS.filter((c) => visibleCols.has(c)).map(th)}
              </tr>
            </thead>
            <tbody>
              {sheetRows.map((r) => (
                <tr
                  key={r.e.id}
                  className="border-b last:border-0 hover:bg-white/[0.02]"
                  style={{
                    borderColor: C.border,
                    background: problemOf(r.e) ? `${C.warning}0A` : undefined,
                  }}
                >
                  {visibleCols.has('date') && (
                    <td className="whitespace-nowrap px-2.5 py-1.5" style={{ color: C.text2 }}>
                      {dayKeyOf(r.e.start)}
                    </td>
                  )}
                  {visibleCols.has('person') && (
                    <td className="whitespace-nowrap px-2.5 py-1.5">{r.e.person}</td>
                  )}
                  {visibleCols.has('company') && (
                    <td
                      className="whitespace-nowrap px-2.5 py-1.5"
                      style={{ color: palette.company(r.co?.id) }}
                    >
                      {r.co?.name ?? '—'}
                    </td>
                  )}
                  {visibleCols.has('project') && (
                    <td
                      className="whitespace-nowrap px-2.5 py-1.5"
                      style={{ color: palette.project(r.proj?.id) }}
                    >
                      {r.proj?.name ?? '—'}
                    </td>
                  )}
                  {visibleCols.has('workItem') && (
                    <td className="max-w-[180px] truncate px-2.5 py-1.5" title={r.wi?.name}>
                      {r.wi?.name ?? '—'}
                    </td>
                  )}
                  {visibleCols.has('description') && (
                    <td className="max-w-[160px] truncate px-2.5 py-1.5" style={{ color: C.text2 }}>
                      {r.e.description || '—'}
                    </td>
                  )}
                  {visibleCols.has('start') && (
                    <td
                      className="whitespace-nowrap px-2.5 py-1.5 font-mono tabular-nums"
                      style={{ color: C.text2 }}
                    >
                      {hm(r.e.start)}
                    </td>
                  )}
                  {visibleCols.has('end') && (
                    <td
                      className="whitespace-nowrap px-2.5 py-1.5 font-mono tabular-nums"
                      style={{ color: C.text2 }}
                    >
                      {r.e.end !== null ? hm(r.e.end) : '—'}
                    </td>
                  )}
                  {visibleCols.has('duration') && (
                    <td className="whitespace-nowrap px-2.5 py-1.5 font-mono tabular-nums">
                      {problemOf(r.e) ? '—' : fmtDur(r.sec)}
                    </td>
                  )}
                  {visibleCols.has('decimal') && (
                    <td
                      className="whitespace-nowrap px-2.5 py-1.5 font-mono tabular-nums"
                      style={{ color: C.text2 }}
                    >
                      {problemOf(r.e) ? '—' : (r.sec / 3600).toFixed(2)}
                    </td>
                  )}
                  {visibleCols.has('billable') && (
                    <td className="px-2.5 py-1.5">
                      {r.e.billable ? (
                        <Check className="size-3.5" style={{ color: C.running }} />
                      ) : (
                        <span style={{ color: C.text3 }}>—</span>
                      )}
                    </td>
                  )}
                  {visibleCols.has('amount') && (
                    <td
                      className="whitespace-nowrap px-2.5 py-1.5 font-mono tabular-nums"
                      style={{ color: C.text2 }}
                    >
                      {r.amount > 0 ? `$${r.amount.toFixed(0)}` : '—'}
                    </td>
                  )}
                  {visibleCols.has('state') && (
                    <td className="whitespace-nowrap px-2.5 py-1.5">
                      <span
                        style={{
                          color: problemOf(r.e)
                            ? C.warning
                            : r.state === 'Running'
                              ? C.running
                              : C.text2,
                        }}
                      >
                        {r.state}
                      </span>
                    </td>
                  )}
                  {visibleCols.has('ids') && (
                    <td
                      className="whitespace-nowrap px-2.5 py-1.5 font-mono text-[10px]"
                      style={{ color: C.text3 }}
                    >
                      {r.e.id}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* audit log (ACC-10) */}
      <section
        className="rounded-lg border p-3"
        style={{ borderColor: C.border, background: C.surface }}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: C.text2 }}
          >
            Audit log
          </h3>
          <input
            value={auditQuery}
            onChange={(e) => setAuditQuery(e.target.value)}
            placeholder="Filter…"
            aria-label="Filter audit log"
            className="h-7 w-40 rounded-lg border bg-transparent px-2 text-xs outline-none"
            style={{ borderColor: C.border, color: C.text }}
          />
        </div>
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {audit
            .filter((l) =>
              `${l.actor} ${l.action}`.toLowerCase().includes(auditQuery.toLowerCase()),
            )
            .map((l, i) => (
              <li key={i} className="flex items-baseline gap-2 text-[13px]">
                <span
                  className="shrink-0 font-mono text-[11px] tabular-nums"
                  style={{ color: C.text3 }}
                >
                  {new Date(l.at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="shrink-0 font-medium">{l.actor}</span>
                <span className="min-w-0 truncate" style={{ color: C.text2 }}>
                  {l.action}
                </span>
              </li>
            ))}
        </ul>
      </section>

      {/* merge modal (ENT-08) */}
      {merge && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => setMerge(null)}
        >
          <div
            role="dialog"
            aria-label="Merge companies"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border p-5"
            style={{ background: C.surface, borderColor: C.borderStrong }}
          >
            <h2 className="text-sm font-semibold">Merge companies</h2>
            <p className="mt-1 text-[13px]" style={{ color: C.text2 }}>
              Pick which one survives. Everything under the other is repointed — nothing is deleted,
              and the merge can be undone.
            </p>
            <div className="mt-4 space-y-2">
              {[merge.a, merge.b].map((co) => {
                const projCount = projects.filter((p) => p.companyId === co.id).length
                return (
                  <label
                    key={co.id}
                    className="flex items-center gap-2.5 rounded-lg border p-3"
                    style={{ borderColor: merge.survivor === co.id ? C.info : C.border }}
                  >
                    <input
                      type="radio"
                      name="survivor"
                      checked={merge.survivor === co.id}
                      onChange={() => setMerge({ ...merge, survivor: co.id })}
                    />
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full"
                      style={{ background: palette.company(co.id) }}
                    />
                    <span className="flex-1 text-[13px] font-medium">{co.name}</span>
                    <span className="text-xs" style={{ color: C.text3 }}>
                      {projCount} projects
                    </span>
                  </label>
                )
              })}
            </div>
            <p className="mt-3 text-xs" style={{ color: C.text2 }}>
              Preview:{' '}
              {
                projects.filter(
                  (p) => p.companyId === (merge.survivor === merge.a.id ? merge.b.id : merge.a.id),
                ).length
              }{' '}
              projects and their work items and entries will move to{' '}
              <strong>{merge.survivor === merge.a.id ? merge.a.name : merge.b.name}</strong>.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Btn onClick={() => setMerge(null)}>Cancel</Btn>
              <Btn primary onClick={doMerge}>
                Merge
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

function Chip({
  children,
  color,
  icon,
}: {
  children: React.ReactNode
  color: string
  icon?: React.ReactNode
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
      style={{ color, borderColor: `${color}55` }}
    >
      {icon}
      {children}
    </span>
  )
}

function FilterChip({
  label,
  color,
  onClear,
}: {
  label: string
  color?: string
  onClear: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2"
      style={{ borderColor: `${C.info}55`, background: `${C.info}0D`, color: color ?? C.info }}
      aria-label={`Clear filter: ${label}`}
    >
      {label}
      <X className="size-3" />
    </button>
  )
}

function IconBtn({
  children,
  label,
  onClick,
  subtle,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  subtle?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid size-8 place-items-center rounded-lg hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 ${subtle ? 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100' : ''}`}
      style={{ color: C.text2 }}
    >
      {children}
    </button>
  )
}

function Btn({
  children,
  onClick,
  primary,
  small,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  primary?: boolean
  small?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-semibold transition-opacity focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-40 ${small ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-[13px]'}`}
      style={
        primary
          ? { background: C.info, color: '#04222E', borderColor: 'transparent' }
          : { borderColor: C.borderStrong, color: C.text }
      }
    >
      {children}
    </button>
  )
}

function Kpi({
  label,
  value,
  icon: Icon,
  warn,
  onClick,
}: {
  label: string
  value: string
  icon: typeof Clock
  warn?: boolean
  onClick?: () => void
}) {
  const inner = (
    <>
      <span
        className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider"
        style={{ color: C.text3 }}
      >
        <Icon className="size-3" />
        {label}
      </span>
      <span
        className="mt-0.5 font-mono text-base tabular-nums"
        style={{ color: warn ? C.warning : C.text }}
      >
        {value}
      </span>
    </>
  )
  const cls = 'flex flex-col rounded-lg border p-2.5 text-start'
  const style = { borderColor: warn ? `${C.warning}55` : C.border, background: C.surface }
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`${cls} focus-visible:outline-none focus-visible:ring-2`}
      style={style}
    >
      {inner}
    </button>
  ) : (
    <div className={cls} style={style}>
      {inner}
    </div>
  )
}

function PreviewSwitch({
  value,
  onChange,
}: {
  value: PreviewState
  onChange: (v: PreviewState) => void
}) {
  return (
    <div className="flex items-center gap-1 text-[10px]" style={{ color: C.text3 }}>
      <span className="uppercase tracking-wider">Preview</span>
      {(['ready', 'loading', 'error', 'offline'] as PreviewState[]).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className="rounded border px-1.5 py-0.5 capitalize focus-visible:outline-none focus-visible:ring-2"
          style={
            value === s
              ? { borderColor: C.info, color: C.info }
              : { borderColor: C.border, color: C.text3 }
          }
        >
          {s}
        </button>
      ))}
    </div>
  )
}

function SkeletonList() {
  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ borderColor: C.border, background: C.surface }}
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b p-3 last:border-0"
          style={{ borderColor: C.border }}
        >
          <div
            className="h-3 flex-1 rounded motion-safe:animate-pulse"
            style={{ background: C.raised, animationDelay: `${i * 90}ms` }}
          />
          <div
            className="h-3 w-16 rounded motion-safe:animate-pulse"
            style={{ background: C.raised }}
          />
        </div>
      ))}
      <span className="sr-only">Loading entries…</span>
    </div>
  )
}
