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
  | 'category_grid'
  | 'parallax'
  | 'director'
  | 'map'
  | 'testimonials'
  | 'posts'

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
  /**
   * 'link'     — a plain link (default, and what older saved menus are)
   * 'category' — dropdown built automatically from a category
   * 'manual'   — dropdown of links written by hand
   */
  type?: 'link' | 'category' | 'manual'
  categorySlug?: string
  children?: { label: string; href: string }[]
}

export interface Settings {
  site_name?: string
  logo_text?: string
  logo_url?: string
  tagline?: string
  whatsapp_number?: string
  whatsapp_message?: string
  call_number?: string
  footer_address?: string
  footer_extra?: { label: string; value: string }[]
  nav_items?: NavItem[]
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
  form: string
  strength: string
  packaging: string
  moq: string
  hsCode: string
  shelfLife: string
  storage: string
  customSpecs: SpecRow[]
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
  form: string
  strength: string
  packaging: string
  moq: string
  hsCode: string
  shelfLife: string
  storage: string
  customSpecs: SpecRow[]
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
  summary?: string
  description?: string
  parentId?: number | null
  image?: string
  productCount?: number
  childCount?: number
  children?: Category[]
}

/** Raw admin row (snake_case, straight from the database). */
export interface AdminCategory {
  id: number
  slug: string
  name: string
  summary?: string
  description?: string
  parent_id?: number | null
  image_id?: number | null
  sort_order?: number
}

export interface CategoryView {
  category: Category
  subcategory: Category | null
  children: Category[]
  products: Product[]
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
  phone: string
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

/** A spec row the owner defines themselves on a product. */
export interface SpecRow {
  label: string
  value: string
}

export interface Post {
  id: number
  slug: string
  title: string
  excerpt: string
  body: string
  author: string
  cover: string
  publishedAt: string | null
  status: 'draft' | 'published'
  coverId?: number | null
}

export interface AdminUser {
  id: number
  email: string
  name: string
  lastLoginAt: string | null
  createdAt: string
  isYou: boolean
}
