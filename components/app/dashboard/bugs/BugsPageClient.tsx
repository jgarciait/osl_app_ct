"use client"

import { BugReportsTable } from "@/components/bug-reports-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function BugsPageClient() {
  const [activeTab, setActiveTab] = useState("activos")

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <Link href="/dashboard/bugs/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Reporte
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 w-[400px]">
          <TabsTrigger value="activos">Reportes Activos</TabsTrigger>
          <TabsTrigger value="archivados">Reportes Archivados</TabsTrigger>
        </TabsList>

        <TabsContent value="activos" className="space-y-4">
          <BugReportsTable statusFilter={["abierto", "pendiente", "en progreso"]} />
        </TabsContent>

        <TabsContent value="archivados" className="space-y-4">
          <BugReportsTable statusFilter={["completado", "resuelto", "cerrado"]} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
