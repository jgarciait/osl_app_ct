"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Save, RefreshCw } from "lucide-react"
import Link from "next/link"

export default function AsesoresColoresPage() {
  const [asesores, setAsesores] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createClientClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchAsesores()
  }, [])

  const fetchAsesores = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase.from("asesores").select("*").order("name", { ascending: true })

      if (error) {
        throw error
      }

      // Asegurarse de que todos los asesores tengan un color
      const asesoresConColor = data.map((asesor) => ({
        ...asesor,
        color: asesor.color || "#f0f0f0",
      }))

      setAsesores(asesoresConColor)
    } catch (error) {
      console.error("Error al cargar asesores:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los asesores. Por favor, intente nuevamente.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleColorChange = (id, color) => {
    setAsesores((prev) => prev.map((asesor) => (asesor.id === id ? { ...asesor, color } : asesor)))
  }

  const handleSaveColors = async () => {
    try {
      setIsSaving(true)

      // Guardar los colores de cada asesor
      for (const asesor of asesores) {
        const { error } = await supabase.from("asesores").update({ color: asesor.color }).eq("id", asesor.id)

        if (error) throw error
      }

      toast({
        title: "Colores guardados",
        description: "Los colores de los asesores se han actualizado correctamente.",
      })
    } catch (error) {
      console.error("Error al guardar colores:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar los colores. Por favor, intente nuevamente.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetColors = () => {
    // Asignar colores predeterminados basados en el índice
    const coloresPredeterminados = [
      "#e6f2ff", // Azul claro
      "#fff2e6", // Naranja claro
      "#e6ffe6", // Verde claro
      "#fff9e6", // Amarillo claro
      "#f9e6ff", // Púrpura claro
      "#e6ffff", // Cian claro
      "#ffe6e6", // Rojo claro
      "#f2f2f2", // Gris claro
    ]

    setAsesores((prev) =>
      prev.map((asesor, index) => ({
        ...asesor,
        color: coloresPredeterminados[index % coloresPredeterminados.length],
      })),
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/peticiones">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Configuración de Colores de Asesores</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetColors} disabled={isLoading || isSaving}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Restablecer Colores
          </Button>
          <Button onClick={handleSaveColors} disabled={isLoading || isSaving}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Cambios
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Colores de Asesores</CardTitle>
          <CardDescription>
            Configure los colores para cada asesor. Estos colores se utilizarán para identificar las filas en la tabla
            de peticiones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asesor</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Vista Previa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asesores.map((asesor) => (
                  <TableRow key={asesor.id}>
                    <TableCell className="font-medium">{asesor.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={asesor.color}
                          onChange={(e) => handleColorChange(asesor.id, e.target.value)}
                          className="w-16 h-8 p-1"
                        />
                        <Input
                          type="text"
                          value={asesor.color}
                          onChange={(e) => handleColorChange(asesor.id, e.target.value)}
                          className="w-28"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="h-10 w-full rounded border" style={{ backgroundColor: asesor.color }}>
                        <div className="flex items-center justify-center h-full">
                          <span className="text-sm">Texto de ejemplo</span>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
