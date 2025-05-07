import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { AsesorForm } from "@/components/asesor-form"
import { redirect } from "next/navigation"

export default async function NuevoAsesorPage() {
  const supabase = createServerComponentClient({ cookies })

  // Verificar autenticación
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-6">
      <AsesorForm />
    </div>
  )
}
