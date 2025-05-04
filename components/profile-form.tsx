"use client"

import { useState } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export function ProfileForm({ profile, user }) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nombre: profile?.nombre || "",
    apellido: profile?.apellido || "",
    telefono: profile?.telefono || "",
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Verificar si el perfil ya existe
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single()

      let result

      if (existingProfile) {
        // Si el perfil existe, usar update
        result = await supabase
          .from("profiles")
          .update({
            nombre: formData.nombre,
            apellido: formData.apellido,
            telefono: formData.telefono,
            email: user.email,
            updated_at: new Date(),
          })
          .eq("id", user.id)
      } else {
        // Si el perfil no existe, usar insert
        result = await supabase.from("profiles").insert({
          id: user.id,
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono,
          email: user.email,
          updated_at: new Date(),
        })
      }

      if (result.error) throw result.error

      toast({
        title: "Perfil actualizado",
        description: "Su información de perfil ha sido actualizada exitosamente",
      })

      router.refresh()
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: error.message || "Ocurrió un error al actualizar su perfil",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-[400px] mx-auto">
      <CardHeader>
        <CardTitle>Información de Perfil</CardTitle>
        <CardDescription>Actualice su información personal</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input id="email" value={user.email} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input id="nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apellido">Apellido</Label>
            <Input id="apellido" name="apellido" value={formData.apellido} onChange={handleInputChange} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" name="telefono" value={formData.telefono} onChange={handleInputChange} />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting} className="w-full bg-[#1a365d] hover:bg-[#15294d]">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
