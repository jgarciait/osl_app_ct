"use client"
import { TemasTable } from "@/components/temas-table"
import { TemaForm } from "@/components/tema-form"
import { useToast } from "@/components/ui/use-toast"

export default function TemasPage() {
  const { toast } = useToast()

  return (
    <div className="w-full py-6 px-4">
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">Administre los temas para las peticiones</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <TemaForm />
          <TemasTable />
        </div>
      </div>
    </div>
  )
}
