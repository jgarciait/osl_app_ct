import { createServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") || "/dashboard"

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient()

    // Intercambiar el código por una sesión
    await supabase.auth.exchangeCodeForSession(code)
  }

  // URL a la que redirigir después de la confirmación
  return NextResponse.redirect(new URL(next, request.url))
}
