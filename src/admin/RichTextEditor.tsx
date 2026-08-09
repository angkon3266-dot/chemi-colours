import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TiptapImage from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline as UnderlineIcon, Heading2, Heading3, Heading4,
  List, ListOrdered, Quote, Link as LinkIcon, ImagePlus, Undo2, Redo2,
} from 'lucide-react'
import { api } from '../lib/api'
import { MediaLibraryModal } from './ui'
import type { MediaItem } from '../lib/types'

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * Blog-style rich text editor for the journal. Outputs HTML through the same
 * tag whitelist as every other rich-text field (see api/lib/sanitize.php) —
 * the toolbar only ever exposes tags that whitelist actually allows, so
 * nothing a writer formats can silently vanish after save.
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const [pickingImage, setPickingImage] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const loadedValue = useRef(value)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Only what api/lib/sanitize.php's ALLOWED_TAGS keeps — anything
        // else formatted here would be silently stripped on save, which
        // would look like a bug rather than a limitation.
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
        code: false,
        strike: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: false }),
      TiptapImage.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: placeholder || 'Start writing…' }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          'prose-chemi min-h-[280px] px-4 py-3 focus:outline-none text-gray-700 leading-relaxed',
      },
      // Paste or drop an image file straight in, rather than forcing a trip
      // through the media library first — a normal blog-editor expectation.
      handlePaste(_view, event) {
        const file = [...(event.clipboardData?.files || [])].find((f) =>
          f.type.startsWith('image/')
        )
        if (!file) return false
        event.preventDefault()
        uploadAndInsert(file)
        return true
      },
      handleDrop(_view, event) {
        const file = [...(event.dataTransfer?.files || [])].find((f) =>
          f.type.startsWith('image/')
        )
        if (!file) return false
        event.preventDefault()
        uploadAndInsert(file)
        return true
      },
    },
  })

  // The post loads asynchronously, so the real body often arrives after the
  // editor has already mounted on an empty string — push it in once it does,
  // but never again after (that would wipe out whatever is being typed).
  useEffect(() => {
    if (!editor) return
    if (value !== loadedValue.current && editor.isEmpty && value) {
      editor.commands.setContent(value)
      loadedValue.current = value
    }
  }, [editor, value])

  const uploadAndInsert = async (file: File) => {
    setError('')
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const r = await api.upload<{ url: string }>('/admin/media/upload', form)
      editor?.chain().focus().setImage({ src: r.url }).run()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const insertFromLibrary = (m: MediaItem) => {
    editor?.chain().focus().setImage({ src: m.url, alt: m.alt || '' }).run()
    setPickingImage(false)
  }

  const setLink = () => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL (leave blank to remove)', prev || 'https://')
    if (url === null) return
    if (url.trim() === '') {
      editor.chain().focus().unsetLink().run()
    } else {
      editor.chain().focus().setLink({ href: url.trim() }).run()
    }
  }

  if (!editor) return null

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-gray-200 bg-gray-50">
        <ToolbarButton
          label="Heading 2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 4"
          active={editor.isActive('heading', { level: 4 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        >
          <Heading4 size={16} />
        </ToolbarButton>

        <span className="w-px h-5 bg-gray-200 mx-1" />

        <ToolbarButton
          label="Bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={16} />
        </ToolbarButton>

        <span className="w-px h-5 bg-gray-200 mx-1" />

        <ToolbarButton
          label="Bullet list"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={16} />
        </ToolbarButton>
        <ToolbarButton label="Link" active={editor.isActive('link')} onClick={setLink}>
          <LinkIcon size={16} />
        </ToolbarButton>

        <span className="w-px h-5 bg-gray-200 mx-1" />

        <ToolbarButton
          label={uploading ? 'Uploading…' : 'Insert image'}
          disabled={uploading}
          onClick={() => setPickingImage(true)}
        >
          <ImagePlus size={16} />
        </ToolbarButton>

        <span className="w-px h-5 bg-gray-200 mx-1" />

        <ToolbarButton
          label="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={16} />
        </ToolbarButton>

        <span className="ml-auto text-xs text-gray-400 pr-1">
          {uploading ? 'Uploading image…' : ''}
        </span>
      </div>

      <EditorContent editor={editor} />

      {error && <p className="text-sm text-red-600 px-4 pb-3">{error}</p>}

      {/* The library modal already has its own upload dropzone, so this one
          button covers "upload a new image" and "pick an existing one" —
          on top of the paste/drop handlers above for inline convenience. */}
      {pickingImage && (
        <MediaLibraryModal
          kind="image"
          onClose={() => setPickingImage(false)}
          onPick={insertFromLibrary}
        />
      )}
    </div>
  )
}
