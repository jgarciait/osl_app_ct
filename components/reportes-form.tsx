"use client"

import { useState } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import * as XLSX from "xlsx"
import dynamic from "next/dynamic"
import { useGroupPermissions } from "@/hooks/use-group-permissions"

// Importar react-select de forma dinámica para evitar problemas de carga
const ReactSelect = dynamic(() => import("react-select"), { ssr: false })

const MONTHS = [
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

export function ReportesForm({ years = [], comites = [] }) {
  const { toast } = useToast()
  const supabase = createClientClient()

  const [downloadState, setDownloadState] = useState({
    isLoading: false,
    progress: 0,
    format: "excel", // Formato predeterminado
    showModal: false,
  })
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    year: "",
    month: "",
    status: "all",
    selectedComisiones: [],
  })

  const { hasPermission } = useGroupPermissions()

  const handleDateChange = (field, date) => {
    setFilters((prev) => ({ ...prev, [field]: date }))
  }

  const handleComisionesChange = (selected) => {
    setFilters((prev) => ({
      ...prev,
      selectedComisiones: selected ? selected.map((option) => option.value) : [],
    }))
  }

  const formatDateForQuery = (date) => {
    if (!date) return null
    // Ensure we're working with a Date object
    const dateObj = new Date(date)
    // Format as YYYY-MM-DD for Supabase
    return dateObj.toISOString().split("T")[0]
  }

  const generateReport = async (allData = false) => {
    try {
      let query = supabase
        .from("expresiones")
        .select(`
          *,
          expresion_comites(
            comite_id,
            comites(id, nombre, tipo)
          )
        `)
        .order("created_at", { ascending: false })

      // Si no es copia de seguridad, aplicar filtros
      if (!allData) {
        // Filtro por estado
        if (filters.status === "active") {
          query = query.eq("archivado", false)
        } else if (filters.status === "archived") {
          query = query.eq("archivado", true)
        }

        // Filtro por año
        if (filters.year) {
          query = query.eq("ano", Number.parseInt(filters.year))
        }

        // Filtro por mes
        if (filters.month) {
          query = query.eq("mes", Number.parseInt(filters.month))
        }

        // Filtro por rango de fechas
        if (filters.startDate) {
          const formattedStartDate = formatDateForQuery(filters.startDate)
          if (formattedStartDate) {
            query = query.gte("fecha_recibido", formattedStartDate)
          }
        }
        if (filters.endDate) {
          // Add one day to include the end date fully
          const endDate = new Date(filters.endDate)
          endDate.setDate(endDate.getDate() + 1)
          const formattedEndDate = formatDateForQuery(endDate)
          if (formattedEndDate) {
            query = query.lt("fecha_recibido", formattedEndDate)
          }
        }
      }

      const { data: expresiones, error } = await query

      if (error) throw error

      // Filtrar por comisiones seleccionadas (esto se hace en el cliente porque es más complejo en la consulta SQL)
      let filteredExpresiones = expresiones
      if (!allData && filters.selectedComisiones.length > 0) {
        filteredExpresiones = expresiones.filter((exp) =>
          exp.expresion_comites.some((ec) => filters.selectedComisiones.includes(ec.comite_id)),
        )
      }

      // Preparar datos para el reporte
      const reportData = filteredExpresiones.map((exp) => {
        // Obtener nombres de comités
        const comitesNames = exp.expresion_comites
          .map((ec) => ec.comites?.nombre || "")
          .filter(Boolean)
          .join(", ")

        // Safely format dates
        let fechaRecibido = ""
        let fechaRespuesta = ""

        try {
          if (exp.fecha_recibido) {
            fechaRecibido = format(new Date(exp.fecha_recibido), "dd/MM/yyyy")
          }
        } catch (error) {
          console.warn("Error formatting fecha_recibido:", error)
        }

        try {
          if (exp.respuesta) {
            fechaRespuesta = format(new Date(exp.respuesta), "dd/MM/yyyy")
          }
        } catch (error) {
          console.warn("Error formatting respuesta:", error)
        }

        return {
          Número: exp.numero,
          Año: exp.ano,
          Mes: MONTHS.find((m) => m.value === exp.mes.toString())?.label || exp.mes,
          "Fecha Recibido": fechaRecibido,
          Nombre: exp.nombre,
          Email: exp.email,
          Propuesta: exp.propuesta,
          Comités: comitesNames,
          Trámite: exp.tramite || "",
          "Fecha Respuesta": fechaRespuesta,
          Notas: exp.notas || "",
          Estado: exp.archivado ? "Archivada" : "Activa",
        }
      })

      return reportData
    } catch (error) {
      console.error("Error generando reporte:", error)
      toast({
        variant: "destructive",
        title: "Error al generar reporte",
        description: error.message || "Ocurrió un error al generar el reporte",
      })
      return null
    }
  }

  const downloadCSV = async (allData = false) => {
    setDownloadState((prev) => ({
      ...prev,
      isLoading: true,
      progress: 0,
      showModal: true,
    }))

    try {
      // Simular progreso de carga de datos
      setDownloadState((prev) => ({ ...prev, progress: 10 }))

      const reportData = await generateReport(allData)
      if (!reportData) {
        setDownloadState((prev) => ({ ...prev, isLoading: false, showModal: false }))
        return
      }

      setDownloadState((prev) => ({ ...prev, progress: 50 }))

      // Convertir a CSV
      const headers = Object.keys(reportData[0]).join(",")
      const rows = reportData.map((row) =>
        Object.values(row)
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      )
      const csv = [headers, ...rows].join("\n")

      setDownloadState((prev) => ({ ...prev, progress: 80 }))

      // Crear blob y descargar
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", allData ? "expresiones_backup.csv" : "reporte_expresiones.csv")
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setDownloadState((prev) => ({ ...prev, progress: 100 }))

      toast({
        title: "Reporte generado",
        description: `Se ha descargado el archivo CSV ${allData ? "de copia de seguridad" : "del reporte"}`,
      })
    } catch (error) {
      console.error("Error descargando CSV:", error)
      toast({
        variant: "destructive",
        title: "Error al descargar",
        description: error.message || "Ocurrió un error al descargar el archivo",
      })
      setDownloadState((prev) => ({ ...prev, isLoading: false, showModal: false }))
    }
    setTimeout(() => {
      setDownloadState((prev) => ({ ...prev, isLoading: false }))
    }, 1000)
  }

  const downloadExcel = async (allData = false) => {
    setDownloadState((prev) => ({
      ...prev,
      isLoading: true,
      progress: 0,
      showModal: true,
    }))

    try {
      // Simular progreso de carga de datos
      setDownloadState((prev) => ({ ...prev, progress: 10 }))

      const reportData = await generateReport(allData)
      if (!reportData) {
        setDownloadState((prev) => ({ ...prev, isLoading: false, showModal: false }))
        return
      }

      setDownloadState((prev) => ({ ...prev, progress: 50 }))

      // Crear libro de Excel
      const worksheet = XLSX.utils.json_to_sheet(reportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Expresiones")

      // Ajustar ancho de columnas
      const columnsWidth = [
        { wch: 15 }, // Número
        { wch: 6 }, // Año
        { wch: 12 }, // Mes
        { wch: 15 }, // Fecha Recibido
        { wch: 25 }, // Nombre
        { wch: 25 }, // Email
        { wch: 40 }, // Propuesta
        { wch: 30 }, // Comisiones
        { wch: 30 }, // Trámite
        { wch: 15 }, // Fecha Respuesta
        { wch: 30 }, // Notas
        { wch: 10 }, // Estado
      ]
      worksheet["!cols"] = columnsWidth

      setDownloadState((prev) => ({ ...prev, progress: 80 }))

      // Convertir a blob y descargar (método compatible con navegadores)
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = allData ? "expresiones_backup.xlsx" : "reporte_expresiones.xlsx"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setDownloadState((prev) => ({ ...prev, progress: 100 }))

      toast({
        title: "Reporte generado",
        description: `Se ha descargado el archivo Excel ${allData ? "de copia de seguridad" : "del reporte"}`,
      })
    } catch (error) {
      console.error("Error descargando Excel:", error)
      toast({
        variant: "destructive",
        title: "Error al descargar",
        description: error.message || "Ocurrió un error al descargar el archivo",
      })
      setDownloadState((prev) => ({ ...prev, isLoading: false, showModal: false }))
    }
    setTimeout(() => {
      setDownloadState((prev) => ({ ...prev, isLoading: false }))
    }, 1000)
  }

  return (
    <Tabs defaultValue="filtros" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="filtros">Reportes Personalizados</TabsTrigger>
        <TabsTrigger value="backup">Copia de Seguridad</TabsTrigger>
      </TabsList>

      <TabsContent value="filtros">
        <Card>
          <CardHeader>
            <CardDescription>
              Configure los filtros para generar un reporte personalizado de expresiones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label>Rango de Fechas</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label htmlFor="startDate" className="text-xs text-muted-foreground">
                        Desde
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.startDate ? (
                              format(new Date(filters.startDate), "PPP", { locale: es })
                            ) : (
                              <span>Seleccione fecha inicial</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filters.startDate}
                            onSelect={(date) => handleDateChange("startDate", date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="endDate" className="text-xs text-muted-foreground">
                        Hasta
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {filters.endDate ? (
                              format(new Date(filters.endDate), "PPP", { locale: es })
                            ) : (
                              <span>Seleccione fecha final</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={filters.endDate}
                            onSelect={(date) => handleDateChange("endDate", date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="year">Año</Label>
                    <Select
                      value={filters.year}
                      onValueChange={(value) => setFilters((prev) => ({ ...prev, year: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los años" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los años</SelectItem>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="month">Mes</Label>
                    <Select
                      value={filters.month}
                      onValueChange={(value) => setFilters((prev) => ({ ...prev, month: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los meses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los meses</SelectItem>
                        {MONTHS.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="active">Activas</SelectItem>
                      <SelectItem value="archived">Archivadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Comisiones</Label>
                  <div className="relative">
                    {typeof window !== "undefined" && (
                      <ReactSelect
                        isMulti
                        name="comisiones"
                        placeholder="Seleccionar comisiones..."
                        className="w-full"
                        classNamePrefix="select"
                        options={comites.map((comite) => ({
                          value: comite.id,
                          label: `${comite.nombre} (${comite.tipo === "senado" ? "Senado" : "Cámara"})`,
                        }))}
                        value={filters.selectedComisiones.map((id) => {
                          const comite = comites.find((c) => c.id === id)
                          return {
                            value: id,
                            label: comite ? `${comite.nombre} (${comite.tipo === "senado" ? "Senado" : "Cámara"})` : id,
                          }
                        })}
                        onChange={(selected) => handleComisionesChange(selected)}
                        isSearchable={true}
                        closeMenuOnSelect={false}
                        styles={{
                          control: (base) => ({
                            ...base,
                            backgroundColor: "white",
                            borderColor: "hsl(var(--input))",
                            "&:hover": {
                              borderColor: "hsl(var(--input))",
                            },
                            padding: "2px",
                          }),
                          menu: (base) => ({
                            ...base,
                            backgroundColor: "white",
                            zIndex: 50,
                          }),
                          option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isSelected
                              ? "hsl(var(--primary))"
                              : state.isFocused
                                ? "hsl(var(--accent))"
                                : "white",
                            color: state.isSelected ? "white" : "black",
                            "&:hover": {
                              backgroundColor: state.isSelected ? "hsl(var(--primary))" : "hsl(var(--accent))",
                            },
                          }),
                        }}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2 mt-8">
                  <Label>Formato de Descarga</Label>
                  <div className="flex flex-col space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="csv"
                        checked={downloadState.format === "csv"}
                        onCheckedChange={(checked) => {
                          if (checked) setDownloadState((prev) => ({ ...prev, format: "csv" }))
                        }}
                      />
                      <Label htmlFor="csv" className="text-sm">
                        CSV (valores separados por comas)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="excel"
                        checked={downloadState.format === "excel"}
                        onCheckedChange={(checked) => {
                          if (checked) setDownloadState((prev) => ({ ...prev, format: "excel" }))
                        }}
                      />
                      <Label htmlFor="excel" className="text-sm">
                        Excel (hoja de cálculo)
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-4">
            {hasPermission("reports", "manage") && (
              <Button
                onClick={() => (downloadState.format === "csv" ? downloadCSV(false) : downloadExcel(false))}
                disabled={downloadState.isLoading}
                className="flex items-center bg-[#1a365d] hover:bg-[#15294d]"
              >
                {downloadState.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : downloadState.format === "csv" ? (
                  <FileText className="mr-2 h-4 w-4" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                Descargar {downloadState.format === "csv" ? "CSV" : "Excel"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </TabsContent>

      <TabsContent value="backup">
        <Card>
          <CardHeader>
            <CardTitle>Copia de Seguridad</CardTitle>
            <CardDescription>
              Descargue una copia completa de todas las expresiones registradas en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Esta opción le permite descargar un archivo con todas las expresiones registradas en el sistema, sin
                aplicar ningún filtro. Es útil para realizar copias de seguridad periódicas de la información.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-amber-800 mb-2">Importante</h4>
                <p className="text-sm text-amber-700">
                  La generación de la copia de seguridad puede tardar varios minutos dependiendo de la cantidad de
                  expresiones registradas en el sistema. Por favor, sea paciente durante el proceso.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end space-x-4">
            {hasPermission("reports", "manage") && (
              <Button
                onClick={() => (downloadState.format === "csv" ? downloadCSV(true) : downloadExcel(true))}
                disabled={downloadState.isLoading}
                className="flex items-center bg-[#1a365d] hover:bg-[#15294d]"
              >
                {downloadState.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Backup en {downloadState.format === "csv" ? "CSV" : "Excel"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  )
  downloadState.showModal && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-full">
        <h3 className="text-lg font-medium mb-4">Generando reporte</h3>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${downloadState.progress}%` }}></div>
        </div>
        <p className="text-sm text-gray-500 mb-2">
          {downloadState.progress < 100 ? `Procesando datos (${downloadState.progress}%)...` : "¡Descarga completada!"}
        </p>
        {downloadState.progress === 100 && (
          <Button onClick={() => setDownloadState((prev) => ({ ...prev, showModal: false }))} className="w-full mt-4">
            Cerrar
          </Button>
        )}
      </div>
    </div>
  )
}
