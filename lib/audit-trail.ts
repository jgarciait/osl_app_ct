import { createClientClient } from "@/lib/supabase-client"

/**
 * Registra una acción en el audit trail
 * @param userId ID del usuario que realiza la acción
 * @param action Descripción de la acción realizada
 * @returns Promise<void>
 */
export async function logAuditTrail(userId: string, action: string): Promise<void> {
  try {
    const supabase = createClientClient()

    const { error } = await supabase.from("audit_trail_expresiones").insert({
      user_id: userId,
      action: action,
    })

    if (error) {
      console.error("Error al registrar acción en audit trail:", error)
    }
  } catch (error) {
    console.error("Error al registrar acción en audit trail:", error)
  }
}

/**
 * Registra una acción en el audit trail obteniendo automáticamente el usuario actual
 * @param action Descripción de la acción realizada
 * @returns Promise<void>
 */
export async function logCurrentUserAction(action: string): Promise<void> {
  try {
    const supabase = createClientClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("No se pudo obtener el usuario actual:", userError)
      return
    }

    await logAuditTrail(user.id, action)
  } catch (error) {
    console.error("Error al registrar acción del usuario actual:", error)
  }
}
