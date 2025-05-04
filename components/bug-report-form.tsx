"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Bug, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function BugReportForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "media",
    // Eliminamos screenshot_url del estado inicial
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClientClient()

      // Verificar si el usuario está autenticado
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error("Debe iniciar sesión para reportar un bug")
      }

      // Insertar el reporte en la base de datos
      // Eliminamos screenshot_url del objeto que se envía a Supabase
      const { data, error } = await supabase
        .from("bug_reports")
        .insert({
          user_id: session.user.id,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          status: "abierto",
        })
        .select()

      if (error) throw error

      toast({
        title: "Reporte enviado",
        description: "Su reporte ha sido enviado exitosamente. Gracias por ayudarnos a mejorar.",
      })

      // Limpiar el formulario
      setFormData({
        title: "",
        description: "",
        priority: "media",
        // Eliminamos screenshot_url de la limpieza del formulario
      })

      // Redirigir a la lista de reportes
      router.push("/dashboard/bugs")
      router.refresh()
    } catch (err) {
      console.error("Error al enviar el reporte:", err)
      setError(err instanceof Error ? err.message : "Ocurrió un error al enviar el reporte")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Bug className="h-6 w-6" />
          Reportar un problema
        </CardTitle>
        <CardDescription>
          Utilice este formulario para reportar cualquier error o problema que haya encontrado en la aplicación.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Título del problema</Label>
            <Input
              id="title"
              name="title"
              placeholder="Ej: Error al cargar expresiones"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción detallada</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describa el problema con el mayor detalle posible. Incluya los pasos para reproducirlo."
              value={formData.description}
              onChange={handleChange}
              rows={5}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Prioridad</Label>
            <Select value={formData.priority} onValueChange={(value) => handleSelectChange("priority", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione la prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baja">Baja - No afecta el funcionamiento principal</SelectItem>
                <SelectItem value="media">Media - Causa inconvenientes pero hay alternativas</SelectItem>
                <SelectItem value="alta">Alta - Impide realizar tareas importantes</SelectItem>
                <SelectItem value="critica">Crítica - Sistema completamente inutilizable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Eliminamos el campo screenshot_url del formulario */}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={() => {
              if (!isSubmitting) {
                // Esta función se ejecutará después de que el formulario se envíe exitosamente
                setTimeout(() => {
                  router.push("/dashboard/bugs")
                  router.refresh()
                }, 100)
              }
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar reporte"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
