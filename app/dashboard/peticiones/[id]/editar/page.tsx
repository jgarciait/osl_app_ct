"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Save, Trash, Upload, File } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { format } from "date-fns"

export default function EditarPeticionPage({ params }) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [asesores, setAsesores] = useState([])
  const [clasificaciones, setClasificaciones] = useState([])
  const [legisladores, setLegisladores] = useState([])
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [clasificacionActual, setClasificacionActual] = useState(null)
  const [legisladorActual, setLegisladorActual] = useState(null)

  const [formData, setFormData] = useState({
    // Tab 1: Información de Petición
    clasificacion_id: "",
    clasificacion: "",
    legislador_id: "",
    legislador: "",
    fecha_recibido: "",
    detalles: "",
    year: "",
    mes: "",

    // Tab 2: Trámites
    fecha_asignacion: "",
    asesor: "",
    status: "",
    comentarios: "",
    tramite_despachado: false,

    // Otros campos necesarios
    archivado: false,
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClientClient()

      try {
        // Obtener datos de la petición
        const { data: peticion, error: peticionError } = await supabase
          .from("peticiones")
          .select("*")
          .eq("id", id)
          .single()

        if (peticionError) throw peticionError

        // Obtener lista de asesores
        const { data: asesoresData, error: asesoresError } = await supabase
          .from("asesores")
          .select("id, name")
          .order("name")

        if (asesoresError) throw asesoresError

        // Obtener lista de clasificaciones
        const { data: clasificacionesData, error: clasificacionesError } = await supabase
          .from("clasificacionesPeticion")
          .select("id, nombre")
          .order("nombre")

        if (clasificacionesError) throw clasificacionesError

        // Obtener lista de legisladores
        const { data: legisladoresData, error: legisladoresError } = await supabase
          .from("legisladoresPeticion")
          .select("id, nombre")
          .order("nombre")

        if (legisladoresError) throw legisladoresError

        // Obtener la relación de clasificación actual
        const { data: relClasificacion, error: relClasificacionError } = await supabase
          .from("peticiones_clasificacion")
          .select("clasificaciones_id")
          .eq("peticiones_id", id)
          .maybeSingle()

        if (relClasificacionError && relClasificacionError.code !== "PGRST116") {
          // Ignorar error si no hay resultados
          throw relClasificacionError
        }

        // Obtener la relación de legislador actual
        const { data: relLegislador, error: relLegisladorError } = await supabase
          .from("peticiones_legisladores")
          .select("legisladoresPeticion_id")
          .eq("peticiones_id", id)
          .maybeSingle()

        if (relLegisladorError && relLegisladorError.code !== "PGRST116") {
          // Ignorar error si no hay resultados
          throw relLegisladorError
        }

        setAsesores(asesoresData || [])
        setClasificaciones(clasificacionesData || [])
        setLegisladores(legisladoresData || [])
        setClasificacionActual(relClasificacion?.clasificaciones_id || null)
        setLegisladorActual(relLegislador?.legisladoresPeticion_id || null)

        // Formatear fechas para los inputs de tipo date
        const formattedFechaRecibido = peticion.fecha_recibido
          ? format(new Date(peticion.fecha_recibido), "yyyy-MM-dd")
          : ""

        const formattedFechaAsignacion = peticion.fecha_asignacion
          ? format(new Date(peticion.fecha_asignacion), "yyyy-MM-dd")
          : ""

        setFormData({
          clasificacion: peticion.clasificacion || "",
          clasificacion_id: relClasificacion?.clasificaciones_id || "",
          legislador: peticion.legislador || "",
          legislador_id: relLegislador?.legisladoresPeticion_id || "",
          fecha_recibido: formattedFechaRecibido,
          detalles: peticion.detalles || "",
          year: peticion.year?.toString() || "",
          mes: peticion.mes?.toString() || "",
          fecha_asignacion: formattedFechaAsignacion,
          asesor: peticion.asesor || "",
          status: peticion.status || "Recibida",
          comentarios: peticion.comentarios || "",
          tramite_despachado: peticion.tramite_despachado || false,
          archivado: peticion.archivado || false,
        })
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los datos. Por favor, intente nuevamente.",
        })
        router.push("/dashboard/peticiones")
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
  }, [id, router, toast])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Si cambia la clasificación, actualizar también el nombre
    if (name === "clasificacion_id") {
      const clasificacionSeleccionada = clasificaciones.find((c) => c.id === value)
      if (clasificacionSeleccionada) {
        setFormData((prev) => ({
          ...prev,
          clasificacion: clasificacionSeleccionada.nombre,
        }))
      }
    }

    // Si cambia el legislador, actualizar también el nombre
    if (name === "legislador_id") {
      const legisladorSeleccionado = legisladores.find((l) => l.id === value)
      if (legisladorSeleccionado) {
        setFormData((prev) => ({
          ...prev,
          legislador: legisladorSeleccionado.nombre,
        }))
      }
    }
  }

  const handleSwitchChange = (name, checked) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  const handleFileUpload = async (e) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)

    try {
      // Simulación de carga de archivos
      // En una implementación real, aquí subirías los archivos a Supabase Storage

      const newFiles = Array.from(files).map((file) => ({
        id: Math.random().toString(36).substring(2),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      }))

      setUploadedFiles((prev) => [...prev, ...newFiles])

      toast({
        title: "Archivos subidos",
        description: `${files.length} archivo(s) subido(s) correctamente.`,
      })
    } catch (error) {
      console.error("Error uploading files:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron subir los archivos. Por favor, intente nuevamente.",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)

    const supabase = createClientClient()

    try {
      // Preparar datos para la actualización
      const updateData = {
        ...formData,
        year: formData.year ? Number.parseInt(formData.year) : null,
        mes: formData.mes ? Number.parseInt(formData.mes) : null,
        updated_at: new Date().toISOString(),
      }

      // Eliminar campos de ID que no son columnas en la tabla peticiones
      delete updateData.clasificacion_id
      delete updateData.legislador_id

      const { error } = await supabase.from("peticiones").update(updateData).eq("id", id)

      if (error) throw error

      // Actualizar la relación de clasificación si ha cambiado
      if (formData.clasificacion_id !== clasificacionActual) {
        if (clasificacionActual) {
          // Eliminar la relación anterior
          const { error: delError } = await supabase
            .from("peticiones_clasificacion")
            .delete()
            .eq("peticiones_id", id)
            .eq("clasificaciones_id", clasificacionActual)

          if (delError) {
            console.error("Error deleting classification relation:", delError)
          }
        }

        if (formData.clasificacion_id) {
          // Crear nueva relación
          const { error: insError } = await supabase.from("peticiones_clasificacion").insert({
            peticiones_id: id,
            clasificaciones_id: formData.clasificacion_id,
            created_at: new Date().toISOString(),
          })

          if (insError) {
            console.error("Error creating classification relation:", insError)
          }
        }
      }

      // Actualizar la relación de legislador si ha cambiado
      if (formData.legislador_id !== legisladorActual) {
        if (legisladorActual) {
          // Eliminar la relación anterior
          const { error: delError } = await supabase
            .from("peticiones_legisladores")
            .delete()
            .eq("peticiones_id", id)
            .eq("legisladoresPeticion_id", legisladorActual)

          if (delError) {
            console.error("Error deleting legislator relation:", delError)
          }
        }

        if (formData.legislador_id) {
          // Crear nueva relación
          const { error: insError } = await supabase.from("peticiones_legisladores").insert({
            peticiones_id: id,
            legisladoresPeticion_id: formData.legislador_id,
            created_at: new Date().toISOString(),
          })

          if (insError) {
            console.error("Error creating legislator relation:", insError)
          }
        }
      }

      toast({
        title: "Petición actualizada",
        description: "La petición ha sido actualizada correctamente.",
      })

      router.push(`/dashboard/peticiones/${id}/ver`)
    } catch (error) {
      console.error("Error updating peticion:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la petición. Por favor, intente nuevamente.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    const supabase = createClientClient()

    try {
      // Primero eliminar las relaciones en peticiones_clasificacion
      const { error: relClasificacionError } = await supabase
        .from("peticiones_clasificacion")
        .delete()
        .eq("peticiones_id", id)

      if (relClasificacionError) {
        console.error("Error deleting classification relations:", relClasificacionError)
        // Continuamos con la eliminación de la petición aunque falle la eliminación de relaciones
      }

      // Eliminar las relaciones en peticiones_legisladores
      const { error: relLegisladorError } = await supabase
        .from("peticiones_legisladores")
        .delete()
        .eq("peticiones_id", id)

      if (relLegisladorError) {
        console.error("Error deleting legislator relations:", relLegisladorError)
        // Continuamos con la eliminación de la petición aunque falle la eliminación de relaciones
      }

      // Luego eliminar la petición
      const { error } = await supabase.from("peticiones").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Petición eliminada",
        description: "La petición ha sido eliminada correctamente.",
      })

      router.push("/dashboard/peticiones")
    } catch (error) {
      console.error("Error deleting peticion:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la petición. Por favor, intente nuevamente.",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/peticiones/${id}/ver`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Editar Petición</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información de la petición</CardTitle>
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
                    <Label htmlFor="clasificacion">Clasificación</Label>
                    <Select
                      value={formData.clasificacion_id}
                      onValueChange={(value) => handleSelectChange("clasificacion_id", value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar clasificación" />
                      </SelectTrigger>
                      <SelectContent>
                        {clasificaciones.map((clasificacion) => (
                          <SelectItem key={clasificacion.id} value={clasificacion.id}>
                            {clasificacion.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="legislador">Legislador</Label>
                    <Select
                      value={formData.legislador_id}
                      onValueChange={(value) => handleSelectChange("legislador_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar legislador" />
                      </SelectTrigger>
                      <SelectContent>
                        {legisladores.map((legislador) => (
                          <SelectItem key={legislador.id} value={legislador.id}>
                            {legislador.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fecha_recibido">Fecha de recibido</Label>
                    <Input
                      id="fecha_recibido"
                      name="fecha_recibido"
                      type="date"
                      value={formData.fecha_recibido}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="detalles">Detalles de Petición</Label>
                  <Textarea
                    id="detalles"
                    name="detalles"
                    rows={6}
                    value={formData.detalles}
                    onChange={handleInputChange}
                    placeholder="Descripción detallada de la petición..."
                    required
                  />
                </div>
              </TabsContent>

              {/* Tab 2: Trámites */}
              <TabsContent value="tramites" className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_asignacion">Fecha de Asignación</Label>
                  <Input
                    id="fecha_asignacion"
                    name="fecha_asignacion"
                    type="date"
                    value={formData.fecha_asignacion}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asesor">Asesor</Label>
                  <Select value={formData.asesor} onValueChange={(value) => handleSelectChange("asesor", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar asesor" />
                    </SelectTrigger>
                    <SelectContent>
                      {asesores.map((asesor) => (
                        <SelectItem key={asesor.id} value={asesor.id}>
                          {asesor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Estatus</Label>
                  <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estatus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Recibida">Recibida</SelectItem>
                      <SelectItem value="Asignada">Asignada</SelectItem>
                      <SelectItem value="En revisión">En revisión</SelectItem>
                      <SelectItem value="Despachada">Despachada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comentarios">Comentarios</Label>
                  <Textarea
                    id="comentarios"
                    name="comentarios"
                    rows={4}
                    value={formData.comentarios}
                    onChange={handleInputChange}
                    placeholder="Comentarios adicionales sobre el trámite..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="tramite_despachado"
                    checked={formData.tramite_despachado}
                    onCheckedChange={(checked) => handleSwitchChange("tramite_despachado", checked)}
                  />
                  <Label htmlFor="tramite_despachado">Trámite despachado</Label>
                </div>
              </TabsContent>

              {/* Tab 3: Documentos */}
              <TabsContent value="documentos" className="space-y-6 pt-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    multiple
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer">
                    <Upload className="h-10 w-10 text-gray-400 mb-2" />
                    <p className="text-sm font-medium">
                      {isUploading ? "Subiendo archivos..." : "Haga clic para subir documentos"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Soporta PDF, Word, Excel, imágenes y otros formatos</p>
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Documentos subidos</h3>
                    <ul className="space-y-2">
                      {uploadedFiles.map((file) => (
                        <li key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                          <div className="flex items-center">
                            <File className="h-4 w-4 mr-2 text-blue-500" />
                            <span className="text-sm">{file.name}</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(file.id)}>
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button type="button" variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
            <Button type="submit" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Eliminar petición"
        description="¿Estás seguro de que deseas eliminar esta petición? Esta acción no se puede deshacer."
        onConfirm={handleDelete}
      />
    </div>
  )
}
