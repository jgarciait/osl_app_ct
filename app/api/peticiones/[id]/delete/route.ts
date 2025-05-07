import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const id = params.id

  if (!id) {
    return NextResponse.json({ error: "ID de petición no proporcionado" }, { status: 400 })
  }

  try {
    // Crear cliente de Supabase con cookies del servidor
    const supabase = createRouteHandlerClient({ cookies })

    // ELIMINADO: Ya no verificamos la autenticación
    // Procedemos directamente con las operaciones de eliminación

    // 1. Eliminar documentos relacionados
    const { error: docsError } = await supabase.from("documentos_peticiones").delete().eq("peticion_id", id)

    if (docsError) {
      console.error("Error al eliminar documentos:", docsError)
      return NextResponse.json({ error: `Error al eliminar documentos: ${docsError.message}` }, { status: 500 })
    }

    // 2. Eliminar relaciones en peticiones_temas
    const { error: temasError } = await supabase.from("peticiones_temas").delete().eq("peticiones_id", id)

    if (temasError) {
      console.error("Error al eliminar relaciones de temas:", temasError)
      return NextResponse.json(
        { error: `Error al eliminar relaciones de temas: ${temasError.message}` },
        { status: 500 },
      )
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
      return NextResponse.json({ error: `Error al eliminar la petición: ${peticionError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al procesar la solicitud:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
