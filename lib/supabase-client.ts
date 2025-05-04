import { createBrowserClient } from "@supabase/ssr"

// Creamos una variable para almacenar la instancia del cliente
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function createClientClient() {
  // Only create a client when in the browser
  if (typeof window === "undefined") {
    console.warn("Attempted to create Supabase client during SSR. Returning null client.")
    // Return a mock client during SSR to prevent errors
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
      },
    } as any
  }

  // En desarrollo, siempre creamos una nueva instancia para evitar problemas con HMR
  // En producción, también creamos una nueva instancia para evitar problemas con sesiones obsoletas
  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    },
  )

  return supabaseClient
}

// Función para manejar errores de autenticación
export async function handleAuthError(error: any) {
  console.error("Error de autenticación:", error)

  // Si es un error de token no encontrado o token expirado, limpiamos la sesión
  if (
    error?.code === "refresh_token_not_found" ||
    error?.message?.includes("refresh token") ||
    error?.message?.includes("JWT expired") ||
    error?.message?.includes("invalid token")
  ) {
    const supabase = createClientClient()

    // Intentar cerrar sesión para limpiar tokens
    try {
      await supabase.auth.signOut()
      console.log("Sesión cerrada debido a token inválido")
    } catch (signOutError) {
      console.error("Error al cerrar sesión:", signOutError)
    }

    // Limpiar cualquier token almacenado localmente
    if (typeof window !== "undefined") {
      localStorage.removeItem("supabase.auth.token")
      localStorage.removeItem("supabase.auth.expires_at")
      localStorage.removeItem("supabase.auth.refresh_token")
      sessionStorage.clear()
    }

    // Redirigir al login si estamos en el cliente
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
  }
}

/**
 * Realiza una consulta a Supabase con caché en memoria
 * @param key Clave única para identificar la consulta en caché
 * @param queryFn Función que realiza la consulta a Supabase
 * @param ttl Tiempo de vida de la caché en milisegundos (default: 60000ms = 1min)
 */
export const cachedQuery = (() => {
  const cache = new Map()

  return async (key, queryFn, ttl = 60000) => {
    const now = Date.now()
    const cachedItem = cache.get(key)

    if (cachedItem && now - cachedItem.timestamp < ttl) {
      return cachedItem.data
    }

    const result = await queryFn()

    if (!result.error) {
      cache.set(key, {
        data: result,
        timestamp: now,
      })
    }

    return result
  }
})()
