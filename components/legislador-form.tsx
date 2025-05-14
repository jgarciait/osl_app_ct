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
import { Loader2 } from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"

export function LegisladorForm() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()
  const { hasPermission } = usePermissions()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    id: null,
    nombre: "",
    email: "",
    tel: "",
    ext: "",
  })

  useEffect(() => {
    // Escuchar eventos de edición
    const handleEditLegislador = (event) => {
      const legislador = event.detail
      setFormData({
        id: legislador.id,
        nombre: legislador.nombre,
        email: legislador.email || "",
        tel: legislador.tel || "",
        ext: legislador.ext || "",
      })
    }

    window.addEventListener("edit-legislador", handleEditLegislador)

    return () => {
      window.removeEventListener("edit-legislador", handleEditLegislador)
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
        // Actualizar legislador existente
        const { error } = await supabase
          .from("legisladoresPeticion")
          .update({
            nombre: formData.nombre,
            email: formData.email,
            tel: formData.tel,
            ext: formData.ext,
          })
          .eq("id", formData.id)

        if (error) throw error

        toast({
          title: "Legislador actualizado",
          description: "El legislador ha sido actualizado exitosamente",
        })
      } else {
        // Crear nuevo legislador
        const { error } = await supabase.from("legisladoresPeticion").insert({
          nombre: formData.nombre,
          email: formData.email,
          tel: formData.tel,
          ext: formData.ext,
        })

        if (error) throw error

        toast({
          title: "Legislador creado",
          description: "El legislador ha sido creado exitosamente",
        })
      }

      // Resetear formulario
      setFormData({
        id: null,
        nombre: "",
        email: "",
        tel: "",
        ext: "",
      })

      router.refresh()
    } catch (error) {
      console.error("Error al guardar legislador:", error)
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error.message || "Ocurrió un error al guardar el legislador",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      id: null,
      nombre: "",
      email: "",
      tel: "",
      ext: "",
    })
  }

  // Si el usuario no tiene el permiso legislators:manage, ocultar el formulario
  if (!hasPermission("legislators", "manage")) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          {formData.id
            ? "Actualice la información del legislador"
            : "Complete el formulario para añadir un nuevo legislador."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tel">Teléfono</Label>
            <Input id="tel" name="tel" value={formData.tel} onChange={handleInputChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ext">Extensión</Label>
            <Input id="ext" name="ext" value={formData.ext} onChange={handleInputChange} />
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
