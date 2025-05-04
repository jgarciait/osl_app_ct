"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, UserIcon, Edit3Icon, PlusCircleIcon, ArchiveIcon, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

type UserActivityData = {
  userId: string
  userEmail: string
  created: number
  edited: number
  archived: number
  total: number
}

type AuditTrailDashboardProps = {
  enableRealtime?: boolean
}

export function AuditTrailDashboard({ enableRealtime = false }: AuditTrailDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<UserActivityData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("total")
  const [realtimeIndicator, setRealtimeIndicator] = useState(false)
  const [rawData, setRawData] = useState<any[]>([])
  const [actionCounts, setActionCounts] = useState<{ [key: string]: number }>({
    created: 0,
    edited: 0,
    archived: 0,
    unknown: 0,
  })

  // Función para obtener el rango de fechas basado en la selección
  const getDateRange = () => {
    const now = new Date()
    switch (timeRange) {
      case "today":
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        return { start: startOfDay.toISOString() }
      case "week":
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - 7)
        return { start: startOfWeek.toISOString() }
      case "month":
        const startOfMonth = new Date(now)
        startOfMonth.setMonth(now.getMonth() - 1)
        return { start: startOfMonth.toISOString() }
      case "year":
        const startOfYear = new Date(now)
        startOfYear.setFullYear(now.getFullYear() - 1)
        return { start: startOfYear.toISOString() }
      default:
        return { start: null }
    }
  }

  // Función para clasificar una acción basada en su texto
  const classifyAction = (actionText: string): "created" | "edited" | "archived" | "unknown" => {
    const lowerText = actionText.toLowerCase()

    // Patrones para acciones de creación
    if (
      lowerText.includes("creó") ||
      lowerText.includes("creo") ||
      lowerText.includes("creada") ||
      lowerText.includes("nueva") ||
      lowerText.includes("expresión creada")
    ) {
      return "created"
    }

    // Patrones para acciones de edición
    if (
      lowerText.includes("editó") ||
      lowerText.includes("edito") ||
      lowerText.includes("actualizó") ||
      lowerText.includes("actualizo") ||
      lowerText.includes("actualizada") ||
      lowerText.includes("modificó") ||
      lowerText.includes("modifico") ||
      lowerText.includes("expresión actualizada")
    ) {
      return "edited"
    }

    // Patrones para acciones de archivado
    if (
      lowerText.includes("archivó") ||
      lowerText.includes("archivo") ||
      lowerText.includes("eliminó") ||
      lowerText.includes("elimino") ||
      lowerText.includes("borró") ||
      lowerText.includes("borro")
    ) {
      return "archived"
    }

    // Si no coincide con ningún patrón conocido
    return "unknown"
  }

  const fetchUserActivityData = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClientClient()
      const dateRange = getDateRange()

      // Consulta para obtener todas las acciones de auditoría
      let query = supabase
        .from("audit_trail_expresiones")
        .select(`
          id,
          created_at,
          user_id,
          action,
          profiles:user_id (
            email
          )
        `)
        .order("created_at", { ascending: false })

      // Aplicar filtro de fecha si es necesario
      if (dateRange.start) {
        query = query.gte("created_at", dateRange.start)
      }

      const { data: actions, error: actionsError } = await query

      if (actionsError) {
        throw new Error("Error al obtener registros de auditoría")
      }

      console.log("Registros de auditoría obtenidos:", actions.length)

      // Guardar datos crudos para depuración
      setRawData(actions)

      // Contadores para tipos de acciones
      const counts = {
        created: 0,
        edited: 0,
        archived: 0,
        unknown: 0,
      }

      // Agrupar acciones por usuario
      const userActivityMap = new Map<
        string,
        {
          userId: string
          userEmail: string
          created: number
          edited: number
          archived: number
          total: number
        }
      >()

      // Procesar cada acción
      for (const action of actions) {
        const userId = action.user_id
        const userEmail = action.profiles?.email || "Usuario desconocido"
        const actionText = action.action || ""

        // Si el usuario no está en el mapa, añadirlo
        if (!userActivityMap.has(userId)) {
          userActivityMap.set(userId, {
            userId,
            userEmail,
            created: 0,
            edited: 0,
            archived: 0,
            total: 0,
          })
        }

        const userActivity = userActivityMap.get(userId)!

        // Clasificar la acción
        const actionType = classifyAction(actionText)

        // Incrementar contadores según el tipo de acción
        switch (actionType) {
          case "created":
            userActivity.created += 1
            userActivity.total += 1
            counts.created += 1
            console.log(`Acción de CREACIÓN detectada: "${actionText}" - Usuario: ${userEmail}`)
            break

          case "edited":
            userActivity.edited += 1
            userActivity.total += 1
            counts.edited += 1
            console.log(`Acción de EDICIÓN detectada: "${actionText}" - Usuario: ${userEmail}`)
            break

          case "archived":
            userActivity.archived += 1
            userActivity.total += 1
            counts.archived += 1
            console.log(`Acción de ARCHIVADO detectada: "${actionText}" - Usuario: ${userEmail}`)
            break

          default:
            counts.unknown += 1
            console.log(`Acción NO CATEGORIZADA: "${actionText}" - Usuario: ${userEmail}`)
        }
      }

      // Actualizar contadores de acciones
      setActionCounts(counts)
      console.log("Conteo de acciones:", counts)

      // Convertir el mapa a un array y filtrar usuarios sin actividad
      const userActivityData = Array.from(userActivityMap.values()).filter((user) => user.total > 0)

      console.log("Datos de actividad procesados:", userActivityData.length)
      console.log("Usuarios con actividad:", userActivityData)

      // Ordenar los datos según el criterio seleccionado
      userActivityData.sort((a, b) => {
        switch (sortBy) {
          case "created":
            return b.created - a.created
          case "edited":
            return b.edited - a.edited
          case "archived":
            return b.archived - a.archived
          case "email":
            return a.userEmail.localeCompare(b.userEmail)
          default:
            return b.total - a.total
        }
      })

      setUserData(userActivityData)
    } catch (error) {
      console.error("Error al obtener datos de actividad de usuarios:", error)
      setError("Ocurrió un error al cargar los datos de actividad")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log("Iniciando carga de datos de auditoría...")
    fetchUserActivityData()

    // Configurar Realtime subscription si está habilitado
    let subscription: any = null

    if (enableRealtime) {
      const supabase = createClientClient()

      subscription = supabase
        .channel("audit-dashboard-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "audit_trail_expresiones",
          },
          (payload) => {
            console.log("Cambio en tiempo real recibido en dashboard:", payload)

            // Mostrar indicador de actualización
            setRealtimeIndicator(true)
            setTimeout(() => setRealtimeIndicator(false), 3000)

            // Actualizar datos
            fetchUserActivityData()
          },
        )
        .subscribe()

      console.log("Suscripción Realtime activada para dashboard de auditoría")
    }

    // Limpiar suscripción al desmontar
    return () => {
      if (subscription) {
        const supabase = createClientClient()
        supabase.removeChannel(subscription)
        console.log("Suscripción Realtime desactivada")
      }
    }
  }, [timeRange, sortBy, enableRealtime])

  // Calcular totales
  const totalCreated = userData.reduce((sum, user) => sum + user.created, 0)
  const totalEdited = userData.reduce((sum, user) => sum + user.edited, 0)
  const totalArchived = userData.reduce((sum, user) => sum + user.archived, 0)
  const totalActions = totalCreated + totalEdited + totalArchived

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Periodo de tiempo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el tiempo</SelectItem>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mes</SelectItem>
              <SelectItem value="year">Último año</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total">Total de acciones</SelectItem>
              <SelectItem value="created">Expresiones creadas</SelectItem>
              <SelectItem value="edited">Expresiones editadas</SelectItem>
              <SelectItem value="archived">Expresiones archivadas</SelectItem>
              <SelectItem value="email">Email</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={fetchUserActivityData} className="self-start">
          Actualizar datos
        </Button>
      </div>

      {enableRealtime && (
        <div className="flex items-center text-sm text-green-600">
          <span className="relative flex h-3 w-3 mr-2">
            <span
              className={`${realtimeIndicator ? "animate-ping" : ""} absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75`}
            ></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Actualizaciones en tiempo real activadas
        </div>
      )}

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Acciones</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActions}</div>
            <p className="text-xs text-muted-foreground">Todas las acciones registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expresiones Creadas</CardTitle>
            <PlusCircleIcon className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCreated}</div>
            <p className="text-xs text-muted-foreground">
              {totalActions > 0 ? ((totalCreated / totalActions) * 100).toFixed(1) : "0.0"}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expresiones Editadas</CardTitle>
            <Edit3Icon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEdited}</div>
            <p className="text-xs text-muted-foreground">
              {totalActions > 0 ? ((totalEdited / totalActions) * 100).toFixed(1) : "0.0"}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expresiones Archivadas</CardTitle>
            <ArchiveIcon className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalArchived}</div>
            <p className="text-xs text-muted-foreground">
              {totalActions > 0 ? ((totalArchived / totalActions) * 100).toFixed(1) : "0.0"}% del total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de actividad por usuario */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad por Usuario</CardTitle>
          <CardDescription>
            Resumen de acciones realizadas por cada usuario en el sistema
            {timeRange !== "all" && (
              <>
                {" "}
                en{" "}
                {timeRange === "today"
                  ? "el día de hoy"
                  : timeRange === "week"
                    ? "la última semana"
                    : timeRange === "month"
                      ? "el último mes"
                      : "el último año"}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-[#1a365d]" />
              <span className="ml-2">Cargando datos de actividad...</span>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center py-10 text-red-500">
              <AlertCircle className="h-6 w-6 mr-2" />
              <span>{error}</span>
            </div>
          ) : userData.length === 0 ? (
            <div className="space-y-6">
              <div className="text-center py-6 text-muted-foreground">
                No se encontraron registros de actividad para el periodo seleccionado
              </div>

              {/* Sección de depuración para administradores */}
              <div className="border rounded-md p-4 bg-gray-50">
                <h3 className="text-sm font-medium mb-2">Información de depuración:</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-xs font-medium mb-1">Conteo de acciones:</h4>
                    <ul className="text-xs">
                      <li>Creadas: {actionCounts.created}</li>
                      <li>Editadas: {actionCounts.edited}</li>
                      <li>Archivadas: {actionCounts.archived}</li>
                      <li>No categorizadas: {actionCounts.unknown}</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium mb-1">Total registros:</h4>
                    <p className="text-xs">{rawData.length}</p>
                  </div>
                </div>
                <h4 className="text-xs font-medium mb-1">Primeros 5 registros:</h4>
                <div className="text-xs overflow-auto max-h-60">
                  <pre>{JSON.stringify(rawData.slice(0, 5), null, 2)}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
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
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Creadas
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Editadas
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Archivadas
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userData.map((user) => (
                    <tr key={user.userId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-gray-500" />
                          </div>
                          <div className="ml-4">
                            <div
                              className="text-sm font-medium text-gray-900 truncate max-w-[200px]"
                              title={user.userEmail}
                            >
                              {user.userEmail.split("@")[0]}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-[200px]" title={user.userEmail}>
                              {user.userEmail}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900 font-medium">{user.created}</div>
                        <div className="text-xs text-gray-500">
                          {user.total > 0 ? ((user.created / user.total) * 100).toFixed(0) : 0}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900 font-medium">{user.edited}</div>
                        <div className="text-xs text-gray-500">
                          {user.total > 0 ? ((user.edited / user.total) * 100).toFixed(0) : 0}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900 font-medium">{user.archived}</div>
                        <div className="text-xs text-gray-500">
                          {user.total > 0 ? ((user.archived / user.total) * 100).toFixed(0) : 0}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-bold text-gray-900">{user.total}</div>
                        <div className="text-xs text-gray-500">
                          {totalActions > 0 ? ((user.total / totalActions) * 100).toFixed(1) : 0}% del total
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visualización de barras */}
      {!loading && !error && userData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Actividad</CardTitle>
            <CardDescription>Visualización de la actividad por usuario</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Tabs defaultValue="total" className="w-full">
                <TabsList className="grid grid-cols-4 mb-4">
                  <TabsTrigger value="total">Total</TabsTrigger>
                  <TabsTrigger value="created">Creadas</TabsTrigger>
                  <TabsTrigger value="edited">Editadas</TabsTrigger>
                  <TabsTrigger value="archived">Archivadas</TabsTrigger>
                </TabsList>

                <TabsContent value="total" className="space-y-4">
                  {userData.slice(0, 10).map((user) => (
                    <div key={`total-${user.userId}`} className="flex items-center">
                      <div className="w-32 truncate text-xs" title={user.userEmail}>
                        {user.userEmail.split("@")[0]}
                      </div>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${Math.min(100, (user.total / Math.max(...userData.map((u) => u.total))) * 100)}%`,
                            minWidth: "10px",
                          }}
                        ></div>
                      </div>
                      <div className="w-12 text-xs text-right ml-2">{user.total}</div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="created" className="space-y-4">
                  {userData
                    .filter((user) => user.created > 0)
                    .sort((a, b) => b.created - a.created)
                    .slice(0, 10)
                    .map((user) => (
                      <div key={`created-${user.userId}`} className="flex items-center">
                        <div className="w-32 truncate text-xs" title={user.userEmail}>
                          {user.userEmail.split("@")[0]}
                        </div>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                userData.some((u) => u.created > 0)
                                  ? (user.created / Math.max(...userData.map((u) => u.created || 0))) * 100
                                  : 0,
                              )}%`,
                              minWidth: "10px",
                            }}
                          ></div>
                        </div>
                        <div className="w-12 text-xs text-right ml-2">{user.created}</div>
                      </div>
                    ))}
                  {userData.filter((user) => user.created > 0).length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">No hay datos de expresiones creadas</div>
                  )}
                </TabsContent>

                <TabsContent value="edited" className="space-y-4">
                  {userData
                    .filter((user) => user.edited > 0)
                    .sort((a, b) => b.edited - a.edited)
                    .slice(0, 10)
                    .map((user) => (
                      <div key={`edited-${user.userId}`} className="flex items-center">
                        <div className="w-32 truncate text-xs" title={user.userEmail}>
                          {user.userEmail.split("@")[0]}
                        </div>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                userData.some((u) => u.edited > 0)
                                  ? (user.edited / Math.max(...userData.map((u) => u.edited || 0))) * 100
                                  : 0,
                              )}%`,
                              minWidth: "10px",
                            }}
                          ></div>
                        </div>
                        <div className="w-12 text-xs text-right ml-2">{user.edited}</div>
                      </div>
                    ))}
                  {userData.filter((user) => user.edited > 0).length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">No hay datos de expresiones editadas</div>
                  )}
                </TabsContent>

                <TabsContent value="archived" className="space-y-4">
                  {userData
                    .filter((user) => user.archived > 0)
                    .sort((a, b) => b.archived - a.archived)
                    .slice(0, 10)
                    .map((user) => (
                      <div key={`archived-${user.userId}`} className="flex items-center">
                        <div className="w-32 truncate text-xs" title={user.userEmail}>
                          {user.userEmail.split("@")[0]}
                        </div>
                        <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                userData.some((u) => u.archived > 0)
                                  ? (user.archived / Math.max(...userData.map((u) => u.archived || 0))) * 100
                                  : 0,
                              )}%`,
                              minWidth: "10px",
                            }}
                          ></div>
                        </div>
                        <div className="w-12 text-xs text-right ml-2">{user.archived}</div>
                      </div>
                    ))}
                  {userData.filter((user) => user.archived > 0).length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">No hay datos de expresiones archivadas</div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
