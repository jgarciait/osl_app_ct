"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Save, Plus } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown } from "lucide-react"
import { CommandList } from "@/components/ui/command"
import { PeticionDocumentUploader } from "@/components/peticion-document-uploader"
import { useNotify } from "@/lib/notifications"

export default function NuevaPeticionPage() {
  const router = useRouter()
  const notify = useNotify()
  const [isSaving, setIsSaving] = useState(false)
  const [asesores, setAsesores] = useState([])
  const [clasificaciones, setClasificaciones] = useState([])
  const [legisladores, setLegisladores] = useState([])
  const [temas, setTemas] = useState([])
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [legisladorSearch, setLegisladorSearch] = useState("")
  const [temaSearch, setTemaSearch] = useState("")
  const [openTemaPopover, setOpenTemaPopover] = useState(false)
  const [openNuevoTemaDialog, setOpenNuevoTemaDialog] = useState(false)
  const [nuevoTema, setNuevoTema] = useState("")
  const [isCreatingTema, setIsCreatingTema] = useState(false)
  const [asesorSearch, setAsesorSearch] = useState("")
  const [peticionId, setPeticionId] = useState(null)

  const [formData, setFormData] = useState({
    // Tab 1: Información de Petición
    clasificacion_id: "",
    legislador_id: "",
    tema_id: "",
    fecha_recibido: format(new Date(), "yyyy-MM-dd"),
    detalles: "",
    year: new Date().getFullYear().toString(),
    mes: (new Date().getMonth() + 1).toString(),

    // Tab 2: Trámites
    fecha_asignacion: "",
    asesor_id: "", // Cambiado de asesor a asesor_id
    status: "Recibida",
    comentarios: "",
    tramite_despachado: false,

    // Otros campos necesarios
    archivado: false,
  })

  // Cargar listas de asesores, clasificaciones y legisladores
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClientClient()

      // Obtener asesores
      const { data: asesoresData, error: asesoresError } = await supabase
        .from("asesores")
        .select("id, name")
        .order("name")

      if (asesoresError) {
        console.error("Error fetching asesores:", asesoresError)
      } else {
        setAsesores(asesoresData || [])
      }

      // Obtener clasificaciones
      const { data: clasificacionesData, error: clasificacionesError } = await supabase
        .from("clasificacionesPeticion")
        .select("id, nombre")
        .order("nombre")

      if (clasificacionesError) {
        console.error("Error fetching clasificaciones:", clasificacionesError)
      } else {
        setClasificaciones(clasificacionesData || [])
      }

      // Obtener legisladores
      const { data: legisladoresData, error: legisladoresError } = await supabase
        .from("legisladoresPeticion")
        .select("id, nombre")
        .order("nombre")

      if (legisladoresError) {
        console.error("Error fetching legisladores:", legisladoresError)
      } else {
        setLegisladores(legisladoresData || [])
      }

      // Obtener temas
      const { data: temasData, error: temasError } = await supabase
        .from("temasPeticiones")
        .select("id, nombre")
        .order("nombre")

      if (temasError) {
        console.error("Error fetching temas:", temasError)
      } else {
        setTemas(temasData || [])
      }
    }

    fetchData()
  }, [])

  // Actualizar el año y mes cuando cambia la fecha de recibido
  useEffect(() => {
    if (formData.fecha_recibido) {
      const fecha = new Date(formData.fecha_recibido)
      setFormData((prev) => ({
        ...prev,
        year: fecha.getFullYear().toString(),
        mes: (fecha.getMonth() + 1).toString(),
      }))
    }
  }, [formData.fecha_recibido])

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
  }

  const handleDateChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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

      notify.success(`${files.length} archivo(s) subido(s) correctamente.`, "Archivos subidos")
    } catch (error) {
      console.error("Error uploading files:", error)
      notify.error("No se pudieron subir los archivos. Por favor, intente nuevamente.", "Error")
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

      notify.success(`El tema "${nuevoTema}" ha sido creado correctamente.`, "Tema creado")

      // Cerrar el diálogo y limpiar el campo
      setOpenNuevoTemaDialog(false)
      setNuevoTema("")
    } catch (error) {
      console.error("Error creating tema:", error)
      notify.error(`No se pudo crear el tema: ${error.message}`, "Error")
    } finally {
      setIsCreatingTema(false)
    }
  }

  const handleSubmit = async (e, redirectType = "view") => {
    e.preventDefault()
    setIsSaving(true)

    const supabase = createClientClient()

    try {
      // Obtener el año de la fecha de recibido y extraer los dos últimos dígitos
      const fechaRecibido = new Date(formData.fecha_recibido)
      const yearFull = fechaRecibido.getFullYear()
      const yearShort = yearFull.toString().slice(-2) // Obtener los últimos 2 dígitos del año

      // Obtener último número de petición del año actual para incrementarlo
      const { data: lastPeticion, error: fetchError } = await supabase
        .from("peticiones")
        .select("num_peticion")
        .eq("year", yearFull)
        .order("created_at", { ascending: false })
        .limit(1)

      if (fetchError) throw fetchError

      // Generar nuevo número de petición
      let numSecuencial = "0001"
      if (lastPeticion && lastPeticion.length > 0 && lastPeticion[0].num_peticion) {
        // Extraer el número secuencial de la última petición
        const lastNum = lastPeticion[0].num_peticion.split("-")[1]
        if (lastNum) {
          // Incrementar el número y asegurar que tenga 4 dígitos
          const nextNum = (Number.parseInt(lastNum) + 1).toString().padStart(4, "0")
          numSecuencial = nextNum
        }
      }

      // Formato final: AA-NNNN (ejemplo: 25-0001)
      const fullNumPeticion = `${yearShort}-${numSecuencial}`

      // Buscar el nombre de la clasificación seleccionada
      const clasificacionSeleccionada = clasificaciones.find((c) => c.id === formData.clasificacion_id)
      const clasificacionNombre = clasificacionSeleccionada ? clasificacionSeleccionada.nombre : ""

      // Buscar el nombre del tema seleccionado
      const temaSeleccionado = temas.find((t) => t.id === formData.tema_id)
      const temaNombre = temaSeleccionado ? temaSeleccionado.nombre : ""

      // Preparar datos para la inserción
      // Convertir campos de fecha vacíos a null para evitar errores de timestamp
      const insertData = {
        clasificacion: clasificacionNombre,
        fecha_recibido: formData.fecha_recibido || null,
        detalles: formData.detalles,
        year: yearFull,
        mes: fechaRecibido.getMonth() + 1,
        fecha_asignacion: formData.fecha_asignacion || null,
        status: formData.status,
        comentarios: formData.comentarios,
        tramite_despachado: formData.tramite_despachado,
        archivado: formData.archivado,
        num_peticion: fullNumPeticion,
        created_at: new Date().toISOString(),
      }

      // Insertar nueva petición
      const { data, error } = await supabase.from("peticiones").insert(insertData).select()

      if (error) throw error

      setPeticionId(data[0].id)

      // Crear relación en peticiones_clasificacion si se seleccionó una clasificación
      if (formData.clasificacion_id) {
        const { error: relError } = await supabase.from("peticiones_clasificacion").insert({
          peticiones_id: data[0].id,
          clasificaciones_id: formData.clasificacion_id,
          created_at: new Date().toISOString(),
        })

        if (relError) {
          console.error("Error creating classification relation:", relError)
          // No lanzamos error para no interrumpir el flujo principal
        }
      }

      // Crear relación en peticiones_legisladores si se seleccionó un legislador
      if (formData.legislador_id) {
        const { error: relError } = await supabase.from("peticiones_legisladores").insert({
          peticiones_id: data[0].id,
          legisladoresPeticion_id: formData.legislador_id,
          created_at: new Date().toISOString(),
        })

        if (relError) {
          console.error("Error creating legislator relation:", relError)
          // No lanzamos error para no interrumpir el flujo principal
        }
      }

      // Crear relación en peticiones_temas si se seleccionó un tema
      if (formData.tema_id) {
        const { error: relError } = await supabase.from("peticiones_temas").insert({
          peticiones_id: data[0].id,
          temasPeticiones_id: formData.tema_id,
          created_at: new Date().toISOString(),
        })

        if (relError) {
          console.error("Error creating tema relation:", relError)
          // No lanzamos error para no interrumpir el flujo principal
        }
      }

      // Crear relación en peticiones_asesores si se seleccionó un asesor
      if (formData.asesor_id) {
        const { error: relError } = await supabase.from("peticiones_asesores").insert({
          peticiones_id: data[0].id,
          asesores_id: formData.asesor_id,
          created_at: new Date().toISOString(),
        })

        if (relError) {
          console.error("Error creating asesor relation:", relError)
          // No lanzamos error para no interrumpir el flujo principal
        }
      }

      // Si hay archivos, asociarlos a la petición
      // Aquí iría el código para guardar la relación entre los archivos y la petición

      notify.success(`La petición ${fullNumPeticion} ha sido creada correctamente.`, "Petición creada")

      // Redirigir según el tipo de redirección solicitado
      if (redirectType === "list") {
        router.push("/dashboard/peticiones")
      } else if (redirectType === "edit") {
        router.push(`/dashboard/peticiones/${data[0].id}/editar`)
      } else {
        // Por defecto, redirigir a la página de ver la petición
        router.push(`/dashboard/peticiones/${data[0].id}/ver`)
      }
    } catch (error) {
      console.error("Error creating peticion:", error)
      notify.error(`No se pudo crear la petición: ${error.message}`, "Error")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Nueva Petición</h1>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        <Card>
          <CardHeader>
            <CardTitle>Crear nueva petición</CardTitle>
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
                        <div className="px-2 py-2 sticky top-0 bg-white z-10">
                          <Input
                            placeholder="Buscar legislador..."
                            value={legisladorSearch}
                            onChange={(e) => setLegisladorSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()} // Prevenir que el dropdown se cierre
                          />
                        </div>

                        {legisladores
                          .filter((legislador) =>
                            legislador.nombre.toLowerCase().includes(legisladorSearch.toLowerCase()),
                          )
                          .map((legislador) => (
                            <SelectItem key={legislador.id} value={legislador.id}>
                              {legislador.nombre}
                            </SelectItem>
                          ))}

                        {/* Mensaje cuando no hay resultados */}
                        {legisladorSearch &&
                          !legisladores.some((l) =>
                            l.nombre.toLowerCase().includes(legisladorSearch.toLowerCase()),
                          ) && <div className="px-2 py-2 text-sm text-gray-500">No se encontraron resultados</div>}
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
                  <Select value={formData.asesor_id} onValueChange={(value) => handleSelectChange("asesor_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar asesor" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-2 sticky top-0 bg-white z-10">
                        <Input
                          placeholder="Buscar asesor..."
                          value={asesorSearch}
                          onChange={(e) => setAsesorSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()} // Prevenir que el dropdown se cierre
                        />
                      </div>

                      {asesores
                        .filter((asesor) => asesor.name.toLowerCase().includes(asesorSearch.toLowerCase()))
                        .map((asesor) => (
                          <SelectItem key={asesor.id} value={asesor.id}>
                            {asesor.name}
                          </SelectItem>
                        ))}

                      {/* Mensaje cuando no hay resultados */}
                      {asesorSearch &&
                        !asesores.some((a) => a.name.toLowerCase().includes(asesorSearch.toLowerCase())) && (
                          <div className="px-2 py-2 text-sm text-gray-500">No se encontraron resultados</div>
                        )}
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
              </TabsContent>

              {/* Tab 3: Documentos */}
              <TabsContent value="documentos" className="space-y-6 pt-4">
                {peticionId ? (
                  <PeticionDocumentUploader peticionId={peticionId} />
                ) : (
                  <div className="text-center p-6 text-gray-500">
                    <p>Guarde la petición primero para poder subir documentos.</p>
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
            <div className="flex gap-2">
              <Button type="button" disabled={isSaving} onClick={(e) => handleSubmit(e, "edit")}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Guardando..." : "Crear Petición"}
              </Button>
              <Button type="button" disabled={isSaving} variant="outline" onClick={(e) => handleSubmit(e, "list")}>
                {isSaving ? "Guardando..." : "Crear y Salir"}
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
    </div>
  )
}
