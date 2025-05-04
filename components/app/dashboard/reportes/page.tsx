import { createServerClient } from "@/lib/supabase-server"
import { ReportesForm } from "@/components/reportes-form"

export default async function ReportesPage() {
  const supabase = createServerClient()

  // Obtener años disponibles para los filtros
  const { data: years } = await supabase.from("expresiones").select("ano").order("ano", { ascending: false })

  // Obtener comisiones para los filtros
  const { data: comites } = await supabase.from("comites").select("*").order("nombre", { ascending: true })

  // Eliminar duplicados de años
  const uniqueYears = years ? [...new Set(years.map((y) => y.ano))] : [new Date().getFullYear()]

  return (
    <>
      <div className="w-full py-6 px-4">
        <div className="space-y-6">
          <ReportesForm years={uniqueYears} comites={comites || []} />
        </div>
      </div>
    </>
  )
}
