"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const asesorSchema = z.object({
  nombre: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
  apellido: z.string().min(2, { message: "El apellido debe tener al menos 2 caracteres" }),
  email: z.string().email({ message: "Debe ser un email válido" }),
  telefono: z.string().optional(),
  departamento: z.string().optional(),
  notas: z.string().optional(),
})

type AsesorFormValues = z.infer<typeof asesorSchema>

interface Asesor {
  id?: string
  nombre: string
  apellido: string
  email: string
  telefono?: string
  departamento?: string
  notas?: string
}

interface AsesorFormProps {
  asesor?: Asesor
  isEditing?: boolean
}

export function AsesorForm({ asesor, isEditing = false }: AsesorFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultValues: Partial<AsesorFormValues> = {
    nombre: asesor?.nombre || "",
    apellido: asesor?.apellido || "",
    email: asesor?.email || "",
    telefono: asesor?.telefono || "",
    departamento: asesor?.departamento || "",
    notas: asesor?.notas || "",
  }

  const form = useForm<AsesorFormValues>({
    resolver: zodResolver(asesorSchema),
    defaultValues,
  })

  async function onSubmit(data: AsesorFormValues) {
    setIsSubmitting(true)
    try {
      if (isEditing && asesor?.id) {
        // Actualizar asesor existente
        const { error } = await supabase.from("asesores").update(data).eq("id", asesor.id)

        if (error) throw error

        toast({
          title: "Asesor actualizado",
          description: "Los datos del asesor han sido actualizados exitosamente.",
        })
      } else {
        // Crear nuevo asesor
        const { error } = await supabase.from("asesores").insert([data])

        if (error) throw error

        toast({
          title: "Asesor creado",
          description: "El nuevo asesor ha sido creado exitosamente.",
        })
      }

      router.push("/dashboard/asesores")
      router.refresh()
    } catch (error) {
      console.error("Error al guardar asesor:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el asesor. Intente nuevamente.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Editar Asesor" : "Nuevo Asesor"}</CardTitle>
        <CardDescription>
          {isEditing ? "Actualice la información del asesor" : "Complete el formulario para registrar un nuevo asesor"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del asesor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apellido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl>
                      <Input placeholder="Apellido del asesor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="Teléfono de contacto" {...field} />
                    </FormControl>
                    <FormDescription>Opcional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="departamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <FormControl>
                      <Input placeholder="Departamento o área" {...field} />
                    </FormControl>
                    <FormDescription>Opcional</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas adicionales</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Información adicional sobre el asesor"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Opcional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard/asesores")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
