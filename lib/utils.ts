import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

function generateExpressionNumber(year: number, sequence: number, abreviatura = "RNAR"): string {
  const sequenceStr = sequence.toString().padStart(4, "0")
  return `${year}-${sequenceStr}-${abreviatura}`
}

// Debounce function
function debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
  let timeoutId: number | undefined

  const debounced = (...args: Parameters<T>): void => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }

  return debounced as T
}

export { generateExpressionNumber, debounce }

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
