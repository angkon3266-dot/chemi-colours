import type { CSSProperties } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import {
  DEFAULT_PALETTE_ID,
  PALETTE_PRESETS,
  isHex,
  paletteFromSettings,
  paletteVars,
} from '../lib/palette'
import type { Palette } from '../lib/palette'
import { Button, Card, Input } from './ui'
import type { Settings } from '../lib/types'

const SLOTS: { key: string; label: string; hint: string; field: keyof Palette }[] = [
  { key: 'palette_primary', label: 'Primary', hint: 'Headings and solid buttons', field: 'primary' },
  { key: 'palette_accent', label: 'Accent', hint: 'Calls to action and highlights', field: 'accent' },
  { key: 'palette_page', label: 'Background', hint: 'Page background', field: 'page' },
  { key: 'palette_body', label: 'Body text', hint: 'Paragraphs — also tints the greys', field: 'body' },
]

/** The four palette colours as swatches, used on the preset buttons. */
function Swatches({ palette }: { palette: Palette }) {
  return (
    <span className="flex rounded-md overflow-hidden border border-black/10 shrink-0">
      {[palette.primary, palette.accent, palette.body, palette.page].map((c, i) => (
        <span key={i} className="w-4 h-6 block" style={{ background: c }} />
      ))}
    </span>
  )
}

export default function PaletteEditor({
  s,
  set,
}: {
  s: Settings
  set: (k: string, v: any) => void
}) {
  const activeId = String(s.palette_preset || DEFAULT_PALETTE_ID)
  const effective = paletteFromSettings(s)
  const overridden = SLOTS.some((slot) => isHex(s[slot.key]))

  // Scoped to the preview element rather than the document root, so choosing a
  // palette doesn't restyle the admin around you while you're still deciding.
  const previewStyle = paletteVars(effective) as unknown as CSSProperties

  const choosePreset = (id: string) => {
    // A preset is a clean slate — clearing the per-colour overrides is what
    // makes the swatches on each button honest about what you'll get.
    set('palette_preset', id)
    for (const slot of SLOTS) set(slot.key, '')
  }

  return (
    <Card className="mt-4">
      <h2 className="text-base font-semibold text-black mb-1">Colours</h2>
      <p className="text-sm text-gray-500 mb-4">
        Pick a palette, then fine-tune any individual colour. This restyles the whole public
        site — the admin panel stays as it is.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {PALETTE_PRESETS.map((preset) => {
          const active = preset.id === activeId
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => choosePreset(preset.id)}
              aria-pressed={active}
              className={`flex items-center gap-3 text-left px-3 py-2.5 rounded-xl border transition-colors ${
                active
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 hover:border-gray-400 bg-white'
              }`}
            >
              <Swatches palette={preset.colors} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-black truncate">{preset.label}</span>
                  {active && <Check size={14} className="text-black shrink-0" />}
                </span>
                <span className="block text-xs text-gray-400 truncate">{preset.note}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-5 pt-5 border-t border-gray-200">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div>
            <h3 className="text-sm font-semibold text-black">Fine-tune</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {overridden
                ? 'Some colours are set by hand and no longer follow the palette above.'
                : 'Leave these alone to follow the palette above.'}
            </p>
          </div>
          {overridden && (
            <Button type="button" variant="ghost" onClick={() => choosePreset(activeId)}>
              <span className="inline-flex items-center gap-1.5">
                <RotateCcw size={14} /> Reset to palette
              </span>
            </Button>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {SLOTS.map((slot) => {
            const custom = isHex(s[slot.key])
            const value = effective[slot.field]
            return (
              <div key={slot.key} className="flex flex-col gap-1">
                <span className="text-sm font-medium text-black">
                  {slot.label}
                  {custom && <span className="ml-1.5 text-[10px] text-gray-400">custom</span>}
                </span>
                <span className="text-xs text-gray-400">{slot.hint}</span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    aria-label={slot.label}
                    value={value}
                    onChange={(e) => set(slot.key, e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 bg-white p-1 cursor-pointer shrink-0"
                  />
                  <Input
                    value={String(s[slot.key] ?? '')}
                    onChange={(e) => set(slot.key, e.target.value)}
                    placeholder={value}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Live preview. Uses the same variables and utility classes the public
          site does, so what renders here is literally what ships. */}
      <div className="mt-5 pt-5 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-black mb-3">Preview</h3>
        <div
          style={previewStyle}
          className="rounded-2xl border border-gray-200 overflow-hidden bg-page"
        >
          <div className="p-5 flex flex-col gap-3">
            <p className="text-xl font-medium text-black">We colour the world&rsquo;s fabric</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Reliable dyestuffs and textile auxiliaries, supplied to mills at consistent quality.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-2xl">
                Explore products
              </span>
              <span className="inline-flex items-center bg-accent text-accent-fg text-sm font-semibold px-4 py-2.5 rounded-2xl">
                Contact us
              </span>
              <span className="inline-flex items-center bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-2xl">
                Learn more
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
