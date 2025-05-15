"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Save, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { format, differenceInDays, differenceInHours, differenceInMinutes, isValid } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PeticionDocumentUploader } from "@/components/peticion-document-uploader"
import { useNotify } from "@/lib/notifications"
import { EstatusSelector } from "@/components/estatus-selector"

export default function EditarPeticionPage({ params }) {
  const { id } = params
  const router = useRouter()
  const notify = useNotify()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Estados para las listas de opciones
  const [asesores, setAsesores] = useState([])
  const [clasificaciones, setClasificaciones] = useState([])
  const [legisladores, setLegisladores] = useState([])
  const [temas, setTemas] = useState([])

  // Estados para los diálogos de creación
  const [openNuevoTemaDialog, setOpenNuevoTemaDialog] = useState(false)
  const [nuevoTema, setNuevoTema] = useState("")
  const [isCreatingTema, setIsCreatingTema] = useState(false)

  const [openNuevoAsesorDialog, setOpenNuevoAsesorDialog] = useState(false)
  const [nuevoAsesor, setNuevoAsesor] = useState({ name: "", email: "", tel: "" })
  const [isCreatingAsesor, setIsCreatingAsesor] = useState(false)

  // Estado principal del formulario - SIMPLIFICADO
  const [formData, setFormData] = useState({
    clasificacion_id: "",
    clasificacion: "",
    legislador_id: "",
    legislador: "",
    tema_id: "",
    fecha_recibido: "",
    detalles: "",
    year: "",
    mes: "",
    fecha_asignacion: "",
    asesor_id: "",
    status: "",
    comentarios: "",
    tramite_despachado: false,
    archivado: false,
    peticionEstatus_id: "",
    fecha_despacho: "",
    fecha_limite: "",
  })

  // Cerca del inicio del componente, después de obtener el ID de los parámetros
  const peticionId = id ? String(id) : null

  // Cargar datos iniciales
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

        console.log("Petición cargada:", peticion)

        // Cargar listas de opciones
        const { data: asesoresData } = await supabase.from("asesores").select("id, name").order("name")
        const { data: clasificacionesData } = await supabase
          .from("clasificacionesPeticion")
          .select("id, nombre")
          .order("nombre")
        const { data: legisladoresData } = await supabase
          .from("legisladoresPeticion")
          .select("id, nombre")
          .order("nombre")
        const { data: temasData } = await supabase.from("temasPeticiones").select("id, nombre").order("nombre")

        setAsesores(asesoresData || [])
        setClasificaciones(clasificacionesData || [])
        setLegisladores(legisladoresData || [])
        setTemas(temasData || [])

        // Cargar relaciones
        const { data: relClasificacion } = await supabase
          .from("peticiones_clasificacion")
          .select("clasificaciones_id")
          .eq("peticiones_id", id)
          .maybeSingle()

        const { data: relLegislador } = await supabase
          .from("peticiones_legisladores")
          .select("legisladoresPeticion_id")
          .eq("peticiones_id", id)
          .maybeSingle()

        const { data: relTema } = await supabase
          .from("peticiones_temas")
          .select("temasPeticiones_id")
          .eq("peticiones_id", id)
          .maybeSingle()

        const { data: relAsesor } = await supabase
          .from("peticiones_asesores")
          .select("asesores_id")
          .eq("peticiones_id", id)
          .maybeSingle()

        console.log("Relaciones cargadas:", {
          clasificacion: relClasificacion,
          legislador: relLegislador,
          tema: relTema,
          asesor: relAsesor,
        })

        // Formatear fechas
        const formattedFechaRecibido = peticion.fecha_recibido
          ? format(new Date(peticion.fecha_recibido), "yyyy-MM-dd")
          : ""

        const formattedFechaAsignacion = peticion.fecha_asignacion
          ? format(new Date(peticion.fecha_asignacion), "yyyy-MM-dd")
          : ""

        const formattedFechaDespacho = peticion.fecha_despacho
          ? format(new Date(peticion.fecha_despacho), "yyyy-MM-dd")
          : ""

        const formattedFechaLimite = peticion.fecha_limite ? format(new Date(peticion.fecha_limite), "yyyy-MM-dd") : ""

        // Configurar el estado del formulario
        const formDataUpdated = {
          clasificacion: peticion.clasificacion || "",
          clasificacion_id: relClasificacion?.clasificaciones_id || "",
          legislador: peticion.legislador || "",
          legislador_id: relLegislador?.legisladoresPeticion_id || "",
          tema_id: relTema?.temasPeticiones_id || "",
          asesor_id: relAsesor?.asesores_id || "",
          fecha_recibido: formattedFechaRecibido,
          detalles: peticion.detalles || "",
          year: peticion.year?.toString() || "",
          mes: peticion.mes?.toString() || "",
          fecha_asignacion: formattedFechaAsignacion,
          status: peticion.status || "Recibida",
          comentarios: peticion.comentarios || "",
          tramite_despachado: peticion.tramite_despachado || false,
          archivado: peticion.archivado || false,
          peticionEstatus_id: peticion.peticionEstatus_id || "",
          fecha_despacho: formattedFechaDespacho,
          fecha_limite: formattedFechaLimite,
        }

        console.log("Datos del formulario actualizados:", formDataUpdated)
        setFormData(formDataUpdated)

        console.log("Datos iniciales cargados correctamente")
      } catch (error) {
        console.error("Error fetching data:", error)
        notify.error("No se pudieron cargar los datos. Por favor, intente nuevamente.", "Error")
        router.push("/dashboard/peticiones")
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchData()
    }
    // Este useEffect solo debe ejecutarse una vez al cargar el componente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Manejadores de cambios - SIMPLIFICADOS
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === "checkbox" ? checked : value

    console.log(`Cambiando ${name} a:`, newValue)

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }))
  }

  const handleSelectChange = (name, value) => {
    console.log(`Cambiando ${name} a:`, value)

    setFormData((prev) => {
      const newState = { ...prev, [name]: value }

      // Actualizar nombres solo si es necesario
      if (name === "clasificacion_id") {
        const clasificacionSeleccionada = clasificaciones.find((c) => c.id === value)
        if (clasificacionSeleccionada) {
          newState.clasificacion = clasificacionSeleccionada.nombre
        }
      } else if (name === "legislador_id") {
        const legisladorSeleccionado = legisladores.find((l) => l.id === value)
        if (legisladorSeleccionado) {
          newState.legislador = legisladorSeleccionado.nombre
        }
      }

      return newState
    })
  }

  // Crear nuevo tema
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

      const nuevoTemaData = data[0]

      // Actualizar la lista de temas
      setTemas((prev) => [...prev, nuevoTemaData])

      // Seleccionar el nuevo tema
      setFormData((prev) => ({
        ...prev,
        tema_id: nuevoTemaData.id,
      }))

      notify.success(`El tema "${nuevoTema}" ha sido creado correctamente.`, "Tema creado")
      setOpenNuevoTemaDialog(false)
      setNuevoTema("")
    } catch (error) {
      console.error("Error creating tema:", error)
      notify.error(`No se pudo crear el tema: ${error.message}`, "Error")
    } finally {
      setIsCreatingTema(false)
    }
  }

  // Crear nuevo asesor
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

      const nuevoAsesorData = data[0]

      // Actualizar la lista de asesores
      setAsesores((prev) => [...prev, nuevoAsesorData])

      // Seleccionar el nuevo asesor
      setFormData((prev) => ({
        ...prev,
        asesor_id: nuevoAsesorData.id,
      }))

      notify.success(`El asesor "${nuevoAsesor.name}" ha sido creado correctamente.`, "Asesor creado")
      setOpenNuevoAsesorDialog(false)
      setNuevoAsesor({ name: "", email: "", tel: "" })
    } catch (error) {
      console.error("Error creating asesor:", error)
      notify.error(`No se pudo crear el asesor: ${error.message}`, "Error")
    } finally {
      setIsCreatingAsesor(false)
    }
  }

  // Guardar cambios
  const handleSubmit = async (e, shouldRedirect = false, stayOnPage = false) => {
    e.preventDefault()
    setIsSaving(true)

    console.log("Guardando datos:", formData)

    const supabase = createClientClient()

    try {
      // Preparar datos para la actualización
      const updateData = {
        clasificacion: formData.clasificacion,
        detalles: formData.detalles,
        year: formData.year ? Number.parseInt(formData.year) : null,
        mes: formData.mes ? Number.parseInt(formData.mes) : null,
        fecha_recibido: formData.fecha_recibido || null,
        fecha_asignacion: formData.fecha_asignacion || null,
        fecha_despacho: formData.fecha_despacho || null,
        fecha_limite: formData.fecha_limite || null,
        // Eliminamos la referencia a status que no existe
        comentarios: formData.comentarios,
        tramite_despachado: formData.tramite_despachado,
        archivado: formData.archivado,
        updated_at: new Date().toISOString(),
        peticionEstatus_id: formData.peticionEstatus_id,
      }

      // Actualizar la petición
      const { error } = await supabase.from("peticiones").update(updateData).eq("id", id)
      if (error) throw error

      // Actualizar relaciones
      // 1. Clasificación
      if (formData.clasificacion_id) {
        // Eliminar relaciones existentes
        await supabase.from("peticiones_clasificacion").delete().eq("peticiones_id", id)

        // Crear nueva relación
        await supabase.from("peticiones_clasificacion").insert({
          peticiones_id: id,
          clasificaciones_id: formData.clasificacion_id,
          created_at: new Date().toISOString(),
        })
      }

      // 2. Legislador
      if (formData.legislador_id) {
        // Eliminar relaciones existentes
        await supabase.from("peticiones_legisladores").delete().eq("peticiones_id", id)

        // Crear nueva relación
        await supabase.from("peticiones_legisladores").insert({
          peticiones_id: id,
          legisladoresPeticion_id: formData.legislador_id,
          created_at: new Date().toISOString(),
        })
      }

      // 3. Tema
      if (formData.tema_id) {
        // Eliminar relaciones existentes
        await supabase.from("peticiones_temas").delete().eq("peticiones_id", id)

        // Crear nueva relación
        await supabase.from("peticiones_temas").insert({
          peticiones_id: id,
          temasPeticiones_id: formData.tema_id,
          created_at: new Date().toISOString(),
        })
      }

      // 4. Asesor
      // Eliminar relaciones existentes de asesor independientemente de si hay un nuevo asesor seleccionado
      await supabase.from("peticiones_asesores").delete().eq("peticiones_id", id)

      // Solo crear nueva relación si hay un asesor seleccionado
      if (formData.asesor_id) {
        await supabase.from("peticiones_asesores").insert({
          peticiones_id: id,
          asesores_id: formData.asesor_id,
          created_at: new Date().toISOString(),
        })
      }

      notify.success("La petición ha sido actualizada correctamente.", "Petición actualizada")

      if (!stayOnPage) {
        if (shouldRedirect) {
          router.push("/dashboard/peticiones")
        } else {
          router.push(`/dashboard/peticiones/${id}/ver`)
        }
      }
    } catch (error) {
      console.error("Error updating peticion:", error)
      notify.error(`No se pudo actualizar la petición: ${error.message}`, "Error")
    } finally {
      setIsSaving(false)
    }
  }

  // Eliminar petición
  const handleDelete = async () => {
    const supabase = createClientClient()

    try {
      // Eliminar todas las relaciones
      await supabase.from("peticiones_clasificacion").delete().eq("peticiones_id", id)
      await supabase.from("peticiones_legisladores").delete().eq("peticiones_id", id)
      await supabase.from("peticiones_temas").delete().eq("peticiones_id", id)
      await supabase.from("peticiones_asesores").delete().eq("peticiones_id", id)

      // Eliminar la petición
      const { error } = await supabase.from("peticiones").delete().eq("id", id)
      if (error) throw error

      notify.success("La petición ha sido eliminada correctamente.", "Petición eliminada")
      router.push("/dashboard/peticiones")
    } catch (error) {
      console.error("Error deleting peticion:", error)
      notify.error("No se pudo eliminar la petición. Por favor, intente nuevamente.", "Error")
    }
  }

  // Añadir esta función después de las declaraciones de estado
  const formatTimeDifference = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return null

    try {
      const startDate = new Date(startDateStr)
      const endDate = new Date(endDateStr)

      if (!isValid(startDate) || !isValid(endDate)) return null

      const days = differenceInDays(endDate, startDate)

      if (days < 1) {
        const hours = differenceInHours(endDate, startDate)
        if (hours < 1) {
          const minutes = differenceInMinutes(endDate, startDate)
          return `${minutes} minuto${minutes !== 1 ? "s" : ""}`
        }
        return `${hours} hora${hours !== 1 ? "s" : ""}`
      }

      return `${days} día${days !== 1 ? "s" : ""}`
    } catch (error) {
      console.error("Error al calcular diferencia de tiempo:", error)
      return null
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Editar Petición</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={async () => {
              if (isLoading || isSaving) return
              setIsLoading(true)
              try {
                const supabase = createClientClient()
                // Obtener todas las peticiones ordenadas por num_peticion
                const { data } = await supabase.from("peticiones").select("id, num_peticion").order("num_peticion")

                if (data && data.length > 0) {
                  // Encontrar el índice de la petición actual
                  const currentIndex = data.findIndex((p) => p.id === id)
                  if (currentIndex > 0) {
                    // Navegar a la petición anterior
                    router.push(`/dashboard/peticiones/${data[currentIndex - 1].id}/editar`)
                  } else {
                    notify.info("Esta es la primera petición", "Navegación")
                  }
                }
              } catch (error) {
                console.error("Error al navegar:", error)
                notify.error("Error al navegar entre peticiones", "Error")
              } finally {
                setIsLoading(false)
              }
            }}
            disabled={isLoading || isSaving}
            title="Petición anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={async () => {
              if (isLoading || isSaving) return
              setIsLoading(true)
              try {
                const supabase = createClientClient()
                // Obtener todas las peticiones ordenadas por num_peticion
                const { data } = await supabase.from("peticiones").select("id, num_peticion").order("num_peticion")

                if (data && data.length > 0) {
                  // Encontrar el índice de la petición actual
                  const currentIndex = data.findIndex((p) => p.id === id)
                  if (currentIndex < data.length - 1 && currentIndex !== -1) {
                    // Navegar a la siguiente petición
                    router.push(`/dashboard/peticiones/${data[currentIndex + 1].id}/editar`)
                  } else {
                    notify.info("Esta es la última petición", "Navegación")
                  }
                }
              } catch (error) {
                console.error("Error al navegar:", error)
                notify.error("Error al navegar entre peticiones", "Error")
              } finally {
                setIsLoading(false)
              }
            }}
            disabled={isLoading || isSaving}
            title="Siguiente petición"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        <Card>
          <CardHeader>
            <CardTitle>Información de la petición</CardTitle>
            <div className="text-sm text-muted-foreground mt-2 space-y-1">
              {formData.fecha_recibido && formData.fecha_asignacion && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Tiempo entre recepción y asignación:
                    <strong className="ml-1">
                      {formatTimeDifference(formData.fecha_recibido, formData.fecha_asignacion)}
                    </strong>
                  </span>
                </div>
              )}
              {formData.fecha_asignacion && formData.fecha_despacho && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Tiempo entre asignación y despacho:
                    <strong className="ml-1">
                      {formatTimeDifference(formData.fecha_asignacion, formData.fecha_despacho)}
                    </strong>
                  </span>
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
                    <Label htmlFor="clasificacion">Clasificación</Label>
                    <Select
                      value={formData.clasificacion_id || ""}
                      onValueChange={(value) => handleSelectChange("clasificacion_id", value)}
                    >
                      <SelectTrigger id="clasificacion">
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
                      value={formData.legislador_id || ""}
                      onValueChange={(value) => handleSelectChange("legislador_id", value)}
                    >
                      <SelectTrigger id="legislador">
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
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tema">Tema</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.tema_id || ""}
                      onValueChange={(value) => {
                        if (value === "nuevo") {
                          setOpenNuevoTemaDialog(true)
                        } else {
                          handleSelectChange("tema_id", value)
                        }
                      }}
                    >
                      <SelectTrigger id="tema" className="w-full">
                        <SelectValue placeholder="Seleccionar tema" />
                      </SelectTrigger>
                      <SelectContent>
                        {temas.map((tema) => (
                          <SelectItem key={tema.id} value={tema.id}>
                            {tema.nombre}
                          </SelectItem>
                        ))}
                        <SelectItem value="nuevo" className="text-blue-600 font-medium">
                          + Crear nuevo tema
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                  <Label htmlFor="fecha_limite">Fecha Límite</Label>
                  <Input
                    id="fecha_limite"
                    name="fecha_limite"
                    type="date"
                    value={formData.fecha_limite}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asesor">Asesor</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.asesor_id || ""}
                      onValueChange={(value) => {
                        if (value === "nuevo") {
                          setOpenNuevoAsesorDialog(true)
                        } else if (value === "clear") {
                          // Limpiar el campo de asesor
                          handleSelectChange("asesor_id", "")
                        } else {
                          handleSelectChange("asesor_id", value)
                        }
                      }}
                    >
                      <SelectTrigger id="asesor" className="w-full">
                        <SelectValue placeholder="Seleccionar asesor" />
                      </SelectTrigger>
                      <SelectContent>
                        {asesores.map((asesor) => (
                          <SelectItem key={asesor.id} value={asesor.id}>
                            {asesor.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="clear" className="text-red-600 font-medium">
                          - Eliminar selección
                        </SelectItem>
                        <SelectItem value="nuevo" className="text-blue-600 font-medium">
                          + Crear nuevo asesor
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Estatus</Label>
                  <EstatusSelector
                    value={formData.peticionEstatus_id || ""}
                    onValueChange={(value) => handleSelectChange("peticionEstatus_id", value)}
                    disabled={isSaving}
                  />
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="fecha_despacho">Fecha de Despacho</Label>
                    <Input
                      id="fecha_despacho"
                      name="fecha_despacho"
                      type="date"
                      value={formData.fecha_despacho}
                      onChange={handleInputChange}
                      placeholder="Seleccione la fecha de despacho"
                    />
                  </div>
                  <div className="flex items-center space-x-2 md:mt-8">
                    <Switch
                      id="tramite_despachado"
                      checked={formData.tramite_despachado}
                      onCheckedChange={(checked) => {
                        const fechaDespacho = checked ? format(new Date(), "yyyy-MM-dd") : ""
                        setFormData((prev) => ({
                          ...prev,
                          tramite_despachado: checked,
                          fecha_despacho: fechaDespacho,
                        }))
                      }}
                    />
                    <Label htmlFor="tramite_despachado">Trámite despachado</Label>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: Documentos */}
              <TabsContent value="documentos" className="space-y-6 pt-4">
                {peticionId ? (
                  <PeticionDocumentUploader peticionId={peticionId} />
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Guarde la petición primero para poder adjuntar documentos.
                    </p>
                  </div>
                )}
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
