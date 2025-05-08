"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useNotify } from "@/lib/notifications"

export function TemaForm({ tema = null }) {
  const router = useRouter()
  const supabase = createClientClient()
  const notify = useNotify()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nombre: tema?.nombre || "",
    descripcion: tema?.descripcion || "",
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let result

      if (tema) {
        // Actualizar tema existente
        result = await supabase
          .from("temas")
          .update({
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            updated_at: new Date().toISOString(),
          })
          .eq("id", tema.id)
      } else {
        // Crear nuevo tema
        result = await supabase.from("temas").insert({
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }

      if (result.error) throw result.error

      notify.success(
        tema ? "El tema ha sido actualizado exitosamente" : "El tema ha sido creado exitosamente",
        tema ? "Tema actualizado" : "Tema creado",
      )

      // Redirigir a la lista de temas después de guardar
      router.push("/dashboard/temas")
      router.refresh()
    } catch (error) {
      console.error("Error al guardar tema:", error)
      notify.error(error.message || "Ocurrió un error al guardar el tema", "Error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
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
  )
}
