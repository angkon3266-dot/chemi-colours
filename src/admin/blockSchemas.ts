import type { BlockType } from '../lib/types'

export type FieldType =
  | 'text' | 'textarea' | 'html' | 'bool' | 'number' | 'select' | 'list' | 'media' | 'color'

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
      { key: 'videoUrl', label: 'Custom video URL', type: 'media', mediaKind: 'video', hint: 'Used only when the option above is off. Leave empty and the site-wide video is used anyway.' },
      { key: 'showForm', label: 'Show the contact form', type: 'bool' },
      { key: 'ctaEnabled', label: 'Show a button over the video', type: 'bool' },
      { key: 'ctaLabel', label: 'Button label', type: 'text', hint: 'e.g. Request a quote' },
      {
        key: 'ctaAction', label: 'Button action', type: 'select',
        options: [
          { value: 'link', label: 'Go to a page or URL' },
          { value: 'whatsapp', label: 'Open WhatsApp' },
          { value: 'call', label: 'Start a phone call' },
          { value: 'email', label: 'Open an email' },
          { value: 'form', label: 'Scroll to the contact form' },
        ],
      },
      { key: 'ctaHref', label: 'Link target', type: 'text', hint: 'Only used for the "page or URL" action. e.g. /products' },
      {
        key: 'ctaPosition', label: 'Button position', type: 'select',
        options: [
          { value: 'headline', label: 'Under the headline' },
          { value: 'center', label: 'Centre of the video' },
          { value: 'bottom-center', label: 'Bottom centre' },
          { value: 'top-left', label: 'Top left' },
          { value: 'top-right', label: 'Top right' },
        ],
      },
      {
        key: 'ctaStyle', label: 'Button colour', type: 'select',
        options: [
          { value: 'white', label: 'White with black text' },
          { value: 'black', label: 'Black with white text' },
          { value: 'outline', label: 'Outlined (transparent)' },
        ],
      },
    ],
    defaults: {
      headline: '', headline2: '', accent: '', useSiteVideo: true, videoUrl: '',
      showForm: true, ctaEnabled: false, ctaLabel: '', ctaAction: 'link', ctaHref: '/contact',
      ctaPosition: 'headline', ctaStyle: 'white',
    },
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
      {
        key: 'columns', label: 'Columns on desktop', type: 'select',
        hint: 'Tablet and mobile scale down automatically.',
        options: [
          { value: '2', label: '2 per row' },
          { value: '3', label: '3 per row' },
          { value: '4', label: '4 per row' },
        ],
      },
      { key: 'limit', label: 'Maximum to show', type: 'number', hint: '0 means no limit.' },
    ],
    defaults: { title: '', subtitle: '', mode: 'all', showFilter: false, columns: '3', limit: 0 },
  },
  gallery: {
    label: 'Image gallery',
    description: 'A grid of photos, each with an optional title and description.',
    fields: [
      { key: 'title', label: 'Section heading', type: 'text' },
      {
        key: 'images', label: 'Photos', type: 'list',
        itemFields: [
          { key: 'url', label: 'Photo', type: 'media', mediaKind: 'image' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'alt', label: 'Alt text', type: 'text' },
        ],
      },
    ],
    defaults: { title: '', images: [] },
  },
  category_grid: {
    label: 'Category / product grid',
    description: 'Tiles with images — main categories, sub-categories or products.',
    fields: [
      { key: 'title', label: 'Section heading', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      {
        key: 'source', label: 'Show', type: 'select',
        hint: 'Choose whether this block lists categories or individual products.',
        options: [
          { value: 'main', label: 'Main categories' },
          { value: 'sub', label: 'Sub-categories' },
          { value: 'products', label: 'Products' },
        ],
      },
      {
        key: 'columns', label: 'Tiles per row', type: 'select',
        hint: 'On desktop. Narrower screens always use fewer.',
        options: [
          { value: '4', label: '4 per row' },
          { value: '3', label: '3 per row' },
          { value: '2', label: '2 per row' },
        ],
      },
      { key: 'limit', label: 'Maximum tiles', type: 'number', hint: '0 means no limit.' },
    ],
    defaults: { title: '', subtitle: '', source: 'main', columns: '4', limit: 0 },
  },
  parallax: {
    label: 'Category showcase (scroll effect)',
    description: 'Main categories revealed one by one as you scroll. Used on the Products page.',
    fields: [
      { key: 'title', label: 'Section heading', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
    ],
    defaults: { title: '', subtitle: '' },
  },
  director: {
    label: 'Message from the director',
    description: 'A portrait alongside a signed message.',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'image', label: 'Photo', type: 'media', mediaKind: 'image' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'role', label: 'Role', type: 'text', hint: 'e.g. Managing Director' },
      { key: 'html', label: 'Message', type: 'html' },
      { key: 'signature', label: 'Signature image', type: 'media', mediaKind: 'image' },
    ],
    defaults: { eyebrow: '', title: '', image: '', name: '', role: '', html: '', signature: '' },
  },
  testimonials: {
    label: 'Testimonials',
    description: 'Quotes from the mills and factories you supply.',
    fields: [
      { key: 'title', label: 'Section heading', type: 'text' },
      {
        key: 'items', label: 'Quotes', type: 'list',
        itemFields: [
          { key: 'quote', label: 'Quote', type: 'textarea' },
          { key: 'name', label: 'Person', type: 'text' },
          { key: 'role', label: 'Role & company', type: 'text', hint: 'e.g. Head of Dyeing, ABC Textiles' },
          { key: 'logo', label: 'Company logo (optional)', type: 'media', mediaKind: 'image' },
        ],
      },
    ],
    defaults: { title: 'What our customers say', items: [] },
  },
  posts: {
    label: 'Latest journal posts',
    description: 'Pulls the most recent published posts from the Journal.',
    fields: [
      { key: 'title', label: 'Section heading', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'limit', label: 'How many to show', type: 'number' },
    ],
    defaults: { title: 'From the journal', subtitle: '', limit: 3 },
  },
  map: {
    label: 'Google map',
    description: 'An embedded map of your location with a directions link.',
    fields: [
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'address', label: 'Address shown above the map', type: 'textarea' },
      {
        key: 'mapUrl',
        label: 'Google Maps link or embed code',
        type: 'textarea',
        hint: 'Paste the share link, the whole <iframe> from "Embed a map", or just your address — all three work.',
      },
    ],
    defaults: { title: 'Find us', address: '', mapUrl: '' },
  },
  cta: {
    label: 'Call to action',
    description: 'A panel with a button — colour, size and layout are all yours.',
    fields: [
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'buttonText', label: 'Button label', type: 'text' },
      { key: 'buttonHref', label: 'Button link', type: 'text', hint: 'e.g. /contact' },
      {
        key: 'layout', label: 'Layout', type: 'select',
        options: [
          { value: 'row', label: 'Side by side (text left, button right)' },
          { value: 'centered', label: 'Centred, stacked' },
        ],
      },
      {
        key: 'size', label: 'Button size', type: 'select',
        options: [
          { value: 'sm', label: 'Small' },
          { value: 'md', label: 'Medium' },
          { value: 'lg', label: 'Large' },
        ],
      },
      { key: 'bgColor', label: 'Panel background', type: 'color' },
      { key: 'textColor', label: 'Panel text', type: 'color' },
      { key: 'buttonBgColor', label: 'Button background', type: 'color' },
      { key: 'buttonTextColor', label: 'Button text', type: 'color' },
    ],
    defaults: {
      title: '', text: '', buttonText: '', buttonHref: '/contact',
      layout: 'row', size: 'md',
      bgColor: '#000000', textColor: '#ffffff', buttonBgColor: '#ffffff', buttonTextColor: '#000000',
    },
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
  carousel: {
    label: 'Featured carousel',
    description: 'Rotating slides for news, certifications or featured ranges.',
    fields: [
      { key: 'autoplay', label: 'Advance slides automatically', type: 'bool' },
      {
        key: 'items', label: 'Slides', type: 'list',
        itemFields: [
          { key: 'image', label: 'Image', type: 'media', mediaKind: 'image' },
          { key: 'eyebrow', label: 'Label above the title', type: 'text', hint: 'e.g. Certification, Partnership' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Text', type: 'textarea' },
          { key: 'linkLabel', label: 'Link label', type: 'text', hint: 'Leave blank to hide the link.' },
          { key: 'linkHref', label: 'Link target', type: 'text', hint: 'e.g. /products or https://…' },
        ],
      },
    ],
    defaults: { autoplay: true, items: [] },
  },
  intro: {
    label: 'Company intro',
    description: 'Image beside a short introduction, with key figures and buttons.',
    fields: [
      { key: 'eyebrow', label: 'Label above the heading', type: 'text' },
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'html', label: 'Body', type: 'html' },
      { key: 'image', label: 'Image', type: 'media', mediaKind: 'image' },
      {
        key: 'imageSide', label: 'Image position', type: 'select',
        options: [
          { value: 'left', label: 'Left of the text' },
          { value: 'right', label: 'Right of the text' },
        ],
      },
      {
        key: 'figures', label: 'Key figures', type: 'list',
        hint: 'Optional. Shown as a row under the text.',
        itemFields: [
          { key: 'value', label: 'Figure', type: 'text', hint: 'e.g. 28+' },
          { key: 'label', label: 'Caption', type: 'text', hint: 'e.g. years supplying mills' },
        ],
      },
      {
        key: 'buttons', label: 'Buttons', type: 'list',
        itemFields: [
          { key: 'label', label: 'Label', type: 'text' },
          { key: 'href', label: 'Target', type: 'text', hint: 'e.g. /products' },
          {
            key: 'style', label: 'Style', type: 'select',
            options: [
              { value: 'accent', label: 'Accent colour' },
              { value: 'primary', label: 'Primary colour' },
              { value: 'outline', label: 'Outline' },
            ],
          },
        ],
      },
    ],
    defaults: { eyebrow: '', title: '', html: '', image: '', imageSide: 'left', figures: [], buttons: [] },
  },
  cards: {
    label: 'Application cards',
    description: 'Image cards for the markets or applications you serve.',
    fields: [
      { key: 'title', label: 'Section heading', type: 'text' },
      { key: 'subtitle', label: 'Section subheading', type: 'textarea' },
      {
        key: 'columns', label: 'Columns on desktop', type: 'select',
        options: [
          { value: '2', label: '2 per row' },
          { value: '3', label: '3 per row' },
          { value: '4', label: '4 per row' },
        ],
      },
      {
        key: 'items', label: 'Cards', type: 'list',
        itemFields: [
          { key: 'image', label: 'Image', type: 'media', mediaKind: 'image' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Text', type: 'textarea' },
          { key: 'href', label: 'Link target', type: 'text', hint: 'e.g. /category/reactive-dyes' },
        ],
      },
    ],
    defaults: { title: '', subtitle: '', columns: '3', items: [] },
  },
}

export const BLOCK_ORDER: BlockType[] = [
  'hero', 'pagehero', 'carousel', 'intro', 'richtext', 'director',
  'category_grid', 'cards', 'parallax', 'product_grid',
  'features', 'stats', 'timeline', 'gallery',
  'cta', 'contact', 'map', 'faq', 'logos', 'testimonials', 'posts',
]
