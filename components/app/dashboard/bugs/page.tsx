import type { Metadata } from "next"
import BugsPageClient from "./BugsPageClient"

export const metadata: Metadata = {
  title: "Reportes de Bugs | OSL",
  description: "Gestión de reportes de bugs y problemas de la aplicación",
}

export default function BugsPage() {
  return <BugsPageClient />
}
