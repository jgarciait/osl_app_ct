"use client"
import { ClasificacionesTable } from "@/components/clasificaciones-table"
import { ClasificacionForm } from "@/components/clasificacion-form"
import { useToast } from "@/components/ui/use-toast"

export default function ClasificacionesPage() {
  const { toast } = useToast()

  return (
    <div className="w-full py-6 px-4">
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">Administre las clasificaciones para las peticiones</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <ClasificacionForm />
          <ClasificacionesTable />
        </div>
      </div>
    </div>
  )
}
