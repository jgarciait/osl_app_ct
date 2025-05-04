"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"

export function TopicChart() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Colores para el gráfico de pastel
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#A4DE6C", "#D0ED57", "#FAD000"]

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const supabase = createClientClient()

        // Obtener datos agrupados por tema
        const { data: topicData, error } = await supabase
          .from("expresiones")
          .select("tema_id, temas(nombre)")
          .not("tema_id", "is", null)

        if (error) throw error

        // Procesar los datos para el gráfico
        const topicCounts: Record<string, number> = {}

        topicData.forEach((item) => {
          const topicName = item.temas?.nombre || "Sin tema"
          topicCounts[topicName] = (topicCounts[topicName] || 0) + 1
        })

        const chartData = Object.entries(topicCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)

        setData(chartData)
      } catch (error) {
        console.error("Error al cargar datos de temas:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los datos de temas",
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
        <CardTitle>Expresiones por Tema</CardTitle>
        <CardDescription>Distribución de expresiones legislativas por tema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} expresiones`, "Cantidad"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
