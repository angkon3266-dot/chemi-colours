/**
 * Site colour palette.
 *
 * Every colour the public site paints with resolves to a CSS custom property
 * emitted from here, so switching palette re-skins the whole site without
 * touching a single component — tailwind.config.js maps Tailwind's own `black`
 * and `gray` names onto these variables.
 *
 * Values are stored as space-separated RGB channels ("35 70 115") rather than
 * hex, because Tailwind composes opacity modifiers as
 * `rgb(var(--c-primary) / <alpha-value>)`. A hex value there would silently
 * break every `bg-black/20` and `text-gray-500/60` on the site.
 */

export interface Palette {
  /** Headings and solid buttons. Tailwind's `black` resolves to this. */
  primary: string
  /** Calls to action and highlights. */
  accent: string
  /** Page background. */
  page: string
  /** Body copy — also seeds the hue of the whole neutral grey ramp. */
  body: string
}

export interface PalettePreset {
  id: string
  label: string
  note: string
  colors: Palette
}

export const DEFAULT_PALETTE_ID = 'brand'

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: 'brand',
    label: 'Chemi Colours',
    note: 'Sampled from the logo — navy and orange.',
    colors: { primary: '#234673', accent: '#e67d37', page: '#ffffff', body: '#3f4a5a' },
  },
  {
    id: 'indigo',
    label: 'Indigo',
    note: 'Deep indigo with a warm amber highlight.',
    colors: { primary: '#2b3a80', accent: '#e0912f', page: '#ffffff', body: '#43485c' },
  },
  {
    id: 'teal',
    label: 'Teal',
    note: 'Cool teal with a burnt-orange highlight.',
    colors: { primary: '#125f5a', accent: '#e2703a', page: '#ffffff', body: '#3c4a49' },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    note: 'Corporate blue with a bright azure highlight.',
    colors: { primary: '#12456e', accent: '#0d9fd8', page: '#ffffff', body: '#3d4956' },
  },
  {
    id: 'mono',
    label: 'Monochrome',
    note: 'The original black-and-white look.',
    colors: { primary: '#000000', accent: '#000000', page: '#ffffff', body: '#4b5563' },
  },
]

/* ----------------------------------------------------------- colour maths -- */

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [0, 0, 0]
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

/** True when the string is a colour we can actually parse (#abc or #aabbcc). */
export function isHex(value: unknown): boolean {
  return typeof value === 'string' && /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return [(h / 6) * 360, s * 100, l * 100]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ln - c / 2
  const seg = Math.floor(((h % 360) + 360) % 360 / 60)
  const [r1, g1, b1] =
    [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][seg] ?? [0, 0, 0]
  return [
    Math.round((r1 + m) * 255),
    Math.round((g1 + m) * 255),
    Math.round((b1 + m) * 255),
  ]
}

/** Perceived luminance, used to pick a legible foreground. */
function luminance(r: number, g: number, b: number): number {
  const f = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** Near-white or near-black, whichever stays readable on the given colour. */
function readableOn(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex)
  return luminance(r, g, b) > 0.45 ? [17, 21, 28] : [255, 255, 255]
}

const channels = (rgb: [number, number, number]) => rgb.join(' ')

/**
 * Lightness for each Tailwind grey step. Tuned to sit close to Tailwind's own
 * neutral ramp so existing `text-gray-500` / `bg-gray-100` usage keeps the
 * contrast it was designed against.
 */
const RAMP: Record<string, number> = {
  '50': 98, '100': 96, '200': 90, '300': 82, '400': 64,
  '500': 47, '600': 37, '700': 29, '800': 21, '900': 14, '950': 9,
}

/* ------------------------------------------------------------ public API -- */

/**
 * Expand a four-colour palette into every CSS variable the site reads.
 * The neutral ramp inherits the body colour's hue at low saturation, so the
 * greys read as chosen rather than as a stock mid-grey.
 */
export function paletteVars(p: Palette): Record<string, string> {
  const [br, bg, bb] = hexToRgb(p.body)
  const [hue, sat] = rgbToHsl(br, bg, bb)

  const vars: Record<string, string> = {
    '--c-primary': channels(hexToRgb(p.primary)),
    '--c-primary-fg': channels(readableOn(p.primary)),
    '--c-accent': channels(hexToRgb(p.accent)),
    '--c-accent-fg': channels(readableOn(p.accent)),
    '--c-page': channels(hexToRgb(p.page)),
  }

  for (const [step, lightness] of Object.entries(RAMP)) {
    // Keep only a whisper of the hue: enough that the greys feel related to the
    // palette, not so much that they read as a colour in their own right.
    const tint = Math.min(sat, lightness > 80 ? 12 : lightness > 50 ? 10 : 14)
    vars[`--c-gray-${step}`] = channels(hslToRgb(hue, tint, lightness))
  }
  return vars
}

/** Resolve the palette the owner configured, falling back to the brand one. */
export function paletteFromSettings(settings: Record<string, any>): Palette {
  const presetId = String(settings.palette_preset || DEFAULT_PALETTE_ID)
  const preset =
    PALETTE_PRESETS.find((p) => p.id === presetId) ??
    PALETTE_PRESETS.find((p) => p.id === DEFAULT_PALETTE_ID)!

  // Per-colour overrides win over the preset, but only when they parse — a
  // half-typed "#12" in the colour field must not black out the whole site.
  const pick = (key: string, fallback: string) =>
    isHex(settings[key]) ? String(settings[key]).trim() : fallback

  return {
    primary: pick('palette_primary', preset.colors.primary),
    accent: pick('palette_accent', preset.colors.accent),
    page: pick('palette_page', preset.colors.page),
    body: pick('palette_body', preset.colors.body),
  }
}

/** Paint a palette onto the document. Safe to call on every settings change. */
export function applyPalette(p: Palette): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const [name, value] of Object.entries(paletteVars(p))) {
    root.style.setProperty(name, value)
  }
}
