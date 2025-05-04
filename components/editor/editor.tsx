"use client"

import type React from "react"

import { useEditor as useTiptapEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { EditorContext } from "./editor-provider"
import { EditorToolbar } from "./editor-toolbar"

export function Editor({ children }: { children: React.ReactNode }) {
  const editor = useTiptapEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Escriba aquí la propuesta o resumen...",
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert focus:outline-none max-w-none p-4",
      },
    },
  })

  return (
    <EditorContext.Provider value={{ editor }}>
      <div className="flex flex-col">
        <EditorToolbar />
        {children}
      </div>
    </EditorContext.Provider>
  )
}
