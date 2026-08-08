export type BlockType =
  | 'hero'
  | 'pagehero'
  | 'richtext'
  | 'features'
  | 'stats'
  | 'timeline'
  | 'product_grid'
  | 'gallery'
  | 'cta'
  | 'contact'
  | 'faq'
  | 'logos'

export interface Block {
  id?: number
  type: BlockType
  visible?: boolean
  data: Record<string, any>
}

export interface PageSummary {
  id: number
  slug: string
  title: string
  nav_label: string
  nav_order: number
  in_nav: number
  is_home: number
  status: 'draft' | 'published'
  meta_title: string
  meta_description: string
  updated_at?: string
}

export interface Page {
  slug: string
  title: string
  metaTitle?: string
  metaDescription?: string
  blocks: Block[]
}

export interface NavItem {
  label: string
  href: string
}

export interface Settings {
  site_name?: string
  logo_text?: string
  hero_video_url?: string
  hero_poster_url?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  cta_label?: string
  cta_href?: string
  footer_tagline?: string
  footer_note?: string
  footer_columns?: FooterColumn[]
  social_twitter?: string
  social_facebook?: string
  social_instagram?: string
  social_linkedin?: string
  form_services?: string[]
  form_heading?: string
  form_intro?: string
  form_success_title?: string
  form_success_text?: string
  [key: string]: any
}

export interface FooterColumn {
  title: string
  links: { label: string; href: string }[]
}

export interface Bootstrap {
  settings: Settings
  nav: NavItem[]
  home: Page | null
}

export interface Product {
  id: number
  slug: string
  name: string
  categoryId: number | null
  category: string
  ciName: string
  casNo: string
  shadeName: string
  shadeHex: string
  fastness: { light: string; wash: string; rub: string }
  fibres: string[]
  summary: string
  description: string
  application: string
  image: string
  gallery: string[]
  specSheet: string
  featured: boolean
  status: 'draft' | 'published'
}

export interface AdminProduct {
  id: number
  slug: string
  name: string
  categoryId: number | null
  ciName: string
  casNo: string
  shadeName: string
  shadeHex: string
  fastnessLight: string
  fastnessWash: string
  fastnessRub: string
  fibres: string[]
  summary: string
  description: string
  application: string
  imageId: number | null
  galleryIds: number[]
  specSheetId: number | null
  status: 'draft' | 'published'
  featured: boolean
  sortOrder: number
}

export interface Category {
  id: number
  slug: string
  name: string
  description?: string
  sort_order?: number
  product_count?: number
}

export interface MediaItem {
  id: number
  kind: 'image' | 'video' | 'doc'
  url: string
  name: string
  mime: string
  size: number
  external: boolean
  alt: string
}

export interface Lead {
  id: number
  name: string
  email: string
  company: string
  message: string
  services: string[]
  status: 'new' | 'read' | 'archived'
  createdAt: string
}

export interface AuthStatus {
  needsSetup: boolean
  user: { id: number; email: string; name: string } | null
  csrf: string
}
