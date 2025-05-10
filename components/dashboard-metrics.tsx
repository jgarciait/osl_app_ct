"use client"

import { usePeticionesMetrics } from "@/hooks/use-peticiones-metrics"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function DashboardMetrics() {
  const {
    promedioRecepcionAsignacion,
    promedioAsignacionDespacho,
    promedioTotal,
    peticionesRecientes,
    isLoading,
    error,
  } = usePeticionesMetrics()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/4 mb-2" />
            <Skeleton className="h-4 w-2/4" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio de Recepción a Asignación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promedioRecepcionAsignacion.toFixed(1)} días</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio de Asignación a Despacho</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promedioAsignacionDespacho.toFixed(1)} días</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Total Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promedioTotal.toFixed(1)} días</div>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Peticiones Recientes</CardTitle>
          <CardDescription>Las peticiones más recientes y sus tiempos de procesamiento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] overflow-auto">
            {peticionesRecientes.length > 0 ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Núm. Petición</th>
                    <th className="text-left p-2">Clasificación</th>
                    <th className="text-left p-2">Fecha Recibido</th>
                    <th className="text-left p-2">Fecha Asignación</th>
                    <th className="text-left p-2">Fecha Despacho</th>
                    <th className="text-left p-2">Recepción a Asignación</th>
                    <th className="text-left p-2">Asignación a Despacho</th>
                    <th className="text-left p-2">Tiempo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {peticionesRecientes.map((peticion, index) => (
                    <tr key={peticion.id} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                      <td className="p-2">{peticion.num_peticion}</td>
                      <td className="p-2">{peticion.clasificacion}</td>
                      <td className="p-2">
                        {peticion.fecha_recibido ? new Date(peticion.fecha_recibido).toLocaleDateString() : "-"}
                      </td>
                      <td className="p-2">
                        {peticion.fecha_asignacion ? new Date(peticion.fecha_asignacion).toLocaleDateString() : "-"}
                      </td>
                      <td className="p-2">
                        {peticion.fecha_despacho ? new Date(peticion.fecha_despacho).toLocaleDateString() : "-"}
                      </td>
                      <td className="p-2">{peticion.tiempoRecepcionAsignacion || "-"}</td>
                      <td className="p-2">{peticion.tiempoAsignacionDespacho || "-"}</td>
                      <td className="p-2">{peticion.tiempoTotal || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No hay peticiones disponibles
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
