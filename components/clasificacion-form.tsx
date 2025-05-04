"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { createClientClient } from "@/lib/supabase-client"

// Esquema de validación
const formSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  descripcion: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface ClasificacionFormProps {
  clasificacion?: {
    id: string
    nombre: string
    descripcion?: string
  }
  onSuccess?: () => void
}

export function ClasificacionForm({ clasificacion, onSuccess }: ClasificacionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const supabase = createClientClient()

  // Configurar el formulario con valores predeterminados si se está editando
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: clasificacion?.nombre || "",
      descripcion: clasificacion?.descripcion || "",
    },
  })

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)

    try {
      if (clasificacion) {
        // Actualizar clasificación existente
        const { error } = await supabase
          .from("clasificaciones")
          .update({
            nombre: data.nombre,
            descripcion: data.descripcion,
          })
          .eq("id", clasificacion.id)

        if (error) throw error

        toast({
          title: "Clasificación actualizada",
          description: "La clasificación ha sido actualizada exitosamente",
        })
      } else {
        // Crear nueva clasificación
        const { error } = await supabase.from("clasificaciones").insert({
          nombre: data.nombre,
          descripcion: data.descripcion,
        })

        if (error) throw error

        toast({
          title: "Clasificación creada",
          description: "La clasificación ha sido creada exitosamente",
        })

        // Resetear el formulario después de crear
        form.reset({
          nombre: "",
          descripcion: "",
        })
      }

      // Llamar al callback de éxito si se proporciona
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error("Error al guardar la clasificación:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Ocurrió un error al guardar la clasificación",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
          Nombre
        </label>
        <Input id="nombre" {...form.register("nombre")} className="mt-1" placeholder="Nombre de la clasificación" />
        {form.formState.errors.nombre && (
          <p className="mt-1 text-sm text-red-600">{form.formState.errors.nombre.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">
          Descripción (opcional)
        </label>
        <Textarea
          id="descripcion"
          {...form.register("descripcion")}
          className="mt-1"
          placeholder="Descripción de la clasificación"
        />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Guardando..." : clasificacion ? "Actualizar" : "Crear"}
      </Button>
    </form>
  )
}
