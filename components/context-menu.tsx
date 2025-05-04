"use client"

import { useEffect, useRef } from "react"
import { Edit, Trash } from "lucide-react"

interface ContextMenuProps {
  x: number
  y: number
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}

export function ContextMenu({ x, y, onEdit, onDelete, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Calculate position to ensure menu stays within viewport
  // and appears to the right of the click
  const calculatePosition = () => {
    if (!ref.current) return { top: y, left: x }

    const menuWidth = ref.current.offsetWidth
    const menuHeight = ref.current.offsetHeight

    // Get viewport dimensions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Add offset to position menu to the right of the click
    const horizontalOffset = 10 // pixels to the right

    // Start with position to the right of click
    let left = x + horizontalOffset
    let top = y

    // If menu would go beyond right edge, place it to the left of the click instead
    if (left + menuWidth > viewportWidth) {
      left = x - menuWidth - horizontalOffset
    }

    // Adjust vertical position if needed
    if (top + menuHeight > viewportHeight) {
      // If menu would go beyond bottom edge, align it with bottom of viewport
      top = viewportHeight - menuHeight - 10
    }

    return { top, left }
  }

  const position = calculatePosition()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [onClose])

  // Recalculate position when component mounts
  useEffect(() => {
    // Force a re-render to get accurate dimensions after initial render
    const timer = setTimeout(() => {
      ref.current?.style.setProperty("top", `${calculatePosition().top}px`)
      ref.current?.style.setProperty("left", `${calculatePosition().left}px`)
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-md shadow-md border border-gray-200 py-1 min-w-[160px]"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="px-2 py-1.5 text-sm font-medium text-gray-500">Acciones</div>
      <div className="h-px bg-gray-200 my-1" />
      <button onClick={onEdit} className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-gray-100">
        <Edit className="mr-2 h-4 w-4" />
        Editar
      </button>
      <button
        onClick={onDelete}
        className="flex items-center w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50"
      >
        <Trash className="mr-2 h-4 w-4" />
        Eliminar
      </button>
    </div>
  )
}
