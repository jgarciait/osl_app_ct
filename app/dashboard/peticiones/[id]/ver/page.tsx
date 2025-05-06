"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Edit, Clock, FileText, Calendar, User, Tag, CheckCircle, XCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"

export default function VerPeticionPage({ params }) {
  const [peticion, setPeticion] = useState(null)
  const [clasificacion, setClasificacion] = useState(null)
  const [legislador, setLegislador] = useState(null)
  const [tema, setTema] = useState(null)
  const [asesor, setAsesor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [documentos, setDocumentos] = useState([])
  const { toast } = useToast()
  const router = useRouter()
  const { id } = params

  useEffect(() => {
    const fetchPeticion = async () => {
      const supabase = createClientClient()

      try {
        // Fetch petición data
        const { data, error } = await supabase.from("peticiones").select("*").eq("id", id).single()

        if (error) throw error

        setPeticion(data)

        // Fetch clasificación
        const { data: relClasificacion, error: relClasificacionError } = await supabase
          .from("peticiones_clasificacion")
          .select("clasificaciones_id")
          .eq("peticiones_id", id)
          .maybeSingle()

        if (relClasificacionError && relClasificacionError.code !== "PGRST116") {
          throw relClasificacionError
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
          throw relLegisladorError
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
          throw relTemaError
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
          throw relAsesorError
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

        // Fetch documentos (simulated for now)
        // In a real implementation, you would fetch actual documents from Supabase Storage
        setDocumentos([
          {
            id: "1",
            name: "Documento de solicitud.pdf",
            size: 1024 * 1024 * 2.5, // 2.5 MB
            type: "application/pdf",
            uploadedAt: new Date().toISOString(),
          },
          {
            id: "2",
            name: "Anexo informativo.docx",
            size: 1024 * 512, // 512 KB
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            uploadedAt: new Date().toISOString(),
          },
        ])
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
  }, [id, toast])

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
            Volver a Peticiones
          </Link>
        </Button>
      </div>
    )
  }

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

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " bytes"
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB"
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB"
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/peticiones">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Petición {peticion.num_peticion || `#${peticion.id.substring(0, 8)}`}</h1>
          <Badge variant={peticion.archivado ? "outline" : "default"}>
            {peticion.archivado ? "Archivado" : "Activo"}
          </Badge>
        </div>
        <Button asChild>
          <Link href={`/dashboard/peticiones/${id}/editar`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalles de la Petición
          </CardTitle>
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
                  {asesor?.name || "No asignado"}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Estatus</Label>
                <div className="p-2 bg-muted/30 rounded-md">{peticion.status || "No definido"}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Comentarios</Label>
                <div className="p-4 rounded-md bg-muted/30 min-h-[100px] whitespace-pre-wrap">
                  {peticion.comentarios || "No hay comentarios disponibles."}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
            </TabsContent>

            {/* Tab 3: Documentos */}
            <TabsContent value="documentos" className="space-y-6 pt-4">
              {documentos.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium mb-2">Documentos adjuntos</h3>
                  <ul className="space-y-2">
                    {documentos.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 mr-3 text-blue-500" />
                          <div>
                            <p className="font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(doc.size)} •{" "}
                              {format(new Date(doc.uploadedAt), "dd MMM yyyy, HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Descargar
                        </Button>
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
