"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ArchiveIcon,
  FileTextIcon,
  CheckCircleIcon,
  FilterIcon,
  FileIcon,
  DownloadIcon,
} from "lucide-react"
import Image from "next/image"
import { SimpleBarChart } from "./simple-bar-chart"
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

  // Estado para los filtros
  const [availableYears, setAvailableYears] = useState([])
  const [selectedYear, setSelectedYear] = useState("all")
  const [selectedMonth, setSelectedMonth] = useState("all")

  // Indicador de actualización en tiempo real
  const [realtimeIndicator, setRealtimeIndicator] = useState(false)

  // Efecto para cargar los años disponibles
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const { data: years, error } = await supabase
          .from("peticiones")
          .select("year")
          .order("year", { ascending: false })

        if (error) throw error

        // Ensure we have data before proceeding
        if (!years || years.length === 0) {
          console.log("No years data available")
          setAvailableYears([])
          return
        }

        // Safely get unique years, handling potential undefined values
        const uniqueYears = [...new Set(years.map((y) => y.year).filter(Boolean))]
        setAvailableYears(uniqueYears)

        // If no years selected, use the current year or most recent
        if (uniqueYears.length > 0 && selectedYear === "all") {
          const currentYear = new Date().getFullYear()
          // If the current year is available, select it
          if (uniqueYears.includes(currentYear)) {
            setSelectedYear(currentYear.toString())
          } else {
            // Otherwise, select the most recent year
            setSelectedYear(uniqueYears[0].toString())
          }
        }
      } catch (error) {
        console.error("Error loading available years:", error)
        setAvailableYears([])
      }
    }

    fetchAvailableYears()
  }, [supabase, selectedYear])

  // Función para cargar datos
  const fetchData = async () => {
    setLoading(true)
    try {
      // Build the base query for statistics
      let statsQuery = supabase.from("peticiones").select("id, archivado, year, mes")

      // Apply filters if selected
      if (selectedYear !== "all") {
        statsQuery = statsQuery.eq("year", Number.parseInt(selectedYear))
      }

      if (selectedMonth !== "all") {
        statsQuery = statsQuery.eq("mes", Number.parseInt(selectedMonth))
      }

      // Execute the query to get all filtered petitions
      const { data: filteredPetitions, error: statsError } = await statsQuery

      if (statsError) throw new Error("Error getting statistics")

      // Calculate statistics
      const totalCount = filteredPetitions?.length || 0
      const activeCount = filteredPetitions?.filter((pet) => !pet.archivado).length || 0
      const archivedCount = filteredPetitions?.filter((pet) => pet.archivado).length || 0

      console.log("Datos recuperados:", {
        total: totalCount,
        filteredPetitions: filteredPetitions?.length,
        query: selectedYear !== "all" ? `year=${selectedYear}` : "todos",
      })

      setStats({
        total: totalCount,
        active: activeCount,
        archived: archivedCount,
        files: stats.files, // Preserve existing files count
      })

      // Update the monthly query to use consistent table and column names
      let monthlyQuery = supabase.from("peticiones").select("id, mes, archivado, year")

      // Apply year filter if selected
      if (selectedYear !== "all") {
        monthlyQuery = monthlyQuery.eq("year", Number.parseInt(selectedYear))
      }

      // No aplicamos el filtro de mes aquí porque queremos ver todos los meses para la gráfica mensual

      const { data: monthlyPeticiones, error: monthlyError } = await monthlyQuery

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

      monthlyPeticiones?.forEach((pet) => {
        if (pet.mes >= 1 && pet.mes <= 12) {
          monthsData[pet.mes - 1].total += 1
          monthsData[pet.mes - 1].value += 1 // Actualizar también la propiedad value
          if (pet.archivado) {
            monthsData[pet.mes - 1].archivadas += 1
          } else {
            monthsData[pet.mes - 1].activas += 1
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

    // Subscribe to real-time changes on the peticiones table
    const channel = supabase
      .channel("dashboard-peticiones-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "peticiones",
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

  // Función para descargar datos mensuales como CSV
  const downloadMonthlyData = () => {
    try {
      // Crear contenido CSV con BOM para Excel
      let csvContent = "\uFEFF" // BOM para Excel
      csvContent += "Mes,Total Peticiones,Peticiones Activas,Peticiones Archivadas\r\n"

      monthlyData.forEach((item) => {
        csvContent += `"${item.name}",${item.total},${item.activas},${item.archivadas}\r\n`
      })

      // Crear blob y enlace de descarga
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")

      // Configurar y simular clic en el enlace
      link.setAttribute("href", url)
      link.setAttribute("download", `peticiones-mensuales-${selectedYear !== "all" ? selectedYear : "todos"}.csv`)
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
          src="https://static.wixstatic.com/media/5be21a_ab4772ff1a594b63a7881b69207e1052~mv2.jpg/v1/fill/w_1905,h_945,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/5be21a_ab4772ff1a594b63a7881b69207e1052~mv2.jpg"
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
            <CardTitle className="text-sm font-medium">Total Peticiones</CardTitle>
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
                  Peticiones filtradas
                  {selectedYear !== "all" ? ` (${selectedYear})` : ""}
                  {selectedMonth !== "all" ? ` (${MONTHS.find((m) => m.value === selectedMonth)?.label})` : ""}
                </>
              ) : (
                "Todas las peticiones registradas"
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
            <CardTitle className="text-sm font-medium">Peticiones Activas</CardTitle>
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
            <CardTitle className="text-sm font-medium">Peticiones Archivadas</CardTitle>
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

      {/* Gráfico de peticiones mensuales */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Peticiones por Mes</CardTitle>
            <Button variant="outline" size="sm" onClick={downloadMonthlyData} className="h-8">
              <DownloadIcon className="h-4 w-4 mr-1" />
              Exportar CSV
            </Button>
          </div>
          <CardDescription>
            Distribución mensual de peticiones ciudadanas
            {selectedYear !== "all" ? ` (${selectedYear})` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-1 sm:px-3 py-2 sm:py-3">
          {loading ? (
            <div className="flex h-[300px] sm:h-[400px] items-center justify-center">
              <p>Cargando datos...</p>
            </div>
          ) : monthlyData.length === 0 ? (
            <div className="flex h-[300px] sm:h-[400px] items-center justify-center">
              <p>No hay datos disponibles para mostrar</p>
            </div>
          ) : (
            <div className="w-full h-[300px] sm:h-[400px] border border-gray-200 rounded-lg p-2 sm:p-4">
              <SimpleBarChart data={monthlyData} height={350} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
