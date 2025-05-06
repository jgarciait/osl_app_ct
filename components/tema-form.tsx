"use client"

import { CardFooter } from "@/components/ui/card"

import { useEffect } from "react"

import { useState } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export function TemaForm() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    id: null,
    nombre: "",
  })

  useEffect(() => {
    // Listen for edit events
    const handleEditTema = (event) => {
      const tema = event.detail
      setFormData({
        id: tema.id,
        nombre: tema.nombre,
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
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardDescription>
          {formData.id ? "Actualice la información del tema" : "Complete el formulario para añadir un nuevo tema."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
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
