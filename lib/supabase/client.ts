import { createClientComponentClient as createSupabaseClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/supabase"

export const createClientComponentClient = () => {
  return createSupabaseClient<Database>()
}

// Añadir esta función para mantener compatibilidad con el código existente
export function createClientClient() {
  return createClientComponentClient()
}

export const handleAuthError = async (error: any) => {
  console.error("Auth error:", error)
  if (error.status === 401) {
    // Redirigir a la página de login si hay un error de autenticación
    window.location.href = "/login"
  }
}
