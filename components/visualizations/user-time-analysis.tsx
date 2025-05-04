"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Clock, Award, AlertCircle } from "lucide-react"

type UserTimeData = {
  userId: string
  userEmail: string
  averageTimeMinutes: number
  expressionCount: number
  fastestTimeMinutes: number
  slowestTimeMinutes: number
}

type UserTimeAnalysisProps = {
  selectedYear?: number
  selectedMonth?: number
}

export function UserTimeAnalysis({ selectedYear, selectedMonth }: UserTimeAnalysisProps) {
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<UserTimeData[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserTimeData = async () => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClientClient()

        // Primero, obtenemos todos los usuarios que han creado expresiones
        const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id, email")

        if (profilesError) throw new Error("Error al obtener perfiles de usuarios")

        // Para cada usuario, calculamos su tiempo promedio de creación
        const userTimeData: UserTimeData[] = []

        for (const profile of profiles) {
          // Obtenemos todas las acciones de creación de expresiones para este usuario
          const { data: startActions, error: startError } = await supabase
            .from("audit_trail_expresiones")
            .select("*")
            .eq("user_id", profile.id)
            .ilike("action", "%comenzó a crear%")
            .order("created_at", { ascending: true })

          if (startError) continue

          const { data: endActions, error: endError } = await supabase
            .from("audit_trail_expresiones")
            .select("*")
            .eq("user_id", profile.id)
            .ilike("action", "%creó la expresión%")
            .order("created_at", { ascending: true })

          if (endError) continue

          // Ahora emparejamos las acciones de inicio y fin para calcular tiempos
          const timeDifferences: number[] = []
          let expressionCount = 0
          let fastestTime = Number.MAX_SAFE_INTEGER
          let slowestTime = 0

          // Para cada acción de finalización, buscamos la acción de inicio más cercana anterior
          for (const endAction of endActions) {
            // Filtrar por año y mes si se especifican
            const endDate = new Date(endAction.created_at)

            if (selectedYear && endDate.getFullYear() !== selectedYear) continue
            if (selectedMonth && endDate.getMonth() + 1 !== selectedMonth) continue

            // Encontrar la acción de inicio más reciente antes de esta finalización
            const startAction = startActions.find((start) => {
              const startDate = new Date(start.created_at)
              return startDate < endDate
            })

            if (startAction) {
              const startTime = new Date(startAction.created_at).getTime()
              const endTime = new Date(endAction.created_at).getTime()
              const diffMinutes = (endTime - startTime) / (1000 * 60)

              // Solo considerar tiempos razonables (entre 1 minuto y 2 horas)
              if (diffMinutes >= 1 && diffMinutes <= 120) {
                timeDifferences.push(diffMinutes)
                expressionCount++

                if (diffMinutes < fastestTime) fastestTime = diffMinutes
                if (diffMinutes > slowestTime) slowestTime = diffMinutes
              }
            }
          }

          // Calcular el promedio si hay datos
          if (timeDifferences.length > 0) {
            const averageTime = timeDifferences.reduce((sum, time) => sum + time, 0) / timeDifferences.length

            userTimeData.push({
              userId: profile.id,
              userEmail: profile.email,
              averageTimeMinutes: Number.parseFloat(averageTime.toFixed(2)),
              expressionCount,
              fastestTimeMinutes: Number.parseFloat(fastestTime.toFixed(2)),
              slowestTimeMinutes: Number.parseFloat(slowestTime.toFixed(2)),
            })
          }
        }

        // Ordenar por tiempo promedio (ascendente)
        userTimeData.sort((a, b) => a.averageTimeMinutes - b.averageTimeMinutes)
        setUserData(userTimeData)
      } catch (error) {
        console.error("Error al analizar tiempos de usuario:", error)
        setError("Ocurrió un error al analizar los tiempos de creación")
      } finally {
        setLoading(false)
      }
    }

    fetchUserTimeData()
  }, [selectedYear, selectedMonth])

  const formatTime = (minutes: number) => {
    if (minutes < 1) return "menos de 1 minuto"
    if (minutes < 60) return `${Math.floor(minutes)} minutos`

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.floor(minutes % 60)

    if (remainingMinutes === 0) return `${hours} hora${hours > 1 ? "s" : ""}`
    return `${hours} hora${hours > 1 ? "s" : ""} y ${remainingMinutes} minuto${remainingMinutes > 1 ? "s" : ""}`
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a365d] mr-2" />
        <p>Analizando datos de tiempos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        <AlertCircle className="h-6 w-6 mr-2" />
        <p>{error}</p>
      </div>
    )
  }

  if (userData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>No hay suficientes datos para calcular tiempos de creación</p>
      </div>
    )
  }

  // Calcular estadísticas generales
  const overallAverage = userData.reduce((sum, user) => sum + user.averageTimeMinutes, 0) / userData.length
  const fastestUser = userData[0]
  const mostEfficientUser = userData.reduce((prev, current) =>
    current.expressionCount > prev.expressionCount ? current : prev,
  )

  return (
    <div className="h-full overflow-auto">
      {/* Resumen general */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="bg-blue-50">
          <CardContent className="p-4 flex items-center">
            <Clock className="h-10 w-10 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium">Tiempo promedio general</p>
              <p className="text-xl font-bold">{formatTime(overallAverage)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50">
          <CardContent className="p-4 flex items-center">
            <Award className="h-10 w-10 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium">Usuario más rápido</p>
              <p className="text-lg font-bold truncate" title={fastestUser.userEmail}>
                {fastestUser.userEmail.split("@")[0]}
              </p>
              <p className="text-sm">{formatTime(fastestUser.averageTimeMinutes)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50">
          <CardContent className="p-4 flex items-center">
            <Award className="h-10 w-10 text-purple-500 mr-3" />
            <div>
              <p className="text-sm font-medium">Usuario más productivo</p>
              <p className="text-lg font-bold truncate" title={mostEfficientUser.userEmail}>
                {mostEfficientUser.userEmail.split("@")[0]}
              </p>
              <p className="text-sm">{mostEfficientUser.expressionCount} expresiones</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de tiempos por usuario */}
      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Usuario
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Tiempo Promedio
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Expresiones
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Tiempo Más Rápido
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Tiempo Más Lento
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {userData.map((user) => (
              <tr key={user.userId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]" title={user.userEmail}>
                    {user.userEmail.split("@")[0]}
                  </div>
                  <div className="text-xs text-gray-500 truncate max-w-[150px]" title={user.userEmail}>
                    {user.userEmail}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatTime(user.averageTimeMinutes)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.expressionCount}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-green-600">{formatTime(user.fastestTimeMinutes)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-red-600">{formatTime(user.slowestTimeMinutes)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visualización de barras */}
      <div className="mt-6 border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-4">Tiempo promedio por usuario (minutos)</h3>
        <div className="space-y-3">
          {userData.map((user) => (
            <div key={user.userId} className="flex items-center">
              <div className="w-32 truncate text-xs" title={user.userEmail}>
                {user.userEmail.split("@")[0]}
              </div>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${Math.min(100, (user.averageTimeMinutes / 60) * 100)}%`,
                    minWidth: "10px",
                  }}
                ></div>
              </div>
              <div className="w-20 text-xs text-right ml-2">{user.averageTimeMinutes.toFixed(1)} min</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
