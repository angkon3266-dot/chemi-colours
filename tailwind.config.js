/** @type {import('tailwindcss').Config} */

// Tailwind's own colour names are remapped onto the palette variables defined
// in src/index.css and rewritten at runtime by src/lib/palette.ts. Doing it
// here rather than renaming classes means every existing `text-black`,
// `bg-gray-100` and friend across the site becomes themeable untouched.
//
// Each value goes through `rgb(... / <alpha-value>)` so opacity modifiers
// (`bg-black/20`, `text-gray-500/60`) keep working — a hex in a CSS variable
// would break all of them.
const c = (name) => `rgb(var(${name}) / <alpha-value>)`

const grayRamp = Object.fromEntries(
  ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'].map((step) => [
    step,
    c(`--c-gray-${step}`),
  ])
)

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Headings and solid buttons across the site are `black`.
        black: c('--c-primary'),
        primary: {
          DEFAULT: c('--c-primary'),
          fg: c('--c-primary-fg'),
        },
        accent: {
          DEFAULT: c('--c-accent'),
          fg: c('--c-accent-fg'),
        },
        page: c('--c-page'),
        // Every shade is listed rather than extended, so a palette can never
        // leave a step resolving to Tailwind's stock neutral grey.
        gray: grayRamp,
        neutral: grayRamp,
      },
    },
  },
  plugins: [],
}
