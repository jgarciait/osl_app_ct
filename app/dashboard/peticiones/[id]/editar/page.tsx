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
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { PeticionDocumentUploader } from "@/components/peticion-document-uploader"

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
  const [temas, setTemas] = useState([])
  const [temaActual, setTemaActual] = useState(null)
  const [openTemaPopover, setOpenTemaPopover] = useState(false)
  const [temaSearch, setTemaSearch] = useState("")
  const [openNuevoTemaDialog, setOpenNuevoTemaDialog] = useState(false)
  const [nuevoTema, setNuevoTema] = useState("")
  const [isCreatingTema, setIsCreatingTema] = useState(false)
  const [asesorActual, setAsesorActual] = useState(null)
  const [asesorSearch, setAsesorSearch] = useState("")

  const [openAsesorPopover, setOpenAsesorPopover] = useState(false)
  const [openNuevoAsesorDialog, setOpenNuevoAsesorDialog] = useState(false)
  const [nuevoAsesor, setNuevoAsesor] = useState({ name: "", email: "", tel: "" })
  const [isCreatingAsesor, setIsCreatingAsesor] = useState(false)

  const [formData, setFormData] = useState({
    // Tab 1: Información de Petición
    clasificacion_id: "",
    clasificacion: "",
    legislador_id: "",
    legislador: "",
    tema_id: "",
    fecha_recibido: "",
    detalles: "",
    year: "",
    mes: "",

    // Tab 2: Trámites
    fecha_asignacion: "",
    asesor_id: "", // Cambiado de asesor a asesor_id
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

        // Obtener lista de temas
        const { data: temasData, error: temasError } = await supabase
          .from("temasPeticiones")
          .select("id, nombre")
          .order("nombre")

        if (temasError) throw temasError

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

        // Obtener la relación de tema actual
        const { data: relTema, error: relTemaError } = await supabase
          .from("peticiones_temas")
          .select("temasPeticiones_id")
          .eq("peticiones_id", id)
          .maybeSingle()

        if (relTemaError && relTemaError.code !== "PGRST116") {
          // Ignorar error si no hay resultados
          throw relTemaError
        }

        // Obtener la relación de asesor actual
        const { data: relAsesor, error: relAsesorError } = await supabase
          .from("peticiones_asesores")
          .select("asesores_id")
          .eq("peticiones_id", id)
          .maybeSingle()

        if (relAsesorError && relAsesorError.code !== "PGRST116") {
          // Ignorar error si no hay resultados
          throw relAsesorError
        }

        setAsesorActual(relAsesor?.asesores_id || null)

        setAsesores(asesoresData || [])
        setClasificaciones(clasificacionesData || [])
        setLegisladores(legisladoresData || [])
        setTemas(temasData || [])
        setClasificacionActual(relClasificacion?.clasificaciones_id || null)
        setLegisladorActual(relLegislador?.legisladoresPeticion_id || null)
        setTemaActual(relTema?.temasPeticiones_id || null)

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
          tema_id: relTema?.temasPeticiones_id || "",
          asesor_id: relAsesor?.asesores_id || "", // Añadir esta línea
          fecha_recibido: formattedFechaRecibido,
          detalles: peticion.detalles || "",
          year: peticion.year?.toString() || "",
          mes: peticion.mes?.toString() || "",
          fecha_asignacion: formattedFechaAsignacion,
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

  const handleCrearTema = async () => {
    if (!nuevoTema.trim()) return

    setIsCreatingTema(true)
    const supabase = createClientClient()

    try {
      // Insertar nuevo tema
      const { data, error } = await supabase
        .from("temasPeticiones")
        .insert({
          nombre: nuevoTema.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()

      if (error) throw error

      // Obtener el tema recién creado
      const { data: nuevoTemaData, error: fetchError } = await supabase
        .from("temasPeticiones")
        .select("id, nombre")
        .eq("nombre", nuevoTema.trim())
        .single()

      if (fetchError) throw fetchError

      // Actualizar la lista de temas
      setTemas((prev) => [...prev, nuevoTemaData])

      // Seleccionar el nuevo tema
      setFormData((prev) => ({
        ...prev,
        tema_id: nuevoTemaData.id,
      }))

      toast({
        title: "Tema creado",
        description: `El tema "${nuevoTema}" ha sido creado correctamente.`,
      })

      // Cerrar el diálogo y limpiar el campo
      setOpenNuevoTemaDialog(false)
      setNuevoTema("")
    } catch (error) {
      console.error("Error creating tema:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: `No se pudo crear el tema: ${error.message}`,
      })
    } finally {
      setIsCreatingTema(false)
    }
  }

  const handleCrearAsesor = async () => {
    if (!nuevoAsesor.name.trim()) return

    setIsCreatingAsesor(true)
    const supabase = createClientClient()

    try {
      // Insertar nuevo asesor
      const { data, error } = await supabase
        .from("asesores")
        .insert({
          name: nuevoAsesor.name.trim(),
          email: nuevoAsesor.email.trim(),
          tel: nuevoAsesor.tel.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()

      if (error) throw error

      // Obtener el asesor recién creado
      const { data: nuevoAsesorData, error: fetchError } = await supabase
        .from("asesores")
        .select("id, name")
        .eq("name", nuevoAsesor.name.trim())
        .single()

      if (fetchError) throw fetchError

      // Actualizar la lista de asesores
      setAsesores((prev) => [...prev, nuevoAsesorData])

      // Seleccionar el nuevo asesor
      setFormData((prev) => ({
        ...prev,
        asesor_id: nuevoAsesorData.id,
      }))

      toast({
        title: "Asesor creado",
        description: `El asesor "${nuevoAsesor.name}" ha sido creado correctamente.`,
      })

      // Cerrar el diálogo y limpiar el campo
      setOpenNuevoAsesorDialog(false)
      setNuevoAsesor({ name: "", email: "", tel: "" })
    } catch (error) {
      console.error("Error creating asesor:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: `No se pudo crear el asesor: ${error.message}`,
      })
    } finally {
      setIsCreatingAsesor(false)
    }
  }

  const handleSubmit = async (e, shouldRedirect = false, stayOnPage = false) => {
    e.preventDefault()
    setIsSaving(true)

    const supabase = createClientClient()

    try {
      // Preparar datos para la actualización
      const updateData = {
        ...formData,
        year: formData.year ? Number.parseInt(formData.year) : null,
        mes: formData.mes ? Number.parseInt(formData.mes) : null,
        fecha_recibido: formData.fecha_recibido || null,
        fecha_asignacion: formData.fecha_asignacion || null,
        updated_at: new Date().toISOString(),
      }

      // Eliminar campos de ID que no son columnas en la tabla peticiones
      delete updateData.clasificacion_id
      delete updateData.legislador_id
      delete updateData.tema_id
      delete updateData.legislador
      delete updateData.asesor_id

      // Convertir campos de fecha vacíos a null
      Object.keys(updateData).forEach((key) => {
        if (key.startsWith("fecha_") && updateData[key] === "") {
          updateData[key] = null
        }
      })

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

      // Actualizar la relación de tema si ha cambiado
      if (formData.tema_id !== temaActual) {
        if (temaActual) {
          // Eliminar la relación anterior
          const { error: delError } = await supabase
            .from("peticiones_temas")
            .delete()
            .eq("peticiones_id", id)
            .eq("temasPeticiones_id", temaActual)

          if (delError) {
            console.error("Error deleting tema relation:", delError)
          }
        }

        if (formData.tema_id) {
          // Crear nueva relación
          const { error: insError } = await supabase.from("peticiones_temas").insert({
            peticiones_id: id,
            temasPeticiones_id: formData.tema_id,
            created_at: new Date().toISOString(),
          })

          if (insError) {
            console.error("Error creating tema relation:", insError)
          }
        }
      }

      // Actualizar la relación de asesor si ha cambiado
      if (formData.asesor_id !== asesorActual) {
        if (asesorActual) {
          // Eliminar la relación anterior
          const { error: delError } = await supabase
            .from("peticiones_asesores")
            .delete()
            .eq("peticiones_id", id)
            .eq("asesores_id", asesorActual)

          if (delError) {
            console.error("Error deleting asesor relation:", delError)
          }
        }

        if (formData.asesor_id) {
          // Crear nueva relación
          const { error: insError } = await supabase.from("peticiones_asesores").insert({
            peticiones_id: id,
            asesores_id: formData.asesor_id,
            created_at: new Date().toISOString(),
          })

          if (insError) {
            console.error("Error creating asesor relation:", insError)
          }
        }
      }

      toast({
        title: "Petición actualizada",
        description: "La petición ha sido actualizada correctamente.",
      })

      if (!stayOnPage) {
        if (shouldRedirect) {
          router.push("/dashboard/peticiones")
        } else {
          router.push(`/dashboard/peticiones/${id}/ver`)
        }
      }
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

      // Eliminar las relaciones en peticiones_temas
      const { error: relTemaError } = await supabase.from("peticiones_temas").delete().eq("peticiones_id", id)

      if (relTemaError) {
        console.error("Error deleting tema relations:", relTemaError)
        // Continuamos con la eliminación de la petición aunque falle la eliminación de relaciones
      }

      // Eliminar las relaciones en peticiones_asesores
      const { error: relAsesorError } = await supabase.from("peticiones_asesores").delete().eq("peticiones_id", id)

      if (relAsesorError) {
        console.error("Error deleting asesor relations:", relAsesorError)
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
        <h1 className="text-2xl font-bold">Editar Petición</h1>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
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
                  <Label htmlFor="tema">Tema</Label>
                  <div className="flex gap-2">
                    <Popover open={openTemaPopover} onOpenChange={setOpenTemaPopover}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openTemaPopover}
                          className="w-full justify-between"
                        >
                          {formData.tema_id
                            ? temas.find((tema) => tema.id === formData.tema_id)?.nombre
                            : "Seleccionar tema"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar tema..." value={temaSearch} onValueChange={setTemaSearch} />
                          <CommandList>
                            <CommandEmpty>
                              No se encontraron resultados.
                              <Button
                                variant="ghost"
                                className="mt-2 w-full justify-start"
                                onClick={() => {
                                  setNuevoTema(temaSearch)
                                  setOpenNuevoTemaDialog(true)
                                  setOpenTemaPopover(false)
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Crear "{temaSearch}"
                              </Button>
                            </CommandEmpty>
                            <CommandGroup>
                              {temas
                                .filter((tema) => tema.nombre.toLowerCase().includes(temaSearch.toLowerCase()))
                                .map((tema) => (
                                  <CommandItem
                                    key={tema.id}
                                    value={tema.id}
                                    onSelect={() => {
                                      setFormData((prev) => ({ ...prev, tema_id: tema.id }))
                                      setOpenTemaPopover(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.tema_id === tema.id ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                    {tema.nombre}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                          <div className="p-2 border-t">
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={() => {
                                setOpenNuevoTemaDialog(true)
                                setOpenTemaPopover(false)
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Crear nuevo tema
                            </Button>
                          </div>
                        </Command>
                      </PopoverContent>
                    </Popover>
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
                  <div className="flex gap-2">
                    <Popover open={openAsesorPopover} onOpenChange={setOpenAsesorPopover}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openAsesorPopover}
                          className="w-full justify-between"
                        >
                          {formData.asesor_id
                            ? asesores.find((asesor) => asesor.id === formData.asesor_id)?.name
                            : "Seleccionar asesor"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Buscar asesor..."
                            value={asesorSearch}
                            onValueChange={setAsesorSearch}
                          />
                          <CommandList>
                            <CommandEmpty>
                              No se encontraron resultados.
                              <Button
                                variant="ghost"
                                className="mt-2 w-full justify-start"
                                onClick={() => {
                                  setNuevoAsesor({ ...nuevoAsesor, name: asesorSearch })
                                  setOpenNuevoAsesorDialog(true)
                                  setOpenAsesorPopover(false)
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Crear "{asesorSearch}"
                              </Button>
                            </CommandEmpty>
                            <CommandGroup>
                              {asesores
                                .filter((asesor) => asesor.name.toLowerCase().includes(asesorSearch.toLowerCase()))
                                .map((asesor) => (
                                  <CommandItem
                                    key={asesor.id}
                                    value={asesor.id}
                                    onSelect={() => {
                                      setFormData((prev) => ({ ...prev, asesor_id: asesor.id }))
                                      setOpenAsesorPopover(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.asesor_id === asesor.id ? "opacity-100" : "opacity-0",
                                      )}
                                    />
                                    {asesor.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                          <div className="p-2 border-t">
                            <Button
                              variant="ghost"
                              className="w-full justify-start"
                              onClick={() => {
                                setOpenNuevoAsesorDialog(true)
                                setOpenAsesorPopover(false)
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Crear nuevo asesor
                            </Button>
                          </div>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
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
                <PeticionDocumentUploader peticionId={id} />
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/peticiones">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Ver Peticiones
              </Link>
            </Button>
            <div className="flex space-x-2">
              <Button type="button" onClick={(e) => handleSubmit(e, false, true)} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Guardando..." : "Guardar"}
              </Button>
              <Button type="button" onClick={(e) => handleSubmit(e, true)} disabled={isSaving} variant="outline">
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Guardando..." : "Guardar y salir"}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>

      {/* Diálogo para crear nuevo tema */}
      <Dialog open={openNuevoTemaDialog} onOpenChange={setOpenNuevoTemaDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear nuevo tema</DialogTitle>
            <DialogDescription>Ingrese el nombre del nuevo tema para peticiones.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nombre-tema" className="text-right">
                Nombre
              </Label>
              <Input
                id="nombre-tema"
                value={nuevoTema}
                onChange={(e) => setNuevoTema(e.target.value)}
                className="col-span-3"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenNuevoTemaDialog(false)}
              disabled={isCreatingTema}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleCrearTema} disabled={!nuevoTema.trim() || isCreatingTema}>
              {isCreatingTema ? "Creando..." : "Crear tema"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para crear nuevo asesor */}
      <Dialog open={openNuevoAsesorDialog} onOpenChange={setOpenNuevoAsesorDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Crear nuevo asesor</DialogTitle>
            <DialogDescription>Ingrese los datos del nuevo asesor.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nombre-asesor" className="text-right">
                Nombre
              </Label>
              <Input
                id="nombre-asesor"
                value={nuevoAsesor.name}
                onChange={(e) => setNuevoAsesor({ ...nuevoAsesor, name: e.target.value })}
                className="col-span-3"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email-asesor" className="text-right">
                Email
              </Label>
              <Input
                id="email-asesor"
                type="email"
                value={nuevoAsesor.email}
                onChange={(e) => setNuevoAsesor({ ...nuevoAsesor, email: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tel-asesor" className="text-right">
                Teléfono
              </Label>
              <Input
                id="tel-asesor"
                value={nuevoAsesor.tel}
                onChange={(e) => setNuevoAsesor({ ...nuevoAsesor, tel: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenNuevoAsesorDialog(false)}
              disabled={isCreatingAsesor}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleCrearAsesor} disabled={!nuevoAsesor.name.trim() || isCreatingAsesor}>
              {isCreatingAsesor ? "Creando..." : "Crear asesor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
