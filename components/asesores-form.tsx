"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export function AsesoresForm() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    initials: "",
    email: "",
    tel: "",
    color: "#1a365d", // Color predeterminado que coincide con el tema
  })

  useEffect(() => {
    // Escuchar eventos de edición
    const handleEditAsesor = (event) => {
      const asesor = event.detail
      setFormData({
        id: asesor.id,
        name: asesor.name || "",
        initials: asesor.initials || "",
        email: asesor.email || "",
        tel: asesor.tel || "",
        color: asesor.color || "#1a365d",
      })
    }

    window.addEventListener("edit-asesor", handleEditAsesor)

    return () => {
      window.removeEventListener("edit-asesor", handleEditAsesor)
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
        // Actualizar asesor existente
        const { error } = await supabase
          .from("asesores")
          .update({
            name: formData.name,
            initials: formData.initials,
            email: formData.email,
            tel: formData.tel,
            color: formData.color,
          })
          .eq("id", formData.id)

        if (error) throw error

        // No necesitamos mostrar toast aquí, ya que la suscripción en tiempo real lo hará
      } else {
        // Crear nuevo asesor
        const { error } = await supabase.from("asesores").insert({
          name: formData.name,
          initials: formData.initials,
          email: formData.email,
          tel: formData.tel,
          color: formData.color,
        })

        if (error) throw error

        // No necesitamos mostrar toast aquí, ya que la suscripción en tiempo real lo hará
      }

      // Resetear formulario
      setFormData({
        id: null,
        name: "",
        initials: "",
        email: "",
        tel: "",
        color: "#1a365d",
      })

      // No necesitamos llamar a router.refresh() ya que estamos usando tiempo real
    } catch (error) {
      console.error("Error al guardar asesor:", error)
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error.message || "Ocurrió un error al guardar el asesor",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      id: null,
      name: "",
      initials: "",
      email: "",
      tel: "",
      color: "#1a365d",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{formData.id ? "Editar Asesor" : "Nuevo Asesor"}</CardTitle>
        <CardDescription>
          {formData.id ? "Actualice la información del asesor" : "Complete el formulario para crear un nuevo asesor"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initials">Iniciales</Label>
            <Input id="initials" name="initials" value={formData.initials} onChange={handleInputChange} />
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
            <Label htmlFor="color">Color</Label>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-md border"
                style={{ backgroundColor: formData.color }}
                aria-hidden="true"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" type="button">
                    Cambiar color
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3">
                  <HexColorPicker
                    color={formData.color}
                    onChange={(color) => setFormData((prev) => ({ ...prev, color }))}
                  />
                </PopoverContent>
              </Popover>
              <Input
                id="color"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                className="w-32"
                maxLength={20}
              />
            </div>
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
