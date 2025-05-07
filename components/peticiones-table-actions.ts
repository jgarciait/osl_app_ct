"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export async function deletePeticion(id: string) {
  if (!id) {
    return { success: false, error: "ID de petición no proporcionado" }
  }

  try {
    // Crear cliente de Supabase con cookies del servidor
    const supabase = createServerActionClient({ cookies })

    // ELIMINADO: Ya no verificamos la autenticación
    // Procedemos directamente con las operaciones de eliminación

    // 1. Eliminar documentos relacionados
    const { error: docsError } = await supabase.from("documentos_peticiones").delete().eq("peticion_id", id)

    if (docsError) {
      console.error("Error al eliminar documentos:", docsError)
      return {
        success: false,
        error: `Error al eliminar documentos: ${docsError.message}`,
      }
    }

    // 2. Eliminar relaciones en peticiones_temas
    const { error: temasError } = await supabase.from("peticiones_temas").delete().eq("peticiones_id", id)

    if (temasError) {
      console.error("Error al eliminar relaciones de temas:", temasError)
      return {
        success: false,
        error: `Error al eliminar relaciones de temas: ${temasError.message}`,
      }
    }

    // 3. Eliminar relaciones en peticiones_clasificacion
    const { error: clasifError } = await supabase.from("peticiones_clasificacion").delete().eq("peticiones_id", id)

    if (clasifError) {
      console.error("Error al eliminar relaciones de clasificación:", clasifError)
      // Continuamos aunque haya error
    }

    // 4. Eliminar relaciones en peticiones_legisladores
    const { error: legisError } = await supabase.from("peticiones_legisladores").delete().eq("peticiones_id", id)

    if (legisError) {
      console.error("Error al eliminar relaciones de legisladores:", legisError)
      // Continuamos aunque haya error
    }

    // 5. Eliminar relaciones en peticiones_asesores
    const { error: asesorError } = await supabase.from("peticiones_asesores").delete().eq("peticiones_id", id)

    if (asesorError) {
      console.error("Error al eliminar relaciones de asesores:", asesorError)
      // Continuamos aunque haya error
    }

    // 6. Eliminar la petición
    const { error: peticionError } = await supabase.from("peticiones").delete().eq("id", id)

    if (peticionError) {
      console.error("Error al eliminar la petición:", peticionError)
      return {
        success: false,
        error: `Error al eliminar la petición: ${peticionError.message}`,
      }
    }

    // Revalidar la ruta para actualizar los datos
    revalidatePath("/dashboard/peticiones")

    return { success: true }
  } catch (error) {
    console.error("Error al procesar la solicitud:", error)
    return {
      success: false,
      error: "Error interno del servidor",
    }
  }
}
