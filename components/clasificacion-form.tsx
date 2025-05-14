"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardFooter } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"

export function ClasificacionForm() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()
  const { hasPermission } = usePermissions()
  const canManageClassifications = hasPermission("classifications_pcl", "manage")

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    id: null,
    nombre: "",
    abreviatura: "",
  })

  useEffect(() => {
    // Listen for edit events
    const handleEditClasificacion = (event) => {
      const clasificacion = event.detail
      setFormData({
        id: clasificacion.id,
        nombre: clasificacion.nombre,
        abreviatura: clasificacion.abreviatura || "",
      })
    }

    window.addEventListener("edit-clasificacion", handleEditClasificacion)

    return () => {
      window.removeEventListener("edit-clasificacion", handleEditClasificacion)
    }
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (formData.id) {
        // Update existing clasificacion
        const { error } = await supabase
          .from("clasificacionesPeticion")
          .update({
            nombre: formData.nombre,
            abreviatura: formData.abreviatura,
          })
          .eq("id", formData.id)

        if (error) throw error

        toast({
          title: "Clasificación actualizada",
          description: "La clasificación ha sido actualizada exitosamente",
        })
      } else {
        // Create new clasificacion
        const { error } = await supabase.from("clasificacionesPeticion").insert({
          nombre: formData.nombre,
          abreviatura: formData.abreviatura,
        })

        if (error) throw error

        toast({
          title: "Clasificación creada",
          description: "La clasificación ha sido creada exitosamente",
        })
      }

      // Reset form
      setFormData({
        id: null,
        nombre: "",
        abreviatura: "",
      })

      router.refresh()
    } catch (error) {
      console.error("Error saving clasificacion:", error)
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error.message || "Ocurrió un error al guardar la clasificación",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      id: null,
      nombre: "",
      abreviatura: "",
    })
  }

  return (
    <>
      {canManageClassifications && (
        <Card>
          <CardHeader>
            <CardDescription>
              {formData.id
                ? "Actualice la información de la clasificación"
                : "Complete el formulario para añadir una nueva clasificación."}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="abreviatura">Abreviatura</Label>
                <Input
                  id="abreviatura"
                  name="abreviatura"
                  value={formData.abreviatura}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              {formData.id && (
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                  Cancelar
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                className={`${formData.id ? "" : "w-full"} bg-[#1a365d] hover:bg-[#15294d]`}
              >
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
            </CardFooter>
          </form>
        </Card>
      )}
    </>
  )
}
