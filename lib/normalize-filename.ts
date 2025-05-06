/**
 * Normaliza un nombre de archivo para que sea compatible con Supabase Storage
 * - Elimina caracteres especiales
 * - Reemplaza espacios con guiones bajos
 * - Convierte a minúsculas
 * - Asegura que el nombre sea único añadiendo un timestamp
 */
export function normalizeFilename(filename: string): string {
  // Obtener la extensión del archivo
  const lastDotIndex = filename.lastIndexOf(".")
  const extension = lastDotIndex !== -1 ? filename.slice(lastDotIndex) : ""
  const nameWithoutExtension = lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename

  // Normalizar el nombre: eliminar caracteres especiales, reemplazar espacios con guiones bajos
  const normalizedName = nameWithoutExtension
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .replace(/[^\w\s-]/g, "") // Eliminar caracteres especiales
    .replace(/\s+/g, "_") // Reemplazar espacios con guiones bajos
    .toLowerCase()

  // Añadir timestamp para asegurar unicidad
  const timestamp = new Date().getTime()

  return `${normalizedName}_${timestamp}${extension}`
}
