import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("es-PR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// Modificar la función generateExpressionNumber para usar la abreviatura del tema
export function generateExpressionNumber(year: number, sequence: number, suffix = "RNAR") {
  return `${year}-${sequence.toString().padStart(4, "0")}-${suffix}`
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout !== null) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}
