"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { DocumentosTable } from "@/components/documentos-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, FileText, BarChart2, Table } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { SimpleBarChart } from "@/components/simple-bar-chart"

export function DocumentosPageClient() {
  const [documentos, setDocumentos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalDocumentos, setTotalDocumentos] = useState(0)
  const [totalSize, setTotalSize] = useState(0)
  const [tagMap, setTagMap] = useState({})
  const [monthlyDocuments, setMonthlyDocuments] = useState([])
  const [currentMonthCount, setCurrentMonthCount] = useState(0)
  const supabase = createClientClient()
  const { toast } = useToast()

  useEffect(() => {
    const fetchDocumentos = async () => {
      try {
        setIsLoading(true)

        // Obtener todos los documentos con información de expresiones
        const { data, error } = await supabase
          .from("documentos")
          .select(`
          id, 
          nombre, 
          ruta, 
          tipo, 
          tamano, 
          created_at,
          expresion_id,
          expresiones (
            id,
            numero,
            nombre,
            email
          )
        `)
          .order("created_at", { ascending: false })

        if (error) throw error

        // Obtener el conteo directo del bucket de almacenamiento
        const { data: storageCountData, error: storageCountError } = await supabase.rpc("get_storage_object_count", {
          bucket_name: "documentos",
        })

        if (storageCountError) {
          console.error("Error al obtener conteo del bucket:", storageCountError)
        }

        const storageCount = storageCountData?.[0]?.total_archivos || 0

        // Obtener etiquetas para cada documento
        const documentosConEtiquetas = await Promise.all(
          data.map(async (documento) => {
            const { data: etiquetasData, error: etiquetasError } = await supabase
              .from("documento_etiquetas")
              .select(`
              etiqueta_id,
              etiquetas (
                id, nombre, color
              )
            `)
              .eq("documento_id", documento.id)

            if (etiquetasError) {
              console.error("Error al obtener etiquetas:", etiquetasError)
              return {
                ...documento,
                etiquetas: [],
              }
            }

            const etiquetas = etiquetasData.map((item) => ({
              id: item.etiquetas.id,
              nombre: item.etiquetas.nombre,
              color: item.etiquetas.color,
            }))

            return {
              ...documento,
              etiquetas,
            }
          }),
        )

        // Calcular estadísticas
        const total = documentosConEtiquetas.length
        const size = documentosConEtiquetas.reduce((acc, doc) => acc + (doc.tamano || 0), 0)

        // Crear mapa de etiquetas para filtrado
        const etiquetasMap = {}
        documentosConEtiquetas.forEach((doc) => {
          if (doc.etiquetas) {
            doc.etiquetas.forEach((etiqueta) => {
              etiquetasMap[etiqueta.id] = etiqueta.nombre
            })
          }
        })

        // Calcular documentos por mes
        const monthlyData = calculateMonthlyDocuments(documentosConEtiquetas)

        // Obtener el conteo del mes actual
        const currentDate = new Date()
        const currentMonth = currentDate.getMonth()
        const currentYear = currentDate.getFullYear()
        const currentMonthDocs = documentosConEtiquetas.filter((doc) => {
          const docDate = new Date(doc.created_at)
          return docDate.getMonth() === currentMonth && docDate.getFullYear() === currentYear
        })

        setDocumentos(documentosConEtiquetas)
        setTotalDocumentos(total)
        setTotalSize(size)
        setTagMap(etiquetasMap)
        setMonthlyDocuments(monthlyData)
        setCurrentMonthCount(currentMonthDocs.length)

        // Log para depuración
        console.log(`Documentos en la base de datos: ${total}`)
        console.log(`Documentos en el bucket de almacenamiento: ${storageCount}`)

        // Si hay discrepancia, mostrar una alerta
        if (total !== storageCount) {
          console.warn(
            `Discrepancia detectada: ${storageCount} archivos en el bucket vs ${total} registros en la base de datos`,
          )
          toast({
            title: "Información",
            description: `Hay una discrepancia entre los archivos almacenados (${storageCount}) y los registros en la base de datos (${total})`,
            duration: 5000,
          })
        }
      } catch (error) {
        console.error("Error al cargar documentos:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los documentos. Por favor, intente nuevamente.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDocumentos()
  }, [supabase, toast])

  // Función para calcular documentos por mes
  const calculateMonthlyDocuments = (docs) => {
    const monthlyData = Array(12)
      .fill(0)
      .map((_, index) => ({
        name: new Date(2023, index, 1).toLocaleString("es-ES", { month: "short" }),
        value: 0,
      }))

    docs.forEach((doc) => {
      const date = new Date(doc.created_at)
      const month = date.getMonth()
      monthlyData[month].value += 1
    })

    return monthlyData
  }

  // Función para formatear el tamaño en bytes a una unidad legible
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            Tabla de Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="space-y-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? <Loader2 className="animate-spin" /> : totalDocumentos}
                  </div>
                  <p className="text-xs text-muted-foreground">Documentos registrados en la base de datos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Documentos este mes</CardTitle>
                  <FileText className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? <Loader2 className="animate-spin" /> : currentMonthCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Documentos añadidos en el mes actual</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Espacio Utilizado</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? <Loader2 className="animate-spin" /> : formatFileSize(totalSize)}
                  </div>
                  <p className="text-xs text-muted-foreground">Espacio total utilizado por los documentos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Tamaño Promedio</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      formatFileSize(totalDocumentos > 0 ? totalSize / totalDocumentos : 0)
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Tamaño promedio por documento</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Documentos por Mes</CardTitle>
                <CardDescription>Distribución mensual de documentos añadidos al sistema</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="h-[350px]">
                    <SimpleBarChart data={monthlyDocuments} height={350} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Todos los Documentos</CardTitle>
              <CardDescription>Lista completa de documentos almacenados en el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <DocumentosTable documentos={documentos} tagMap={tagMap} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
