"use client"

import { CardFooter } from "@/components/ui/card"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useGroupPermissions } from "@/hooks/use-group-permissions"

export function ComiteForm() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    id: null,
    nombre: "",
    tipo: "senado",
  })

  const { hasPermission } = useGroupPermissions()
  const canManageComites = hasPermission("committees", "manage")

  useEffect(() => {
    // Listen for edit events
    const handleEditComite = (event) => {
      const comite = event.detail
      setFormData({
        id: comite.id,
        nombre: comite.nombre,
        tipo: comite.tipo,
      })
    }

    window.addEventListener("edit-comite", handleEditComite)

    return () => {
      window.removeEventListener("edit-comite", handleEditComite)
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
        // Update existing committee
        const { error } = await supabase
          .from("comites")
          .update({
            nombre: formData.nombre,
            tipo: formData.tipo,
          })
          .eq("id", formData.id)

        if (error) throw error

        toast({
          title: "Comité actualizado",
          description: "El comité ha sido actualizado exitosamente",
        })
      } else {
        // Create new committee
        const { error } = await supabase.from("comites").insert({
          nombre: formData.nombre,
          tipo: formData.tipo,
        })

        if (error) throw error

        toast({
          title: "Comité creado",
          description: "El comité ha sido creado exitosamente",
        })
      }

      // Reset form
      setFormData({
        id: null,
        nombre: "",
        tipo: "senado",
      })

      router.refresh()
    } catch (error) {
      console.error("Error saving committee:", error)
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error.message || "Ocurrió un error al guardar el comité",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      id: null,
      nombre: "",
      tipo: "senado",
    })
  }

  if (!canManageComites) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          {formData.id
            ? "Actualice la información del comité"
            : "Complete el formulario para añadir comisiónes y legisladores."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo</Label>
            <Select
              name="tipo"
              value={formData.tipo}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, tipo: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="senado">Senado</SelectItem>
                <SelectItem value="camara">Cámara</SelectItem>
              </SelectContent>
            </Select>
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
  )
}
