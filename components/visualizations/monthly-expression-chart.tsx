"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export function MonthlyExpressionChart() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const supabase = createClientClient()

        // Obtener todas las expresiones con fecha de creación
        const { data: expressionData, error } = await supabase
          .from("expresiones")
          .select("created_at")
          .order("created_at")

        if (error) throw error

        // Procesar los datos para agrupar por mes
        const monthCounts: Record<string, number> = {}

        expressionData.forEach((item) => {
          if (!item.created_at) return

          const date = new Date(item.created_at)
          const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
          monthCounts[monthYear] = (monthCounts[monthYear] || 0) + 1
        })

        // Convertir a formato para el gráfico y ordenar cronológicamente
        const chartData = Object.entries(monthCounts)
          .map(([monthYear, count]) => {
            const [year, month] = monthYear.split("-")
            const monthNames = [
              "Enero",
              "Febrero",
              "Marzo",
              "Abril",
              "Mayo",
              "Junio",
              "Julio",
              "Agosto",
              "Septiembre",
              "Octubre",
              "Noviembre",
              "Diciembre",
            ]
            return {
              monthYear,
              name: `${monthNames[Number.parseInt(month) - 1]} ${year}`,
              count,
            }
          })
          .sort((a, b) => a.monthYear.localeCompare(b.monthYear))

        setData(chartData)
      } catch (error) {
        console.error("Error al cargar datos mensuales:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los datos mensuales",
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
        <CardTitle>Expresiones por Mes</CardTitle>
        <CardDescription>Tendencia mensual de expresiones legislativas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ChartContainer
            config={{
              count: {
                label: "Cantidad de Expresiones",
                color: "hsl(var(--chart-2))",
              },
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} interval={0} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Cantidad de Expresiones"
                  stroke="var(--color-count)"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
