"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { ClasificacionSelector } from "@/components/clasificacion-selector"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"

export function PeticionForm({ peticion = null }) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clasificaciones, setClasificaciones] = useState([])
  const [legisladores, setLegisladores] = useState([])
  const [formData, setFormData] = useState({
    id: null,
    clasificacion: "",
    legislador_id: "",
    fecha_recibido: new Date(),
    detalles: "",
    asesor: "",
    comentarios: "",
    fecha_asignacion: new Date(),
    fecha_limite: new Date(new Date().setDate(new Date().getDate() + 7)), // Default to 7 days from now
    estatus: "pendiente",
    tramite_despachado: false,
    archivado: false,
  })

  // Fetch clasificaciones
  useEffect(() => {
    const fetchClasificaciones = async () => {
      try {
        const { data, error } = await supabase.from("clasificaciones").select("*").order("nombre")
        if (error) throw error
        setClasificaciones(data || [])
      } catch (error) {
        console.error("Error fetching clasificaciones:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las clasificaciones",
        })
      }
    }

    fetchClasificaciones()
  }, [supabase, toast])

  // Fetch legisladores
  useEffect(() => {
    const fetchLegisladores = async () => {
      try {
        const { data, error } = await supabase.from("legisladoresPeticion").select("*").order("nombre")
        if (error) throw error
        setLegisladores(data || [])
      } catch (error) {
        console.error("Error fetching legisladores:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los legisladores",
        })
      }
    }

    fetchLegisladores()
  }, [supabase, toast])

  // Set form data if editing
  useEffect(() => {
    if (peticion) {
      const fetchLegislador = async () => {
        try {
          // Obtener el legislador asociado a esta petición
          const { data, error } = await supabase
            .from("peticiones_legisladores")
            .select("legisladoresPeticion_id")
            .eq("peticiones_id", peticion.id)
            .single()

          if (error && error.code !== "PGRST116") {
            // PGRST116 es el código para "no se encontraron resultados"
            throw error
          }

          setFormData({
            id: peticion.id,
            clasificacion: peticion.clasificacion || "",
            legislador_id: data?.legisladoresPeticion_id || "",
            fecha_recibido: peticion.fecha_recibido ? new Date(peticion.fecha_recibido) : new Date(),
            detalles: peticion.detalles || "",
            asesor: peticion.asesor || "",
            comentarios: peticion.comentarios || "",
            fecha_asignacion: peticion.fecha_asignacion ? new Date(peticion.fecha_asignacion) : new Date(),
            fecha_limite: peticion.fecha_limite
              ? new Date(peticion.fecha_limite)
              : new Date(new Date().setDate(new Date().getDate() + 7)),
            estatus: peticion.estatus || "pendiente",
            tramite_despachado: peticion.tramite_despachado || false,
            archivado: peticion.archivado || false,
          })
        } catch (error) {
          console.error("Error fetching legislador for peticion:", error)
        }
      }

      fetchLegislador()
    }
  }, [peticion, supabase])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (name, date) => {
    setFormData((prev) => ({ ...prev, [name]: date }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1 // JavaScript months are 0-indexed
      const currentYear = currentDate.getFullYear()

      // Prepare data for insert/update
      const peticionData = {
        clasificacion: formData.clasificacion,
        fecha_recibido: formData.fecha_recibido.toISOString(),
        detalles: formData.detalles,
        asesor: formData.asesor,
        comentarios: formData.comentarios,
        fecha_asignacion: formData.fecha_asignacion.toISOString(),
        fecha_limite: formData.fecha_limite.toISOString(),
        estatus: formData.estatus,
        tramite_despachado: formData.tramite_despachado,
        archivado: formData.archivado,
      }

      let peticionId = formData.id

      if (peticionId) {
        // Update existing peticion
        const { error } = await supabase.from("peticiones").update(peticionData).eq("id", peticionId)

        if (error) throw error

        toast({
          title: "Petición actualizada",
          description: "La petición ha sido actualizada exitosamente",
        })
      } else {
        // Create new peticion
        const { data, error } = await supabase
          .from("peticiones")
          .insert({
            ...peticionData,
            year: currentYear,
            mes: currentMonth,
          })
          .select()

        if (error) throw error

        peticionId = data[0].id

        toast({
          title: "Petición creada",
          description: "La petición ha sido creada exitosamente",
        })
      }

      // Manejar la relación con legislador si se seleccionó uno
      if (formData.legislador_id) {
        // Primero verificar si ya existe una relación
        const { data: existingRelation, error: checkError } = await supabase
          .from("peticiones_legisladores")
          .select("*")
          .eq("peticiones_id", peticionId)
          .single()

        if (checkError && checkError.code !== "PGRST116") {
          // PGRST116 es el código para "no se encontraron resultados"
          throw checkError
        }

        if (existingRelation) {
          // Actualizar la relación existente
          const { error: updateError } = await supabase
            .from("peticiones_legisladores")
            .update({ legisladoresPeticion_id: formData.legislador_id })
            .eq("id", existingRelation.id)

          if (updateError) throw updateError
        } else {
          // Crear una nueva relación
          const { error: insertError } = await supabase.from("peticiones_legisladores").insert({
            peticiones_id: peticionId,
            legisladoresPeticion_id: formData.legislador_id,
          })

          if (insertError) throw insertError
        }
      }

      // Redirect to view page or list page
      router.push(peticionId ? `/dashboard/peticiones/${peticionId}/ver` : "/dashboard/peticiones")
    } catch (error) {
      console.error("Error saving peticion:", error)
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error.message || "Ocurrió un error al guardar la petición",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info">Información de Petición</TabsTrigger>
          <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Información de Petición</CardTitle>
              <CardDescription>Ingrese los detalles básicos de la petición</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clasificacion">Clasificación</Label>
                  <ClasificacionSelector
                    id="clasificacion"
                    value={formData.clasificacion}
                    onValueChange={(value) => handleSelectChange("clasificacion", value)}
                    clasificaciones={clasificaciones}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legislador">Legislador</Label>
                  <Select
                    value={formData.legislador_id}
                    onValueChange={(value) => handleSelectChange("legislador_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un legislador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguno</SelectItem>
                      {legisladores.map((legislador) => (
                        <SelectItem key={legislador.id} value={legislador.id}>
                          {legislador.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_recibido">Fecha de Recibido</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.fecha_recibido && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.fecha_recibido ? (
                          format(formData.fecha_recibido, "PPP", { locale: es })
                        ) : (
                          <span>Seleccione una fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.fecha_recibido}
                        onSelect={(date) => handleDateChange("fecha_recibido", date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="detalles">Detalles de Petición</Label>
                <Textarea
                  id="detalles"
                  name="detalles"
                  value={formData.detalles}
                  onChange={handleInputChange}
                  rows={5}
                  required
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguimiento" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Información de Seguimiento</CardTitle>
              <CardDescription>Ingrese los detalles de seguimiento de la petición</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="asesor">Asesor</Label>
                <Input id="asesor" name="asesor" value={formData.asesor} onChange={handleInputChange} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_asignacion">Fecha de Asignación</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.fecha_asignacion && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.fecha_asignacion ? (
                          format(formData.fecha_asignacion, "PPP", { locale: es })
                        ) : (
                          <span>Seleccione una fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.fecha_asignacion}
                        onSelect={(date) => handleDateChange("fecha_asignacion", date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_limite">Fecha Límite</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.fecha_limite && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.fecha_limite ? (
                          format(formData.fecha_limite, "PPP", { locale: es })
                        ) : (
                          <span>Seleccione una fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.fecha_limite}
                        onSelect={(date) => handleDateChange("fecha_limite", date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comentarios">Comentarios</Label>
                <Textarea
                  id="comentarios"
                  name="comentarios"
                  value={formData.comentarios}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estatus">Estatus</Label>
                  <Select value={formData.estatus} onValueChange={(value) => handleSelectChange("estatus", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un estatus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="en_proceso">En Proceso</SelectItem>
                      <SelectItem value="completado">Completado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-8">
                  <input
                    type="checkbox"
                    id="tramite_despachado"
                    name="tramite_despachado"
                    checked={formData.tramite_despachado}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="tramite_despachado" className="text-sm font-medium text-gray-700">
                    Trámite Despachado
                  </Label>

                  <input
                    type="checkbox"
                    id="archivado"
                    name="archivado"
                    checked={formData.archivado}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 ml-4"
                  />
                  <Label htmlFor="archivado" className="text-sm font-medium text-gray-700">
                    Archivado
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/peticiones")}
          className="mr-2"
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-[#1a365d] hover:bg-[#15294d]">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {formData.id ? "Actualizando..." : "Guardando..."}
            </>
          ) : formData.id ? (
            "Actualizar"
          ) : (
            "Guardar"
          )}
        </Button>
      </div>
    </form>
  )
}
