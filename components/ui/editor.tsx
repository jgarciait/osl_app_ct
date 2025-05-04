"use client"
import { EditorContent, useEditor } from "@tiptap/react"
import { Bold, Italic } from "lucide-react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { Toggle } from "@/components/ui/toggle"

export interface EditorProps {
  onChange?: (value: string) => void
  initialContent?: string
  placeholder?: string
  readOnly?: boolean
}

export function Editor({
  onChange,
  initialContent = "",
  placeholder = "Escriba aquí...",
  readOnly = false,
}: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class:
          "min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    editable: !readOnly,
  })

  return (
    <div className="rounded-lg border bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/50 px-2 py-1">
        {!readOnly && (
          <>
            <Toggle
              size="sm"
              pressed={editor?.isActive("bold") || false}
              onPressedChange={() => editor?.chain().focus().toggleBold().run()}
              disabled={!editor?.can().chain().focus().toggleBold().run() || readOnly}
              aria-label="Negrita"
            >
              <Bold className="h-4 w-4" />
            </Toggle>
            <Toggle
              size="sm"
              pressed={editor?.isActive("italic") || false}
              onPressedChange={() => editor?.chain().focus().toggleItalic().run()}
              disabled={!editor?.can().chain().focus().toggleItalic().run() || readOnly}
              aria-label="Cursiva"
            >
              <Italic className="h-4 w-4" />
            </Toggle>
          </>
        )}
      </div>
      <EditorContent editor={editor} className="p-3" />
    </div>
  )
}
