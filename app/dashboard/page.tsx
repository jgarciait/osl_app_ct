"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardCharts } from "@/components/dashboard-charts"
import { InteractiveGraph } from "@/components/interactive-graph"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Maximize2, Minimize2 } from "lucide-react"

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("charts")
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <div className="space-y-4">
      <Card className="h-full">
        <CardContent className="w-full h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-2 gap-2">
              <TabsTrigger value="charts">Gráficos</TabsTrigger>
              <TabsTrigger value="graph">Vista de Grafo</TabsTrigger>
            </TabsList>

            <TabsContent value="charts" className="space-y-4">
              <DashboardCharts />
            </TabsContent>

            <TabsContent
              value="graph"
              className={`container relative ${isFullscreen ? "fixed inset-0 z-50 bg-background p-6" : "space-y-4"}`}
            >
              <div className="absolute top-2 right-2 z-10">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleFullscreen}
                  aria-label={isFullscreen ? "Salir de pantalla completa" : "Ver en pantalla completa"}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              </div>
              <div className={isFullscreen ? "h-[calc(100vh-100px)]" : ""}>
                <InteractiveGraph />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
