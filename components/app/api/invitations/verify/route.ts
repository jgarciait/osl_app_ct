import { createServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST(request) {
  try {
    const supabase = createServerClient()
    const { email, invitationCode } = await request.json()

    if (!email || !invitationCode) {
      return NextResponse.json({ valid: false, error: "Email y código de invitación son requeridos" }, { status: 400 })
    }

    console.log(`Verificando invitación: Email=${email}, Código=${invitationCode}`)

    // Buscar todas las invitaciones para este email (para depuración)
    const { data: allInvitations, error: allError } = await supabase
      .from("invitations")
      .select("id, invitation_code, status, expires_at")
      .eq("email", email.toLowerCase().trim())

    console.log(`Todas las invitaciones para ${email}:`, allInvitations || [])

    // Buscar la invitación específica
    const { data, error } = await supabase
      .from("invitations")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .eq("invitation_code", invitationCode.trim())
      .eq("status", "pending")

    if (error) {
      console.error("Error al buscar invitación pendiente:", error)
      return NextResponse.json(
        {
          valid: false,
          error: "Error al verificar la invitación",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Preparar información de depuración
    const debugInfo = {
      emailChecked: email.toLowerCase().trim(),
      codeChecked: invitationCode.trim(),
      availableCodes: allInvitations
        ? allInvitations.map((inv) => ({
            id: inv.id,
            code: inv.invitation_code,
            status: inv.status,
            expires: inv.expires_at,
          }))
        : [],
      matchesFound: data ? data.length : 0,
    }

    if (!data || data.length === 0) {
      // Buscar si existe pero no está pendiente
      const { data: nonPendingData } = await supabase
        .from("invitations")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .eq("invitation_code", invitationCode.trim())
        .neq("status", "pending")

      if (nonPendingData && nonPendingData.length > 0) {
        const invitation = nonPendingData[0]
        return NextResponse.json(
          {
            valid: false,
            error: `Esta invitación ya ha sido ${invitation.status === "used" ? "utilizada" : "expirada"}`,
            debug: debugInfo,
          },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          valid: false,
          error: "No se encontró una invitación pendiente con este código",
          debug: debugInfo,
        },
        { status: 404 },
      )
    }

    // Verificar si la invitación ha expirado
    const invitation = data[0]
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      // Actualizar estado a expirado
      await supabase.from("invitations").update({ status: "expired" }).eq("id", invitation.id)

      return NextResponse.json(
        {
          valid: false,
          error: "La invitación ha expirado",
          debug: debugInfo,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        id: invitation.id,
        nombre: invitation.nombre,
        apellido: invitation.apellido,
        role: invitation.role,
      },
    })
  } catch (error) {
    console.error("Error verificando invitación:", error)
    return NextResponse.json(
      {
        valid: false,
        error: error?.message || "Error al verificar la invitación",
        stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      { status: 500 },
    )
  }
}
