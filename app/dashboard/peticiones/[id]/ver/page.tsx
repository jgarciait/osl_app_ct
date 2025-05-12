"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { format, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Clock,
  FileText,
  Calendar,
  User,
  Tag,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { EstatusBadge } from "@/components/estatus-badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Función para formatear la diferencia de tiempo
function formatTimeDifference(date1: Date | null, date2: Date | null): string {
  if (!date1 || !date2) return ""

  try {
    const days = differenceInDays(date2, date1)
    if (days > 0) return `${days} día${days !== 1 ? "s" : ""}`

    const hours = differenceInHours(date2, date1)
    if (hours > 0) return `${hours} hora${hours !== 1 ? "s" : ""}`

    const minutes = differenceInMinutes(date2, date1)
    return `${minutes} minuto${minutes !== 1 ? "s" : ""}`
  } catch (error) {
    console.error("Error al calcular diferencia de tiempo:", error)
    return ""
  }
}

export default function VerPeticionPage({ params }) {
  const [peticion, setPeticion] = useState(null)
  const [clasificacion, setClasificacion] = useState(null)
  const [legislador, setLegislador] = useState(null)
  const [tema, setTema] = useState(null)
  const [asesor, setAsesor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [documentos, setDocumentos] = useState([])
  const [loadingDocumentos, setLoadingDocumentos] = useState(true)
  const [errorDocumentos, setErrorDocumentos] = useState("")
  const { toast } = useToast()
  const router = useRouter()
  const { id } = params
  const supabase = createClientClient()

  useEffect(() => {
    const fetchPeticion = async () => {
      try {
        setLoading(true)
        console.log("Cargando petición ID:", id)

        // Fetch petición data
        const { data, error } = await supabase.from("peticiones").select("*").eq("id", id).single()

        if (error) throw error

        console.log("Datos de petición cargados:", data)
        setPeticion(data)

        // Fetch clasificación
        const { data: relClasificacion, error: relClasificacionError } = await supabase
          .from("peticiones_clasificacion")
          .select("clasificaciones_id")
          .eq("peticiones_id", id)
          .maybeSingle()

        if (relClasificacionError && relClasificacionError.code !== "PGRST116") {
          console.warn("Error al cargar relación de clasificación:", relClasificacionError)
        }

        if (relClasificacion?.clasificaciones_id) {
          const { data: clasificacionData, error: clasificacionError } = await supabase
            .from("clasificacionesPeticion")
            .select("*")
            .eq("id", relClasificacion.clasificaciones_id)
            .single()

          if (clasificacionError) {
            console.error("Error fetching clasificacion:", clasificacionError)
          } else {
            setClasificacion(clasificacionData)
          }
        }

        // Fetch legislador
        const { data: relLegislador, error: relLegisladorError } = await supabase
          .from("peticiones_legisladores")
          .select("legisladoresPeticion_id")
          .eq("peticiones_id", id)
          .maybeSingle()

        if (relLegisladorError && relLegisladorError.code !== "PGRST116") {
          console.warn("Error al cargar relación de legislador:", relLegisladorError)
        }

        if (relLegislador?.legisladoresPeticion_id) {
          const { data: legisladorData, error: legisladorError } = await supabase
            .from("legisladoresPeticion")
            .select("*")
            .eq("id", relLegislador.legisladoresPeticion_id)
            .single()

          if (legisladorError) {
            console.error("Error fetching legislador:", legisladorError)
          } else {
            setLegislador(legisladorData)
          }
        }

        // Fetch tema
        const { data: relTema, error: relTemaError } = await supabase
          .from("peticiones_temas")
          .select("temasPeticiones_id")
          .eq("peticiones_id", id)
          .maybeSingle()

        if (relTemaError && relTemaError.code !== "PGRST116") {
          console.warn("Error al cargar relación de tema:", relTemaError)
        }

        if (relTema?.temasPeticiones_id) {
          const { data: temaData, error: temaError } = await supabase
            .from("temasPeticiones")
            .select("*")
            .eq("id", relTema.temasPeticiones_id)
            .single()

          if (temaError) {
            console.error("Error fetching tema:", temaError)
          } else {
            setTema(temaData)
          }
        }

        // Fetch asesor
        const { data: relAsesor, error: relAsesorError } = await supabase
          .from("peticiones_asesores")
          .select("asesores_id")
          .eq("peticiones_id", id)
          .maybeSingle()

        if (relAsesorError && relAsesorError.code !== "PGRST116") {
          console.warn("Error al cargar relación de asesor:", relAsesorError)
        }

        if (relAsesor?.asesores_id) {
          const { data: asesorData, error: asesorError } = await supabase
            .from("asesores")
            .select("*")
            .eq("id", relAsesor.asesores_id)
            .single()

          if (asesorError) {
            console.error("Error fetching asesor:", asesorError)
          } else {
            setAsesor(asesorData)
          }
        }

        // Cargar documentos
        fetchDocumentos(id)
      } catch (error) {
        console.error("Error fetching peticion:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar la petición solicitada.",
        })
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchPeticion()
    }
  }, [id, toast, supabase])

  const fetchDocumentos = async (peticionId) => {
    try {
      setLoadingDocumentos(true)
      setErrorDocumentos("")
      console.log("Cargando documentos para petición ID:", peticionId)

      const { data, error } = await supabase.from("documentos_peticiones").select("*").eq("peticion_id", peticionId)

      if (error) throw error

      console.log(`Documentos encontrados: ${data?.length || 0}`)

      if (data && data.length > 0) {
        // Para cada documento, obtener la URL firmada
        const filesPromises = data.map(async (doc) => {
          try {
            const { data: urlData, error: urlError } = await supabase.storage
              .from("documentos")
              .createSignedUrl(`peticiones/${doc.ruta}`, 60 * 60) // URL válida por 1 hora

            if (urlError) {
              console.warn(`Error al obtener URL para documento ${doc.id}:`, urlError)
              return {
                id: doc.id,
                name: doc.ruta,
                originalName: doc.nombre,
                size: doc.tamano,
                type: doc.tipo,
                url: "", // URL vacía si hay error
                uploadedAt: doc.created_at,
              }
            }

            return {
              id: doc.id,
              name: doc.ruta,
              originalName: doc.nombre,
              size: doc.tamano,
              type: doc.tipo,
              url: urlData?.signedUrl || "",
              uploadedAt: doc.created_at,
            }
          } catch (err) {
            console.error(`Error procesando documento ${doc.id}:`, err)
            return null
          }
        })

        // Usar Promise.allSettled para manejar errores individuales
        const results = await Promise.allSettled(filesPromises)

        const filesWithUrls = results
          .filter(
            (result): result is PromiseFulfilledResult<any> => result.status === "fulfilled" && result.value !== null,
          )
          .map((result) => result.value)

        setDocumentos(filesWithUrls)
      } else {
        setDocumentos([])
      }
    } catch (error) {
      console.error("Error loading documents:", error)
      setErrorDocumentos(`No se pudieron cargar los documentos: ${error.message || "Error desconocido"}`)
    } finally {
      setLoadingDocumentos(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  if (!peticion) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <h2 className="text-2xl font-bold mb-2">Petición no encontrada</h2>
        <p className="text-muted-foreground mb-4">La petición solicitada no existe o no tienes permisos para verla.</p>
        <Button asChild>
          <Link href="/dashboard/peticiones">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Ver Peticiones
          </Link>
        </Button>
      </div>
    )
  }

  // Calcular diferencias de tiempo
  const fechaRecibido = peticion.fecha_recibido ? new Date(peticion.fecha_recibido) : null
  const fechaAsignacion = peticion.fecha_asignacion ? new Date(peticion.fecha_asignacion) : null
  const fechaDespacho = peticion.fecha_despacho ? new Date(peticion.fecha_despacho) : null

  const tiempoRecepcionAsignacion =
    fechaRecibido && fechaAsignacion ? formatTimeDifference(fechaRecibido, fechaAsignacion) : ""

  const tiempoAsignacionDespacho =
    fechaAsignacion && fechaDespacho ? formatTimeDifference(fechaAsignacion, fechaDespacho) : ""

  const createdAt = new Date(peticion.created_at)
  const updatedAt = peticion.updated_at ? new Date(peticion.updated_at) : null

  // Format dates for display
  const formattedFechaRecibido = peticion.fecha_recibido
    ? format(new Date(peticion.fecha_recibido), "dd MMMM yyyy", { locale: es })
    : "No registrada"

  const formattedFechaAsignacion = peticion.fecha_asignacion
    ? format(new Date(peticion.fecha_asignacion), "dd MMMM yyyy", { locale: es })
    : "No asignada"

  const formattedFechaLimite = peticion.fecha_limite
    ? format(new Date(peticion.fecha_limite), "dd MMMM yyyy", { locale: es })
    : "No establecida"

  const formattedFechaDespacho = peticion.fecha_despacho
    ? format(new Date(peticion.fecha_despacho), "dd MMMM yyyy", { locale: es })
    : "No despachada"

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " bytes"
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB"
  }

  // Función para obtener el icono del tipo de archivo
  const getFileIcon = (fileType) => {
    if (fileType.includes("pdf")) {
      return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-red-500" />
    } else if (fileType.includes("image")) {
      return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-green-500" />
    } else if (fileType.includes("word") || fileType.includes("document")) {
      return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-blue-500" />
    } else if (fileType.includes("excel") || fileType.includes("sheet")) {
      return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-green-600" />
    } else {
      return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            {(tiempoRecepcionAsignacion || tiempoAsignacionDespacho) && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2 sm:mt-0 text-sm text-muted-foreground">
                {tiempoRecepcionAsignacion && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Recepción a asignación: {tiempoRecepcionAsignacion}</span>
                  </div>
                )}
                {tiempoAsignacionDespacho && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-green-500" />
                    <span>Asignación a despacho: {tiempoAsignacionDespacho}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="informacion" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="informacion">Información de Petición</TabsTrigger>
              <TabsTrigger value="tramites">Trámites</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
            </TabsList>

            {/* Tab 1: Información de Petición */}
            <TabsContent value="informacion" className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Clasificación</Label>
                  <div className="p-2 bg-muted/30 rounded-md">
                    {clasificacion?.nombre || peticion.clasificacion || "No especificada"}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Legislador</Label>
                  <div className="p-2 bg-muted/30 rounded-md">{legislador?.nombre || "No especificado"}</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Fecha de recibido</Label>
                  <div className="p-2 bg-muted/30 rounded-md flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {formattedFechaRecibido}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Tema</Label>
                <div className="p-2 bg-muted/30 rounded-md flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  {tema?.nombre || "No especificado"}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Detalles de Petición</Label>
                <div className="p-4 rounded-md bg-muted/30 min-h-[150px] whitespace-pre-wrap">
                  {peticion.detalles || "No hay detalles disponibles para esta petición."}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Año</Label>
                  <div className="p-2 bg-muted/30 rounded-md">{peticion.year || "No especificado"}</div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Mes</Label>
                  <div className="p-2 bg-muted/30 rounded-md">{peticion.mes || "No especificado"}</div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Trámites */}
            <TabsContent value="tramites" className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Fecha de Asignación</Label>
                <div className="p-2 bg-muted/30 rounded-md flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formattedFechaAsignacion}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Asesor</Label>
                <div className="p-2 bg-muted/30 rounded-md flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {asesor?.name || peticion.asesor || "No asignado"}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Estatus</Label>
                <div className="p-2 bg-muted/30 rounded-md">
                  {peticion.peticionEstatus_id ? (
                    <EstatusBadge estatusId={peticion.peticionEstatus_id} />
                  ) : (
                    <span className="text-muted-foreground">No definido</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Comentarios</Label>
                <div className="p-4 rounded-md bg-muted/30 min-h-[100px] whitespace-pre-wrap">
                  {peticion.comentarios || "No hay comentarios disponibles."}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Trámite despachado</Label>
                  <div className="p-2 bg-muted/30 rounded-md flex items-center gap-2">
                    {peticion.tramite_despachado ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Sí</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span>No</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Fecha Límite</Label>
                  <div className="p-2 bg-muted/30 rounded-md flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {formattedFechaLimite}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Fecha de Despacho</Label>
                  <div className="p-2 bg-muted/30 rounded-md flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {formattedFechaDespacho}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: Documentos */}
            <TabsContent value="documentos" className="space-y-6 pt-4">
              {errorDocumentos && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>{errorDocumentos}</span>
                    <Button variant="outline" size="sm" onClick={() => fetchDocumentos(id)} className="ml-2">
                      Reintentar
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {loadingDocumentos ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Cargando documentos...</p>
                </div>
              ) : documentos.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium mb-2">Documentos adjuntos ({documentos.length})</h3>
                  <ul className="space-y-2">
                    {documentos.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                        <div className="flex items-center">
                          {getFileIcon(doc.type)}
                          <div>
                            <p className="font-medium">{doc.originalName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(doc.size)} •{" "}
                              {format(new Date(doc.uploadedAt), "dd MMM yyyy, HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>
                        {doc.url ? (
                          <Button variant="outline" size="sm" asChild>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              Ver documento
                            </a>
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            URL no disponible
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center p-8 bg-muted/30 rounded-md">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <h3 className="text-lg font-medium">No hay documentos</h3>
                  <p className="text-sm text-muted-foreground">Esta petición no tiene documentos adjuntos.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-8 pt-4 border-t">
            <div className="flex flex-col sm:flex-row justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-1 mb-2 sm:mb-0">
                <Clock className="h-4 w-4" />
                <span>Creada: {format(createdAt, "dd MMMM yyyy, HH:mm", { locale: es })}</span>
              </div>
              {updatedAt && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Última actualización: {format(updatedAt, "dd MMMM yyyy, HH:mm", { locale: es })}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
