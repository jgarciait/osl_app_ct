"use client"

import { useEffect, useState, useRef } from "react"

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

    // Create a new observer with debounced updates
    observerRef.current = new ResizeObserver((entries) => {
      const entry = entries[0]

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
    })

    // Start observing
    try {
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
