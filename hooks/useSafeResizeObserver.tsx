"use client"

import { useEffect, useState, useRef } from "react"
import { debounce } from "@/lib/utils"

export function useSafeResizeObserver<T extends HTMLElement>(callback?: (entry: ResizeObserverEntry) => void) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const elementRef = useRef<T | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Clean up any existing observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    // Debounced handler to prevent rapid updates
    const debouncedHandler = debounce((entries: ResizeObserverEntry[]) => {
      const entry = entries[0]
      if (!entry) return

      // Use requestAnimationFrame to throttle updates
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }

      frameRef.current = requestAnimationFrame(() => {
        if (entry) {
          const { width, height } = entry.contentRect
          setSize({ width, height })

          if (callback) {
            callback(entry)
          }
        }
      })
    }, 100)

    // Create a new observer with debounced updates
    try {
      observerRef.current = new ResizeObserver(debouncedHandler)
      observerRef.current.observe(element)
    } catch (error) {
      console.warn("ResizeObserver error:", error)
    }

    // Cleanup
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }

      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [callback])

  return { ref: elementRef, size }
}
