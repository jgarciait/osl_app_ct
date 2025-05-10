import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function middleware(request: NextRequest) {
  // Crear una respuesta que podemos modificar
  const response = NextResponse.next()

  try {
    // Crear cliente de Supabase con cookies de la solicitud
    const supabase = createServerSupabaseClient()

    // Verificar si hay una sesión activa
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Si no hay sesión y la ruta no es login o signup, redirigir al login
    const isAuthRoute =
      request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/signup") ||
      request.nextUrl.pathname === "/"

    if (!session && !isAuthRoute) {
      const redirectUrl = new URL("/login", request.url)
      return NextResponse.redirect(redirectUrl)
    }

    // Si hay sesión y la ruta es login o signup, redirigir al dashboard
    if (session && isAuthRoute && request.nextUrl.pathname !== "/") {
      const redirectUrl = new URL("/dashboard", request.url)
      return NextResponse.redirect(redirectUrl)
    }

    return response
  } catch (error) {
    console.error("Error en middleware:", error)

    // En caso de error, redirigir al login
    if (!request.nextUrl.pathname.startsWith("/login")) {
      const redirectUrl = new URL("/login", request.url)
      return NextResponse.redirect(redirectUrl)
    }

    return response
  }
}

// Configurar las rutas que deben ser manejadas por el middleware
export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * 1. /api (rutas API)
     * 2. /_next (archivos estáticos de Next.js)
     * 3. /favicon.ico, /manifest.json, etc.
     */
    "/((?!api|_next|favicon.ico|manifest.json|.*\\.(?:jpg|png|gif|ico|svg)).*)",
  ],
}
