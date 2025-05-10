"use client"

import { useState, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardCharts } from "@/components/dashboard-charts"
import { InteractiveGraph } from "@/components/interactive-graph"
import { DashboardMetrics } from "@/components/dashboard-metrics"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Maximize2, Minimize2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("charts")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [graphType, setGraphType] = useState("asesores")

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  const handleGraphTypeChange = useCallback((value: string) => {
    setGraphType(value)
  }, [])

  return (
    <div className="space-y-4">
      <Card className="h-full">
        <CardContent className="w-full h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-3 gap-2">
              <TabsTrigger value="charts">Gráficos</TabsTrigger>
              <TabsTrigger value="graph">Vista de Grafo</TabsTrigger>
              <TabsTrigger value="metrics">Métricas</TabsTrigger>
            </TabsList>

            <TabsContent value="charts" className="space-y-4">
              <DashboardCharts />
            </TabsContent>

            <TabsContent
              value="graph"
              className={`container relative ${isFullscreen ? "fixed inset-0 z-50 bg-background p-6" : "space-y-4"}`}
            >
              <div className="flex justify-between items-center mb-4">
                <Select value={graphType} onValueChange={handleGraphTypeChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Seleccionar tipo de grafo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asesores">Peticiones por Asesor</SelectItem>
                    <SelectItem value="legisladores">Peticiones por Legislador</SelectItem>
                    <SelectItem value="temas">Peticiones por Tema</SelectItem>
                    <SelectItem value="clasificaciones">Peticiones por Clasificación</SelectItem>
                  </SelectContent>
                </Select>

                <div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleFullscreen}
                    aria-label={isFullscreen ? "Salir de pantalla completa" : "Ver en pantalla completa"}
                  >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className={isFullscreen ? "h-[calc(100vh-100px)]" : ""}>
                <InteractiveGraph relationshipType={graphType as any} />
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <DashboardMetrics />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
