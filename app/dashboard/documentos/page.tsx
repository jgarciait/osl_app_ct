import { Suspense } from "react"
import { DocumentosPageClient } from "./DocumentosPageClient"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata = {
  title: "Documentos del Sistema | Expresión Legislativa",
  description: "Gestión de documentos del sistema de Expresión Legislativa",
}

export default function DocumentosPage() {
  return (
    <div className="container mx-auto py-4">
      <Suspense fallback={<Skeleton className="w-full h-[600px]" />}>
        <DocumentosPageClient />
      </Suspense>
    </div>
  )
}
