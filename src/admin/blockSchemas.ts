import type { BlockType } from '../lib/types'

export type FieldType = 'text' | 'textarea' | 'html' | 'bool' | 'number' | 'select' | 'list' | 'media'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  hint?: string
  options?: { value: string; label: string }[]
  itemFields?: FieldDef[]
  mediaKind?: 'image' | 'video' | 'doc'
}

export interface BlockSchema {
  label: string
  description: string
  fields: FieldDef[]
  defaults: Record<string, any>
}

export const BLOCK_SCHEMAS: Record<BlockType, BlockSchema> = {
  hero: {
    label: 'Hero (full-screen video)',
    description: 'The big landing panel with the background video and contact form.',
    fields: [
      { key: 'headline', label: 'Headline — first line', type: 'text' },
      { key: 'headline2', label: 'Headline — second line', type: 'text' },
      { key: 'accent', label: 'Accent word', type: 'text', hint: 'Shown in italic serif at the end of line two.' },
      { key: 'useSiteVideo', label: 'Use the site-wide background video', type: 'bool', hint: 'Set that video under Settings.' },
      { key: 'videoUrl', label: 'Custom video URL', type: 'text', hint: 'Only used when the option above is off.' },
      { key: 'showForm', label: 'Show the contact form', type: 'bool' },
    ],
    defaults: { headline: '', headline2: '', accent: '', useSiteVideo: true, videoUrl: '', showForm: true },
  },
  pagehero: {
    label: 'Page header',
    description: 'Title block for an inner page.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
    ],
    defaults: { eyebrow: '', title: '', subtitle: '' },
  },
  richtext: {
    label: 'Text section',
    description: 'A heading with formatted body text.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'html', label: 'Body', type: 'html' },
    ],
    defaults: { eyebrow: '', title: '', html: '' },
  },
  features: {
    label: 'Feature cards',
    description: 'A grid of titled cards — good for services or capabilities.',
    fields: [
      { key: 'title', label: 'Section heading', type: 'text' },
      {
        key: 'items', label: 'Cards', type: 'list',
        itemFields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Text', type: 'textarea' },
        ],
      },
    ],
    defaults: { title: '', items: [] },
  },
  stats: {
    label: 'Statistics',
    description: 'Big numbers with captions.',
    fields: [
      { key: 'title', label: 'Section heading', type: 'text' },
      {
        key: 'items', label: 'Figures', type: 'list',
        itemFields: [
          { key: 'value', label: 'Value', type: 'text' },
          { key: 'label', label: 'Caption', type: 'text' },
        ],
      },
    ],
    defaults: { title: '', items: [] },
  },
  timeline: {
    label: 'Timeline',
    description: 'Dated milestones down a vertical line.',
    fields: [
      { key: 'title', label: 'Section heading', type: 'text' },
      {
        key: 'items', label: 'Milestones', type: 'list',
        itemFields: [
          { key: 'year', label: 'Year', type: 'text' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Text', type: 'textarea' },
        ],
      },
    ],
    defaults: { title: '', items: [] },
  },
  product_grid: {
    label: 'Product grid',
    description: 'Pulls products from your catalogue.',
    fields: [
      { key: 'title', label: 'Section heading', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      {
        key: 'mode', label: 'Which products', type: 'select',
        options: [
          { value: 'all', label: 'All published products' },
          { value: 'featured', label: 'Featured products only' },
        ],
      },
      { key: 'showFilter', label: 'Show category filter', type: 'bool' },
      { key: 'limit', label: 'Maximum to show', type: 'number', hint: '0 means no limit.' },
    ],
    defaults: { title: '', subtitle: '', mode: 'all', showFilter: false, limit: 0 },
  },
  gallery: {
    label: 'Image gallery',
    description: 'A grid of images.',
    fields: [
      { key: 'title', label: 'Section heading', type: 'text' },
      {
        key: 'images', label: 'Images', type: 'list',
        itemFields: [
          { key: 'url', label: 'Image', type: 'media', mediaKind: 'image' },
          { key: 'alt', label: 'Alt text', type: 'text' },
        ],
      },
    ],
    defaults: { title: '', images: [] },
  },
  cta: {
    label: 'Call to action',
    description: 'A black panel with a button.',
    fields: [
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'buttonText', label: 'Button label', type: 'text' },
      { key: 'buttonHref', label: 'Button link', type: 'text', hint: 'e.g. /contact' },
    ],
    defaults: { title: '', text: '', buttonText: '', buttonHref: '/contact' },
  },
  contact: {
    label: 'Contact form',
    description: 'Heading, intro text and the enquiry form.',
    fields: [
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'text', label: 'Intro text', type: 'textarea' },
    ],
    defaults: { title: '', text: '' },
  },
  faq: {
    label: 'FAQ',
    description: 'Expandable question and answer list.',
    fields: [
      { key: 'title', label: 'Section heading', type: 'text' },
      {
        key: 'items', label: 'Questions', type: 'list',
        itemFields: [
          { key: 'q', label: 'Question', type: 'text' },
          { key: 'a', label: 'Answer', type: 'textarea' },
        ],
      },
    ],
    defaults: { title: '', items: [] },
  },
  logos: {
    label: 'Logo strip',
    description: 'Row of client or certification logos.',
    fields: [
      { key: 'title', label: 'Caption', type: 'text' },
      {
        key: 'items', label: 'Logos', type: 'list',
        itemFields: [
          { key: 'url', label: 'Logo', type: 'media', mediaKind: 'image' },
          { key: 'alt', label: 'Alt text', type: 'text' },
        ],
      },
    ],
    defaults: { title: '', items: [] },
  },
}

export const BLOCK_ORDER: BlockType[] = [
  'hero', 'pagehero', 'richtext', 'features', 'stats', 'timeline',
  'product_grid', 'gallery', 'cta', 'contact', 'faq', 'logos',
]
