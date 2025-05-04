import { createServerClient } from "@/lib/supabase-server"
import { type NextRequest, NextResponse } from "next/server"

// Eliminar una invitación específica
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const id = params.id

  // Verificar sesión
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    // Verificar si la invitación existe y pertenece al usuario
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
