import { createServerClient } from "@/lib/supabase-server"
import { TemaForm } from "@/components/tema-form"
import { notFound } from "next/navigation"

export default async function EditarTemaPage({ params }) {
  const supabase = createServerClient()

  // Obtener el tema por ID
  const { data: tema, error } = await supabase.from("temas").select("*").eq("id", params.id).single()

  if (error || !tema) {
    console.error("Error al obtener tema:", error)
    notFound()
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Editar Tema</h1>
      <TemaForm tema={tema} />
    </div>
  )
}
