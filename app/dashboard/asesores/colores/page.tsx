"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, RotateCcw, Save } from "lucide-react"
import Link from "next/link"

export default function AsesoresColoresPage() {
  const [asesores, setAsesores] = useState([])
  const [originalAsesores, setOriginalAsesores] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClientClient()

  // Cargar los asesores al iniciar
  useEffect(() => {
    const fetchAsesores = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase.from("asesores").select("*").order("name", { ascending: true })

        if (error) {
          throw error
        }

        setAsesores(data || [])
        setOriginalAsesores(JSON.parse(JSON.stringify(data || []))) // Copia profunda para poder restaurar
      } catch (error) {
        console.error("Error al cargar asesores:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los asesores",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAsesores()
  }, [supabase, toast])

  // Función para actualizar el color de un asesor
  const handleColorChange = (id, color) => {
    setAsesores((prevAsesores) =>
      prevAsesores.map((asesor) => {
        if (asesor.id === id) {
          return { ...asesor, color }
        }
        return asesor
      }),
    )
  }

  // Función para guardar todos los cambios
  const handleSaveChanges = async () => {
    setSaving(true)
    try {
      // Filtrar solo los asesores que han cambiado de color
      const changedAsesores = asesores.filter(
        (asesor) => !originalAsesores.find((original) => original.id === asesor.id && original.color === asesor.color),
      )

      if (changedAsesores.length === 0) {
        toast({
          title: "Sin cambios",
          description: "No se han realizado cambios en los colores",
        })
        setSaving(false)
        return
      }

      // Actualizar cada asesor modificado
      for (const asesor of changedAsesores) {
        const { error } = await supabase.from("asesores").update({ color: asesor.color }).eq("id", asesor.id)

        if (error) {
          throw error
        }
      }

      // Actualizar la copia original
      setOriginalAsesores(JSON.parse(JSON.stringify(asesores)))

      toast({
        title: "Cambios guardados",
        description: `Se han actualizado los colores de ${changedAsesores.length} asesores`,
      })
    } catch (error) {
      console.error("Error al guardar cambios:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar los cambios",
      })
    } finally {
      setSaving(false)
    }
  }

  // Función para restablecer los colores originales
  const handleResetColors = () => {
    setAsesores(JSON.parse(JSON.stringify(originalAsesores)))
    toast({
      title: "Colores restablecidos",
      description: "Se han restablecido los colores originales",
    })
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/peticiones">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Configuración de Colores de Asesores</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetColors} disabled={loading}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restablecer Colores
          </Button>
          <Button onClick={handleSaveChanges} disabled={loading || saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Colores de Asesores</h2>
          <p className="text-gray-500">
            Configure los colores para cada asesor. Estos colores se utilizarán para identificar las filas en la tabla
            de peticiones.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700 w-1/3">Asesor</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 w-1/3">Color</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700 w-1/3">Vista Previa</th>
                </tr>
              </thead>
              <tbody>
                {asesores.map((asesor) => (
                  <tr key={asesor.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{asesor.name}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={asesor.color || "#ffffff"}
                          onChange={(e) => handleColorChange(asesor.id, e.target.value)}
                          className="w-10 h-10 rounded cursor-pointer"
                        />
                        <Input
                          value={asesor.color || "#ffffff"}
                          onChange={(e) => handleColorChange(asesor.id, e.target.value)}
                          className="w-32"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div
                        className="px-4 py-2 rounded text-center"
                        style={{ backgroundColor: asesor.color || "#ffffff" }}
                      >
                        Texto de ejemplo
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
