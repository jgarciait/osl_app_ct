import { createServerClient } from "@/lib/supabase-server"
import { ExpresionForm } from "@/components/expresion-form"
import { notFound } from "next/navigation"
import { PermissionGuard } from "@/components/permission-guard"

export default async function VerExpresionPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerClient()

  // Fetch expression data
  const { data: expresion, error } = await supabase
    .from("expresiones")
    .select(`
      *,
      expresion_comites(
        comite_id
      )
    `)
    .eq("id", params.id)
    .single()

  if (error || !expresion) {
    notFound()
  }

  // Fetch committees for the form
  const { data: comites } = await supabase.from("comites").select("*").order("nombre")

  // Fetch temas for the form
  const { data: temas } = await supabase.from("temas").select("*").order("nombre")

  // Obtener todas las clasificaciones
  const { data: clasificaciones, error: clasificacionesError } = await supabase
    .from("clasificaciones")
    .select("*")
    .order("nombre", { ascending: true })

  if (clasificacionesError) {
    console.error("Error fetching clasificaciones:", clasificacionesError)
  }

  // Obtener las clasificaciones asignadas a esta expresión
  const { data: expresionClasificaciones, error: expresionClasificacionesError } = await supabase
    .from("expresion_clasificaciones")
    .select("clasificacion_id")
    .eq("expresion_id", params.id)

  if (expresionClasificacionesError) {
    console.error("Error fetching expresion clasificaciones:", expresionClasificacionesError)
  }

  // Extraer los IDs de clasificaciones
  const selectedClasificacionIds = expresionClasificaciones?.map((item) => item.clasificacion_id) || []

  // Extract committee IDs
  const comiteIds = expresion.expresion_comites.map((ec) => ec.comite_id)

  return (
    <PermissionGuard resource="expressions" action="view" fallback={<p>No tiene permiso para ver expresiones.</p>}>
      <div className="w-full py-6 px-4">
        <ExpresionForm
          expresion={expresion}
          comites={comites || []}
          temas={temas || []}
          clasificaciones={clasificaciones || []}
          selectedComiteIds={comiteIds}
          selectedClasificacionIds={selectedClasificacionIds}
          isEditing={false}
          readOnly={true}
        />
      </div>
    </PermissionGuard>
  )
}
