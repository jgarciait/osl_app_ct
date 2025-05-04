"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function SequenceSettings() {
  const { toast } = useToast()
  const supabase = createClientClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nextSequence, setNextSequence] = useState("")
  const [error, setError] = useState("")
  const [lastExpresion, setLastExpresion] = useState(null)

  // Cargar la configuración actual al montar el componente
  useEffect(() => {
    fetchCurrentSequence()
  }, [])

  const fetchCurrentSequence = async () => {
    setLoading(true)
    setError("")

    try {
      // Obtener la última expresión para mostrar información
      const { data: lastExp, error: lastExpError } = await supabase
        .from("expresiones")
        .select("id, numero, sequence")
        .order("sequence", { ascending: false })
        .limit(1)

      if (lastExpError) throw lastExpError

      // Obtener la configuración de secuencia
      const { data: seqData, error: seqError } = await supabase
        .from("secuencia")
        .select("*")
        .eq("id", "next_sequence")
        .single()

      if (seqError && seqError.code !== "PGRST116") {
        // PGRST116 es el código de error cuando no se encuentra un registro
        throw seqError
      }

      // Si hay una última expresión, la guardamos para mostrar información
      if (lastExp && lastExp.length > 0) {
        setLastExpresion(lastExp[0])

        // Si no hay configuración, usamos la secuencia de la última expresión + 1
        if (!seqData) {
          setNextSequence(String(lastExp[0].sequence + 1))
        }
      }

      // Si hay configuración, la usamos
      if (seqData) {
        setNextSequence(seqData.valor)
      } else if (!lastExp || lastExp.length === 0) {
        // Si no hay configuración ni expresiones, empezamos en 1
        setNextSequence("1")
      }
    } catch (error) {
      console.error("Error fetching sequence configuration:", error)
      setError("Error al cargar la configuración de secuencia")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")

    try {
      // Validar que sea un número entero positivo
      const sequenceNumber = Number.parseInt(nextSequence, 10)
      if (isNaN(sequenceNumber) || sequenceNumber <= 0) {
        throw new Error("El número de secuencia debe ser un entero positivo")
      }

      // Guardar la configuración
      const { data: seqData, error: seqError } = await supabase
        .from("secuencia")
        .upsert({
          id: "next_sequence",
          valor: String(sequenceNumber),
          updated_at: new Date().toISOString(),
        })
        .select()

      if (seqError) throw seqError

      toast({
        title: "Configuración guardada",
        description: "El número de secuencia ha sido actualizado exitosamente",
      })
    } catch (error) {
      console.error("Error saving sequence configuration:", error)
      setError(error.message || "Error al guardar la configuración de secuencia")
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error.message || "Ocurrió un error al guardar la configuración",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Secuencia</CardTitle>
        <CardDescription>Establezca el próximo número de secuencia para las expresiones ciudadanas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="nextSequence">Próximo número de secuencia</Label>
          <Input
            id="nextSequence"
            type="number"
            min="1"
            value={nextSequence}
            onChange={(e) => setNextSequence(e.target.value)}
            disabled={loading}
            className="max-w-xs"
          />
          <p className="text-sm text-muted-foreground">
            Este número se utilizará para la próxima expresión que se registre en el sistema.
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={loading || saving} className="bg-[#1a365d] hover:bg-[#15294d]">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar configuración"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
