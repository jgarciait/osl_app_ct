import { createServerClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

// Función para generar un código de invitación de 4 dígitos
function generateInvitationCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

// Función para calcular la fecha de expiración (por defecto 7 días)
function getExpirationDate(days = 7): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

// Crear una nueva invitación
export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  // Verificar sesión
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { email, nombre, apellido, role, expirationDays } = await request.json()

    // Validar datos
    if (!email || !nombre) {
      return NextResponse.json({ error: "El correo electrónico y nombre son obligatorios" }, { status: 400 })
    }

    // Generar código de invitación de 4 dígitos
    const invitationCode = generateInvitationCode()

    // Calcular fecha de expiración
    const expiresAt = getExpirationDate(expirationDays || 7)

    // Crear invitación en la base de datos
    const { data, error } = await supabase
      .from("invitations")
      .insert({
        email: email.toLowerCase(),
        nombre,
        apellido: apellido || null,
        invitation_code: invitationCode,
        role: role || "user",
        created_by: session.user.id,
        expires_at: expiresAt.toISOString(),
        status: "pending",
      })
      .select()

    if (error) {
      // Si ya existe una invitación para este email, actualizar la existente
      if (error.code === "23505") {
        // Código de error de duplicado en PostgreSQL
        const { data: updatedData, error: updateError } = await supabase
          .from("invitations")
          .update({
            nombre,
            apellido: apellido || null,
            invitation_code: invitationCode,
            role: role || "user",
            created_by: session.user.id,
            expires_at: expiresAt.toISOString(),
            status: "pending",
            used_at: null,
            used_by: null,
          })
          .eq("email", email.toLowerCase())
          .select()

        if (updateError) {
          throw updateError
        }

        return NextResponse.json({
          success: true,
          message: "Invitación actualizada",
          invitation: updatedData[0],
        })
      }
      throw error
    }

    // Aquí se podría implementar el envío de email con la invitación
    // Por ahora, solo devolvemos el token para pruebas

    return NextResponse.json({
      success: true,
      message: "Invitación creada",
      invitation: data[0],
    })
  } catch (error: any) {
    console.error("Error creating invitation:", error)
    return NextResponse.json({ error: error.message || "Error al crear la invitación" }, { status: 500 })
  }
}

// Obtener invitaciones
export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const url = new URL(request.url)
  const token = url.searchParams.get("token")

  // Si se proporciona un código de invitación, verificar la invitación
  if (token) {
    try {
      // Obtener invitación por código y email
      const email = url.searchParams.get("email")
      if (!email) {
        return NextResponse.json({ error: "Se requiere el correo electrónico" }, { status: 400 })
      }

      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("invitation_code", token)
        .eq("email", email.toLowerCase())
        .eq("status", "pending")
        .single()

      if (error) {
        return NextResponse.json({ error: "Invitación no encontrada o ya utilizada" }, { status: 404 })
      }

      // Verificar si la invitación ha expirado
      if (new Date(data.expires_at) < new Date()) {
        // Actualizar estado a expirado
        await supabase.from("invitations").update({ status: "expired" }).eq("id", data.id)

        return NextResponse.json({ error: "La invitación ha expirado" }, { status: 410 })
      }

      return NextResponse.json({ invitation: data })
    } catch (error: any) {
      console.error("Error verifying invitation:", error)
      return NextResponse.json({ error: error.message || "Error al verificar la invitación" }, { status: 500 })
    }
  }

  // Si no hay token, listar invitaciones (requiere autenticación)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    // Obtener todas las invitaciones creadas por el usuario
    const { data, error } = await supabase.from("invitations").select("*").order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ invitations: data })
  } catch (error: any) {
    console.error("Error fetching invitations:", error)
    return NextResponse.json({ error: error.message || "Error al obtener invitaciones" }, { status: 500 })
  }
}

// Actualizar estado de invitación (marcar como usada)
export async function PATCH(request: NextRequest) {
  const supabase = createServerClient()
  const { token, userId } = await request.json()

  if (!token || !userId) {
    return NextResponse.json({ error: "Token y userId son requeridos" }, { status: 400 })
  }

  try {
    // Actualizar invitación como usada
    const { data, error } = await supabase
      .from("invitations")
      .update({
        status: "used",
        used_at: new Date().toISOString(),
        used_by: userId,
      })
      .eq("invitation_code", token)
      .eq("status", "pending")
      .select()

    if (error || !data || data.length === 0) {
      return NextResponse.json({ error: "No se pudo actualizar la invitación" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Invitación utilizada correctamente",
    })
  } catch (error: any) {
    console.error("Error updating invitation:", error)
    return NextResponse.json({ error: error.message || "Error al actualizar la invitación" }, { status: 500 })
  }
}

// Eliminar invitación
export async function DELETE(request: NextRequest) {
  const supabase = createServerClient()

  // Verificar sesión
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "ID de invitación requerido" }, { status: 400 })
    }

    // Verificar si la invitación existe
    const { data: invitation, error: checkError } = await supabase.from("invitations").select("*").eq("id", id).single()

    if (checkError) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 })
    }

    // No permitir eliminar invitaciones ya utilizadas
    if (invitation.status === "used") {
      return NextResponse.json({ error: "No se puede eliminar una invitación ya utilizada" }, { status: 400 })
    }

    // Eliminar la invitación
    const { error } = await supabase.from("invitations").delete().eq("id", id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: "Invitación eliminada correctamente",
    })
  } catch (error: any) {
    console.error("Error deleting invitation:", error)
    return NextResponse.json({ error: error.message || "Error al eliminar la invitación" }, { status: 500 })
  }
}
