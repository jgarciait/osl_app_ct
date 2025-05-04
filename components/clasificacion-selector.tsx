"use client"

import { useState, useEffect } from "react"
import { MultiSelect } from "@/components/ui/multi-select"
import { createClientClient } from "@/lib/supabase-client"

interface Clasificacion {
  id: string
  nombre: string
}

interface ClasificacionSelectorProps {
  expresionId?: string
  selectedClasificaciones: string[]
  onChange: (clasificacionIds: string[]) => void
  disabled?: boolean
}

export function ClasificacionSelector({
  expresionId,
  selectedClasificaciones,
  onChange,
  disabled = false,
}: ClasificacionSelectorProps) {
  const [clasificaciones, setClasificaciones] = useState<Clasificacion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientClient()

  // Cargar clasificaciones disponibles
  useEffect(() => {
    const fetchClasificaciones = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase.from("clasificaciones").select("id, nombre").order("nombre")

        if (error) throw error

        setClasificaciones(data || [])
      } catch (error) {
        console.error("Error al cargar clasificaciones:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchClasificaciones()
  }, [supabase])

  // Cargar clasificaciones asignadas a la expresión
  useEffect(() => {
    if (!expresionId) return

    const fetchAsignadas = async () => {
      try {
        const { data, error } = await supabase
          .from("expresion_clasificaciones")
          .select("clasificacion_id")
          .eq("expresion_id", expresionId)

        if (error) throw error

        const clasificacionIds = data.map((item) => item.clasificacion_id)
        onChange(clasificacionIds)
      } catch (error) {
        console.error("Error al cargar clasificaciones asignadas:", error)
      }
    }

    fetchAsignadas()
  }, [expresionId, supabase, onChange])

  return (
    <MultiSelect
      options={clasificaciones.map((c) => ({ value: c.id, label: c.nombre }))}
      selected={selectedClasificaciones}
      onChange={onChange}
      placeholder={isLoading ? "Cargando clasificaciones..." : "Seleccionar clasificaciones"}
      disabled={disabled || isLoading}
    />
  )
}
