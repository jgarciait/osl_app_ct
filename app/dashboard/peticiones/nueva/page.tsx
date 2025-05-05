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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Save, Upload, File, Trash } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

export default function NuevaPeticionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [asesores, setAsesores] = useState([])
  const [clasificaciones, setClasificaciones] = useState([])
  const [legisladores, setLegisladores] = useState([])
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [legisladorSearch, setLegisladorSearch] = useState("")

  const [formData, setFormData] = useState({
    // Tab 1: Información de Petición
    clasificacion_id: "",
    legislador_id: "",
    fecha_recibido: format(new Date(), "yyyy-MM-dd"),
    detalles: "",
    year: new Date().getFullYear().toString(),
    mes: (new Date().getMonth() + 1).toString(),

    // Tab 2: Trámites
    fecha_asignacion: "",
    asesor: "",
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
    }

    fetchData()
  }, [])

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

  const handleSubmit = async (e, redirectType = "view") => {
    e.preventDefault()
    setIsSaving(true)

    const supabase = createClientClient()

    try {
      // Obtener último número de petición del año actual para incrementarlo
      const { data: lastPeticion, error: fetchError } = await supabase
        .from("peticiones")
        .select("num_peticion")
        .eq("year", Number.parseInt(formData.year))
        .order("created_at", { ascending: false })
        .limit(1)

      if (fetchError) throw fetchError

      // Generar nuevo número de petición
      let numPeticion = "001"
      if (lastPeticion && lastPeticion.length > 0 && lastPeticion[0].num_peticion) {
        const lastNum = lastPeticion[0].num_peticion.split("-")[0]
        const nextNum = Number.parseInt(lastNum) + 1
        numPeticion = nextNum.toString().padStart(3, "0")
      }

      // Formato final: 001-2023
      const fullNumPeticion = `${numPeticion}-${formData.year}`

      // Buscar el nombre de la clasificación seleccionada
      const clasificacionSeleccionada = clasificaciones.find((c) => c.id === formData.clasificacion_id)
      const clasificacionNombre = clasificacionSeleccionada ? clasificacionSeleccionada.nombre : ""

      // Preparar datos para la inserción
      // Convertir campos de fecha vacíos a null para evitar errores de timestamp
      const insertData = {
        clasificacion: clasificacionNombre,
        fecha_recibido: formData.fecha_recibido || null,
        detalles: formData.detalles,
        year: Number.parseInt(formData.year),
        mes: Number.parseInt(formData.mes),
        fecha_asignacion: formData.fecha_asignacion || null,
        asesor: formData.asesor || null,
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

      // Si hay archivos, asociarlos a la petición
      // Aquí iría el código para guardar la relación entre los archivos y la petición

      toast({
        title: "Petición creada",
        description: `La petición ${fullNumPeticion} ha sido creada correctamente.`,
      })

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
      toast({
        variant: "destructive",
        title: "Error",
        description: `No se pudo crear la petición: ${error.message}`,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/peticiones">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver
          </Link>
        </Button>
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
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" disabled={isSaving} onClick={(e) => handleSubmit(e, "edit")}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Guardando..." : "Crear Petición"}
            </Button>
            <Button type="button" disabled={isSaving} variant="outline" onClick={(e) => handleSubmit(e, "list")}>
              {isSaving ? "Guardando..." : "Crear y Salir"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
