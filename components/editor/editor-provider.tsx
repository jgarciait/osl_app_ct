"use client"

import type React from "react"

import { createContext, useContext } from "react"
import type { Editor as TiptapEditor } from "@tiptap/react"

type EditorContextType = {
  editor: TiptapEditor | null
}

export const EditorContext = createContext<EditorContextType>({
  editor: null,
})

export function useEditor() {
  return useContext(EditorContext)
}

export function EditorProvider({ children }: { children: React.ReactNode }) {
  return <div className="relative">{children}</div>
}
