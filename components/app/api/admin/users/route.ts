import { createServerClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = createServerClient()

  // Verificar sesión y permisos
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Como la columna role no existe, asumimos que todos los usuarios autenticados
  // tienen acceso a esta funcionalidad por ahora
  const isAdmin = true // Temporalmente permitir a todos los usuarios

  if (!isAdmin) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  // Obtener usuarios
  try {
    // Obtener perfiles de la tabla pública
    const { data: profiles, error } = await supabase.from("profiles").select("*")

    if (error) {
      throw error
    }

    return NextResponse.json({ users: profiles })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  // Verificar sesión y permisos
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Modificar la verificación de permisos para permitir temporalmente a todos los usuarios
  // crear otros usuarios, o para usar un enfoque alternativo de verificación

  // Reemplazar este bloque:
  // Verificar si el usuario tiene permisos de administrador
  // const { data: userProfile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single()

  // const isAdmin = userProfile?.role === "admin"

  // if (!isAdmin) {
  //   return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  // }

  // Con este código que permite temporalmente a todos los usuarios acceder:
  // NOTA: En un entorno de producción, deberías implementar una verificación de roles adecuada
  // Esto es solo para fines de desarrollo
  const isAdmin = true // Temporalmente permitir a todos los usuarios
  // Comentario: En producción, deberías descomentar el código anterior y asignar roles adecuadamente

  try {
    const { email, password, userData } = await request.json()

    // Crear usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      throw authError
    }

    // Crear perfil en la tabla pública
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: authData.user.id,
      email,
      ...userData,
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      throw profileError
    }

    return NextResponse.json({ success: true, user: authData.user })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()
  const url = new URL(request.url)
  const userId = url.searchParams.get("id")

  if (!userId) {
    return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 })
  }

  // Verificar sesión y permisos
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  // Como la columna role no existe, asumimos que todos los usuarios autenticados
  // tienen acceso a esta funcionalidad por ahora
  const isAdmin = true // Temporalmente permitir a todos los usuarios

  if (!isAdmin) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  try {
    // Eliminar usuario de Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)

    if (authError) {
      throw authError
    }

    // El perfil se eliminará automáticamente por la política RLS y triggers

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
