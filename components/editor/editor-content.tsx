"use client"

import { useEffect } from "react"
import { EditorContent as TiptapEditorContent } from "@tiptap/react"
import { useEditor } from "./editor-provider"

interface EditorContentProps {
  initialContent?: string
  onUpdate?: (props: { editor: any }) => void
}

export function EditorContent({ initialContent = "", onUpdate }: EditorContentProps) {
  const { editor } = useEditor()

  useEffect(() => {
    if (editor && initialContent && !editor.isEmpty) {
      editor.commands.setContent(initialContent)
    }
  }, [editor, initialContent])

  useEffect(() => {
    if (editor && onUpdate) {
      editor.on("update", onUpdate)
    }

    return () => {
      if (editor && onUpdate) {
        editor.off("update", onUpdate)
      }
    }
  }, [editor, onUpdate])

  if (!editor) {
    return null
  }

  return <TiptapEditorContent editor={editor} />
}
