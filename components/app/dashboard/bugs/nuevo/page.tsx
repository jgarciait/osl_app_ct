import type { Metadata } from "next"
import { BugReportForm } from "@/components/bug-report-form"

export const metadata: Metadata = {
  title: "Nuevo Reporte de Bug | OSL",
  description: "Formulario para reportar un nuevo bug o problema en la aplicación",
}

export default function NewBugReportPage() {
  return (
    <div className="container mx-auto py-6">
      <BugReportForm />
    </div>
  )
}
