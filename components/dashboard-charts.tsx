"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArchiveIcon,
  FileTextIcon,
  CheckCircleIcon,
  FilterIcon,
  DownloadIcon,
  FileIcon,
} from "lucide-react"
import Image from "next/image"
import { SimpleBarChart } from "./simple-bar-chart"
import { SimplePieChart } from "./simple-pie-chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

// Constantes para los meses
const MONTHS = [
  { value: "all", label: "Todos los meses" },
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
]

export function DashboardCharts() {
  const supabase = createClientClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    archived: 0,
    files: 0,
  })
  const [monthlyData, setMonthlyData] = useState([])
  const [comisionesData, setComisionesData] = useState([])
  const [temasData, setTemasData] = useState([])

  // Estado para los filtros
  const [availableYears, setAvailableYears] = useState([])
  const [selectedYear, setSelectedYear] = useState("all")
  const [selectedMonth, setSelectedMonth] = useState("all")

  // Add this after the other state declarations
  const [realtimeIndicator, setRealtimeIndicator] = useState(false)

  // Efecto para cargar los años disponibles
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const { data: years, error } = await supabase
          .from("expresiones")
          .select("ano")
          .order("ano", { ascending: false })

        if (error) throw error

        // Obtener años únicos
        const uniqueYears = [...new Set(years.map((y) => y.ano))]
        setAvailableYears(uniqueYears)

        // Si no hay años seleccionados, usar el año actual
        if (uniqueYears.length > 0 && selectedYear === "all") {
          const currentYear = new Date().getFullYear()
          // Si el año actual está disponible, seleccionarlo
          if (uniqueYears.includes(currentYear)) {
            setSelectedYear(currentYear.toString())
          } else {
            // Si no, seleccionar el año más reciente
            setSelectedYear(uniqueYears[0].toString())
          }
        }
      } catch (error) {
        console.error("Error al cargar años disponibles:", error)
      }
    }

    fetchAvailableYears()
  }, [supabase])

  // Move the fetchData function outside the useEffect but keep it inside the component
  const fetchData = async () => {
    setLoading(true)
    try {
      // Construir la consulta base para estadísticas
      let statsQuery = supabase.from("expresiones").select("id, archivado")

      // Aplicar filtros si están seleccionados
      if (selectedYear !== "all") {
        statsQuery = statsQuery.eq("ano", Number.parseInt(selectedYear))
      }

      if (selectedMonth !== "all") {
        statsQuery = statsQuery.eq("mes", Number.parseInt(selectedMonth))
      }

      // Ejecutar la consulta para obtener todas las expresiones filtradas
      const { data: filteredExpressions, error: statsError } = await statsQuery

      if (statsError) throw new Error("Error al obtener estadísticas")

      // Calcular estadísticas
      const totalCount = filteredExpressions?.length || 0
      const activeCount = filteredExpressions?.filter((exp) => !exp.archivado).length || 0
      const archivedCount = filteredExpressions?.filter((exp) => exp.archivado).length || 0

      setStats({
        total: totalCount,
        active: activeCount,
        archived: archivedCount,
      })

      // Obtener datos mensuales
      let monthlyQuery = supabase.from("expresiones").select("id, mes, archivado")

      // Aplicar filtro de año si está seleccionado
      if (selectedYear !== "all") {
        monthlyQuery = monthlyQuery.eq("ano", Number.parseInt(selectedYear))
      }

      // No aplicamos el filtro de mes aquí porque queremos ver todos los meses para la gráfica mensual

      const { data: monthlyExpresiones, error: monthlyError } = await monthlyQuery

      if (monthlyError) throw new Error("Error al obtener datos mensuales")

      // Procesar datos mensuales
      const monthsData = Array(12)
        .fill(0)
        .map((_, index) => ({
          mes: index + 1,
          nombre: new Date(2023, index, 1).toLocaleString("es-ES", { month: "short" }),
          total: 0,
          activas: 0,
          archivadas: 0,
          value: 0, // Añadir propiedad value para SimpleBarChart
          name: new Date(2023, index, 1).toLocaleString("es-ES", { month: "long" }), // Añadir propiedad name para SimpleBarChart
        }))

      monthlyExpresiones?.forEach((exp) => {
        if (exp.mes >= 1 && exp.mes <= 12) {
          monthsData[exp.mes - 1].total += 1
          monthsData[exp.mes - 1].value += 1 // Actualizar también la propiedad value
          if (exp.archivado) {
            monthsData[exp.mes - 1].archivadas += 1
          } else {
            monthsData[exp.mes - 1].activas += 1
          }
        }
      })

      // Si hay un mes seleccionado, filtramos los datos mensuales para mostrar solo ese mes
      if (selectedMonth !== "all") {
        const monthIndex = Number.parseInt(selectedMonth) - 1
        const filteredMonthData = [monthsData[monthIndex]]
        setMonthlyData(filteredMonthData)
      } else {
        // Obtener los últimos 6 meses o todos si hay menos de 6
        const currentMonth = new Date().getMonth()
        const last6Months = []
        for (let i = 5; i >= 0; i--) {
          const monthIndex = (currentMonth - i + 12) % 12
          last6Months.push(monthsData[monthIndex])
        }
        // Asegurarse de que los datos tienen las propiedades necesarias para el gráfico
        const processedData = last6Months.map((month) => ({
          ...month,
          value: month.total, // Asegurar que value está establecido correctamente
          name: month.nombre, // Asegurar que name está establecido correctamente
        }))
        console.log("Datos mensuales procesados:", processedData)
        setMonthlyData(processedData)
      }

      // Obtener datos de comisiones con filtros
      let comisionesQuery = supabase.from("expresiones").select(`
      id,
      expresion_comites(
        comite_id,
        comites(id, nombre, tipo)
      )
    `)

      // Aplicar filtros
      if (selectedYear !== "all") {
        comisionesQuery = comisionesQuery.eq("ano", Number.parseInt(selectedYear))
      }

      if (selectedMonth !== "all") {
        comisionesQuery = comisionesQuery.eq("mes", Number.parseInt(selectedMonth))
      }

      const { data: comisionesExpresiones, error: comisionesError } = await comisionesQuery

      if (comisionesError) throw new Error("Error al obtener datos de comisiones")

      // Procesar datos de comisiones
      const comisionesCount = {}

      comisionesExpresiones?.forEach((exp) => {
        exp.expresion_comites?.forEach((item) => {
          const comiteNombre = item.comites?.nombre || "Sin comisión"
          const comiteTipo = item.comites?.tipo || "desconocido"
          const key = `${comiteNombre} (${comiteTipo === "senado" ? "Senado" : "Cámara"})`

          if (comisionesCount[key]) {
            comisionesCount[key] += 1
          } else {
            comisionesCount[key] = 1
          }
        })
      })

      const comisionesArray = Object.entries(comisionesCount).map(([name, value]) => ({
        name,
        value,
      }))

      // Ordenar por cantidad y limitar a los 10 principales
      comisionesArray.sort((a, b) => (b.value as number) - (a.value as number))
      setComisionesData(comisionesArray.slice(0, 10))

      // Obtener datos de temas con filtros
      let temasQuery = supabase.from("expresiones").select("tema").not("tema", "is", null)

      // Aplicar filtros
      if (selectedYear !== "all") {
        temasQuery = temasQuery.eq("ano", Number.parseInt(selectedYear))
      }

      if (selectedMonth !== "all") {
        temasQuery = temasQuery.eq("mes", Number.parseInt(selectedMonth))
      }

      const { data: expresiones, error: temasError } = await temasQuery

      if (temasError) throw new Error("Error al obtener datos de temas")

      // Obtener los nombres de los temas
      const temaIds = expresiones?.map((exp) => exp.tema).filter(Boolean)
      const uniqueTemaIds = [...new Set(temaIds)]

      // Obtener los detalles de los temas
      const { data: temasData, error: temasDetailsError } = await supabase
        .from("temas")
        .select("id, nombre")
        .in("id", uniqueTemaIds)

      if (temasDetailsError) throw new Error("Error al obtener detalles de temas")

      // Crear un mapa de id -> nombre para los temas
      const temasMap = {}
      temasData?.forEach((tema) => {
        temasMap[tema.id] = tema.nombre
      })

      // Contar las expresiones por tema
      const temasCount = {}
      expresiones?.forEach((exp) => {
        const temaNombre = temasMap[exp.tema] || "Sin tema"

        if (temasCount[temaNombre]) {
          temasCount[temaNombre] += 1
        } else {
          temasCount[temaNombre] = 1
        }
      })

      const temasArray = Object.entries(temasCount).map(([name, value]) => ({
        name,
        value,
      }))

      // Ordenar por cantidad
      temasArray.sort((a, b) => (b.value as number) - (a.value as number))
      setTemasData(temasArray)

      // Obtener el conteo de archivos en el bucket "documentos"
      const { data: filesCount, error: filesError } = await supabase.rpc("get_storage_object_count", {
        bucket_name: "documentos",
      })

      if (filesError) {
        console.error("Error al obtener conteo de archivos:", filesError)
      } else {
        // Actualizar el estado con el conteo de archivos
        setStats((prevStats) => ({
          ...prevStats,
          files: filesCount?.[0]?.total_archivos || 0,
        }))
      }
    } catch (error) {
      console.error("Error al cargar datos del dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  // Efecto principal para cargar datos con filtros
  useEffect(() => {
    fetchData()

    // Subscribe to real-time changes on the expresiones table
    const channel = supabase
      .channel("dashboard-expresiones-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expresiones",
        },
        async (payload) => {
          // Show real-time indicator
          setRealtimeIndicator(true)
          setTimeout(() => setRealtimeIndicator(false), 3000)

          // Refetch data to update stats
          fetchData()
        },
      )
      .subscribe()

    // Cleanup subscription when component unmounts
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, selectedYear, selectedMonth])

  // Calcular porcentajes para las tarjetas
  const activePercentage = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0
  const archivedPercentage = stats.total > 0 ? Math.round((stats.archived / stats.total) * 100) : 0

  // Función para resetear los filtros
  const resetFilters = () => {
    setSelectedYear("all")
    setSelectedMonth("all")
  }

  // Función para descargar datos como CSV
  const downloadComisionesData = () => {
    try {
      // Crear contenido CSV con BOM para Excel
      let csvContent = "\uFEFF" // BOM para Excel
      csvContent += "Comisión,Expresiones\r\n"

      comisionesData.forEach((item) => {
        csvContent += `"${item.name}",${item.value}\r\n`
      })

      // Crear blob y enlace de descarga
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")

      // Configurar y simular clic en el enlace
      link.setAttribute("href", url)
      link.setAttribute("download", `comisiones-expresiones-${selectedYear !== "all" ? selectedYear : "todos"}.csv`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error al descargar datos:", error)
      alert("Hubo un error al generar el archivo. Por favor intente nuevamente.")
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="w-full">
        <Image
          src="/images/capitol.jpg"
          alt="Capitolio de Puerto Rico"
          width={1920}
          height={100}
          className="rounded-lg shadow-lg w-full h-[80px] sm:h-[100px] object-cover"
          priority
        />
      </div>

      {/* Filtros */}
      <Card className="bg-gray-50">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <FilterIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>

            <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los años</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={resetFilters} className="col-span-2 sm:col-span-1">
                Limpiar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
            <CardTitle className="text-sm font-medium">Total Expresiones</CardTitle>
            <FileTextIcon className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold relative">
              {stats.total}
              {realtimeIndicator && (
                <span className="absolute -right-4 -top-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedYear !== "all" || selectedMonth !== "all" ? (
                <>
                  Expresiones filtradas
                  {selectedYear !== "all" ? ` (${selectedYear})` : ""}
                  {selectedMonth !== "all" ? ` (${MONTHS.find((m) => m.value === selectedMonth)?.label})` : ""}
                </>
              ) : (
                "Todas las expresiones registradas"
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
            <CardTitle className="text-sm font-medium">Expresiones Activas</CardTitle>
            <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.active}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowUpIcon className="mr-1 h-3 w-3 text-green-500" />
              <span>{activePercentage}% del total</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
            <CardTitle className="text-sm font-medium">Expresiones Archivadas</CardTitle>
            <ArchiveIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.archived}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <ArrowDownIcon className="mr-1 h-3 w-3 text-gray-500" />
              <span>{archivedPercentage}% del total</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
            <CardTitle className="text-sm font-medium">Documentos Almacenados</CardTitle>
            <FileIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.files}</div>
            <p className="text-xs text-muted-foreground">Total de archivos en el sistema</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="comisiones" className="w-full">
        <TabsList className="w-full overflow-x-auto flex-nowrap">
          <TabsTrigger value="comisiones" className="flex-1">
            Por Comisión
          </TabsTrigger>
          <TabsTrigger value="mensual" className="flex-1">
            Expresiones por Mes
          </TabsTrigger>
          <TabsTrigger value="temas" className="flex-1">
            Por Tema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mensual">
          <Card>
            <CardContent className="px-1 sm:px-3 py-2 sm:py-3">
              <CardDescription className="text-xs sm:text-sm mb-2">
                Distribución mensual de expresiones ciudadanas.
                {selectedYear !== "all" ? ` (${selectedYear})` : ""}
              </CardDescription>
              {loading ? (
                <div className="flex h-[250px] sm:h-[350px] items-center justify-center">
                  <p>Cargando datos...</p>
                </div>
              ) : monthlyData.length === 0 ? (
                <div className="flex h-[250px] sm:h-[350px] items-center justify-center">
                  <p>No hay datos disponibles para mostrar</p>
                </div>
              ) : (
                <div>
                  <div className="w-full h-[250px] sm:h-[350px] border border-gray-200 rounded-lg p-2 sm:p-4">
                    <SimpleBarChart data={monthlyData} height={250} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comisiones">
          <Card>
            <CardContent className="px-1 sm:px-3 py-2 sm:py-3 h-[400px]">
              <CardDescription className="text-xs sm:text-sm mb-2">
                Distribución de expresiones según las comisiones a las que fueron referidas
                {selectedYear !== "all" ? ` (${selectedYear})` : ""}
                {selectedMonth !== "all" ? ` - ${MONTHS.find((m) => m.value === selectedMonth)?.label}` : ""}
              </CardDescription>
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <p>Cargando datos...</p>
                </div>
              ) : comisionesData.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p>No hay datos disponibles para mostrar</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-auto md:h-full">
                  <div className="h-[250px] sm:h-[320px] border border-gray-200 rounded-lg p-2 sm:p-4">
                    <SimplePieChart
                      data={comisionesData.length > 0 ? comisionesData : [{ name: "Sin datos", value: 1 }]}
                    />
                  </div>

                  <div className="h-[250px] sm:h-[320px] overflow-auto border border-gray-200 rounded-lg w-full">
                    <table className="min-w-full w-full">
                      <thead className="bg-gray-50 sticky top-0 z-10 w-full">
                        <tr className="w-full">
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2 px-2 sm:px-4 w-3/4">
                            REFERIDOS
                          </th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-2 px-2 sm:px-4 w-1/4">
                            <div className="flex items-center justify-end">
                              <span className="mr-2">Expresiones</span>
                              <button
                                onClick={downloadComisionesData}
                                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                                title="Descargar datos en CSV"
                              >
                                <DownloadIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 w-full">
                        {comisionesData.map((item, index) => (
                          <tr key={index} className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} w-full`}>
                            <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm w-3/4">{item.name}</td>
                            <td className="py-2 px-2 sm:px-4 text-xs sm:text-sm text-right w-1/4">{item.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="temas">
          <Card>
            <CardContent className="px-1 sm:px-3 py-2 sm:py-3 h-[400px] sm:h-[500px]">
              <CardDescription className="text-xs sm:text-sm mb-2">
                Distribución de expresiones según los temas asignados
                {selectedYear !== "all" ? ` (${selectedYear})` : ""}
                {selectedMonth !== "all" ? ` - ${MONTHS.find((m) => m.value === selectedMonth)?.label}` : ""}
              </CardDescription>
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <p>Cargando datos...</p>
                </div>
              ) : temasData.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p>No hay datos de temas disponibles</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 h-full">
                  <div className="h-[95%] overflow-auto border border-gray-200 rounded-lg p-2 sm:p-4">
                    <div className="h-full">
                      <div className="space-y-2">
                        {temasData.map((tema, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div
                              className="h-3 sm:h-4 rounded-sm"
                              style={{
                                width: `${Math.max(Math.min(((tema.value as number) / Math.max(...temasData.map((t) => t.value as number))) * 100, 100), 5)}%`,
                                backgroundColor: `hsl(${(index * 25) % 360}, 70%, 50%)`,
                              }}
                            />
                            <div className="flex justify-between w-full">
                              <span
                                className="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-[200px]"
                                title={tema.name as string}
                              >
                                {tema.name}
                              </span>
                              <span className="text-xs sm:text-sm font-medium text-gray-500">{tema.value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
