/**
 * Formatea el tamaño de un archivo en bytes a una representación legible (KB, MB, GB)
 * @param bytes Tamaño en bytes
 * @returns Tamaño formateado con unidad
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
