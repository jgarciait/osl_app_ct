import { createServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST(request) {
  try {
    // Usar el cliente del servidor que tiene la clave secreta (service_role)
    const supabase = createServerClient()

    const body = await request.json()
    const { email, invitationCode, userId } = body

    // Validar datos de entrada
    if (!email || !invitationCode || !userId) {
      console.error("Datos incompletos:", { email, invitationCode, userId })
      return NextResponse.json({ success: false, error: "Faltan datos requeridos" }, { status: 400 })
    }

    console.log(`Marcando invitación como utilizada: Email=${email}, Código=${invitationCode}, UserId=${userId}`)

    // Realizar una consulta directa para depuración
    const { data: directQuery, error: directError } = await supabase.rpc("get_invitation_by_email_code", {
      p_email: email.toLowerCase().trim(),
      p_code: invitationCode.trim(),
    })

    console.log("Resultado de consulta directa:", {
      success: !directError,
      found: directQuery && directQuery.length > 0,
      data: directQuery,
      error: directError,
    })

    // Buscar la invitación específica
    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .eq("invitation_code", invitationCode.trim())

    if (error) {
      console.error("Error al buscar invitación:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Error al buscar la invitación",
          details: error.message,
        },
        { status: 500 },
      )
    }

    console.log("Resultado de la búsqueda:", { found: !!data && data.length > 0, count: data?.length })

    if (!data || data.length === 0) {
      // Intentar una consulta más directa para diagnóstico
      const { count } = await supabase.from("invitations").select("*", { count: "exact", head: true })

      console.log(`Total de invitaciones en la base de datos: ${count}`)

      // Buscar todas las invitaciones para este email
      const { data: emailInvitations } = await supabase
        .from("invitations")
        .select("id, invitation_code, status")
        .eq("email", email.toLowerCase().trim())

      console.log(`Invitaciones para ${email}:`, emailInvitations || [])

      return NextResponse.json(
        {
          success: false,
          error: "Invitación no encontrada para este email y código",
          debug: {
            emailChecked: email.toLowerCase().trim(),
            codeChecked: invitationCode.trim(),
            totalInvitations: count,
            emailInvitations: emailInvitations || [],
          },
        },
        { status: 404 },
      )
    }

    const invitation = data[0]
    console.log("Invitación encontrada:", invitation)

    // Verificar si la invitación ya fue utilizada
    if (invitation.status === "used") {
      console.log("La invitación ya fue utilizada:", invitation)

      // Actualizar el perfil del usuario con el rol de la invitación de todos modos
      if (invitation.role) {
        await supabase
          .from("profiles")
          .update({
            role: invitation.role,
            nombre: invitation.nombre || undefined,
            apellido: invitation.apellido || undefined,
          })
          .eq("id", userId)
      }

      return NextResponse.json({
        success: true,
        message: "La invitación ya fue utilizada anteriormente, pero se ha actualizado el perfil",
        wasAlreadyUsed: true,
      })
    }

    // Verificar si la invitación ha expirado
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      console.log("La invitación ha expirado:", invitation)

      // Actualizar estado a expirado
      await supabase.from("invitations").update({ status: "expired" }).eq("id", invitation.id)

      return NextResponse.json(
        {
          success: false,
          error: "La invitación ha expirado",
        },
        { status: 400 },
      )
    }

    // En lugar de actualizar la invitación, vamos a eliminarla después de usarla
    // Primero guardamos los datos importantes que necesitamos
    const invitationRole = invitation.role
    const invitationNombre = invitation.nombre
    const invitationApellido = invitation.apellido

    // Eliminar la invitación
    const { error: deleteError } = await supabase.from("invitations").delete().eq("id", invitation.id)

    if (deleteError) {
      console.error("Error al eliminar invitación:", deleteError)

      // Aunque haya error, intentamos actualizar el perfil de todos modos
      if (invitationRole) {
        try {
          await supabase
            .from("profiles")
            .update({
              role: invitationRole,
              nombre: invitationNombre || undefined,
              apellido: invitationApellido || undefined,
            })
            .eq("id", userId)

          console.log("Perfil actualizado a pesar del error al eliminar la invitación")
        } catch (profileError) {
          console.error("Error adicional al actualizar perfil:", profileError)
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: "Error al eliminar la invitación, pero el usuario fue creado",
          details: deleteError.message,
          partialSuccess: true,
        },
        { status: 500 },
      )
    }

    console.log("Invitación eliminada correctamente")

    // Actualizar el perfil del usuario con el rol de la invitación
    if (invitationRole) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          role: invitationRole,
          nombre: invitationNombre || undefined,
          apellido: invitationApellido || undefined,
        })
        .eq("id", userId)

      if (profileError) {
        console.warn("Error al actualizar el perfil del usuario:", profileError)
        // Continuamos aunque haya error en el perfil
      } else {
        console.log("Perfil actualizado con el rol:", invitationRole)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Invitación marcada como utilizada correctamente",
    })
  } catch (error) {
    console.error("Error al marcar invitación como utilizada:", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Error al procesar la solicitud",
        stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      { status: 500 },
    )
  }
}
