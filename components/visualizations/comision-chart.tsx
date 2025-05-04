"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export function ComisionChart() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const supabase = createClientClient()

        // Obtener datos de la tabla intermedia expresion_comites y hacer join con comites
        const { data: comisionData, error } = await supabase.from("expresion_comites").select(`
            expresion_id,
            comite:comite_id (
              id,
              nombre
            )
          `)

        if (error) throw error

        // Procesar los datos para el gráfico
        const comisionCounts: Record<string, number> = {}

        comisionData.forEach((item) => {
          const comiteName = item.comite?.nombre || "Sin comisión"
          comisionCounts[comiteName] = (comisionCounts[comiteName] || 0) + 1
        })

        const chartData = Object.entries(comisionCounts).map(([name, count]) => ({
          name,
          count,
        }))

        // Ordenar por cantidad descendente
        chartData.sort((a, b) => b.count - a.count)

        setData(chartData)
      } catch (error) {
        console.error("Error al cargar datos de comisiones:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los datos de comisiones: " + (error as Error).message,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [toast])

  if (loading) {
    return <div className="flex justify-center items-center h-64">Cargando datos...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expresiones por Comisión</CardTitle>
        <CardDescription>Distribución de expresiones legislativas por comisión</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ChartContainer
            config={{
              count: {
                label: "Cantidad de Expresiones",
                color: "hsl(var(--chart-1))",
              },
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} interval={0} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="count" name="Cantidad de Expresiones" fill="var(--color-count)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
