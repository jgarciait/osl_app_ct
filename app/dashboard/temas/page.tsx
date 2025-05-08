import { createServerClient } from "@/lib/supabase-server"
import { TemasTable } from "@/components/temas-table"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function TemasPage() {
  const supabase = createServerClient()

  // Obtener todos los temas
  const { data: temas, error } = await supabase.from("temas").select("*").order("nombre", { ascending: true })

  if (error) {
    console.error("Error al obtener temas:", error)
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Temas</h1>
        <Link href="/dashboard/temas/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Tema
          </Button>
        </Link>
      </div>

      <TemasTable temas={temas || []} />
    </div>
  )
}
