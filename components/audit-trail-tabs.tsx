"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AuditTrailTable } from "@/components/audit-trail-table"
import { AuditTrailDashboard } from "@/components/audit-trail-dashboard"

type AuditTrailTabsProps = {
  enableRealtime?: boolean
}

export function AuditTrailTabs({ enableRealtime = false }: AuditTrailTabsProps) {
  return (
    <Tabs defaultValue="table" className="w-full">
      <div className="flex justify-between items-center mb-6">
        <TabsList>
          <TabsTrigger value="table">Registro de Actividades</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard de Usuarios</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="table" className="mt-0">
        <AuditTrailTable enableRealtime={enableRealtime} />
      </TabsContent>

      <TabsContent value="dashboard" className="mt-0">
        <AuditTrailDashboard enableRealtime={enableRealtime} />
      </TabsContent>
    </Tabs>
  )
}
