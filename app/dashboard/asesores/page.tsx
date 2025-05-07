import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { AsesoresTable } from "@/components/asesores-table"
import { redirect } from "next/navigation"

export default async function AsesoresPage() {
  const supabase = createServerComponentClient({ cookies })

  // Verificar autenticación
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    redirect("/login")
  }

  // Obtener lista de asesores
  const { data: asesores, error } = await supabase.from("asesores").select("*").order("apellido", { ascending: true })

  if (error) {
    console.error("Error al cargar asesores:", error)
  }

  return (
    <div className="container mx-auto py-6">
      <AsesoresTable asesores={asesores || []} />
    </div>
  )
}
