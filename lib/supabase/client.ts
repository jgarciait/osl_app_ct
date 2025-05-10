import { createBrowserClient } from "@supabase/ssr"

export const createClientComponentClient = () => {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
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
