import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { AsesorForm } from "@/components/asesor-form"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"

interface PageProps {
  params: {
    id: string
  }
}

export default async function EditarAsesorPage({ params }: PageProps) {
  const supabase = createServerComponentClient({ cookies })

  // Verificar autenticación
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    redirect("/login")
  }

  // Obtener datos del asesor
  const { data: asesor, error } = await supabase.from("asesores").select("*").eq("id", params.id).single()

  if (error || !asesor) {
    notFound()
  }

  return (
    <div className="container mx-auto py-6">
      <AsesorForm asesor={asesor} isEditing={true} />
    </div>
  )
}
