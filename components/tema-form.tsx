"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

// Importar el hook de permisos
import { usePermissions } from "@/hooks/use-permissions"

export function TemaForm() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    id: null,
    nombre: "",
    descripcion: "",
  })

  const [tema, setTema] = useState(null)

  // Añadir la verificación de permisos después de las otras constantes
  const { hasPermission } = usePermissions()
  const canManageTemas = hasPermission("topics_pcl", "manage")

  useEffect(() => {
    // Listen for edit events
    const handleEditTema = (event) => {
      const tema = event.detail
      setTema(tema)
      setFormData({
        id: tema.id,
        nombre: tema.nombre,
        descripcion: tema.descripcion || "",
      })
    }

    window.addEventListener("edit-tema", handleEditTema)

    return () => {
      window.removeEventListener("edit-tema", handleEditTema)
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
        // Update existing tema
        const { error } = await supabase
          .from("temasPeticiones")
          .update({
            nombre: formData.nombre,
            descripcion: formData.descripcion,
          })
          .eq("id", formData.id)

        if (error) throw error

        toast({
          title: "Tema actualizado",
          description: "El tema ha sido actualizado exitosamente",
        })
      } else {
        // Create new tema
        const { error } = await supabase.from("temasPeticiones").insert({
          nombre: formData.nombre,
          descripcion: formData.descripcion,
        })

        if (error) throw error

        toast({
          title: "Tema creado",
          description: "El tema ha sido creado exitosamente",
        })
      }

      // Reset form
      setFormData({
        id: null,
        nombre: "",
        descripcion: "",
      })

      router.refresh()
    } catch (error) {
      console.error("Error saving tema:", error)
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error.message || "Ocurrió un error al guardar el tema",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      id: null,
      nombre: "",
      descripcion: "",
    })
  }

  // Modificar el return para incluir el renderizado condicional
  return (
    <>
      {canManageTemas && (
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{tema ? "Editar Tema" : "Nuevo Tema"}</CardTitle>
            <CardDescription>
              {tema ? "Actualice la información del tema" : "Ingrese la información del nuevo tema"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  required
                  placeholder="Nombre del tema"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  placeholder="Descripción del tema (opcional)"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tema ? "Actualizando..." : "Creando..."}
                  </>
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
