"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"

interface EstatusBadgeProps {
  estatusId: number | null
  className?: string
}

export function EstatusBadge({ estatusId, className = "" }: EstatusBadgeProps) {
  const [estatus, setEstatus] = useState<{ nombre: string; color: string } | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const supabase = createClientClient()

  useEffect(() => {
    const fetchEstatus = async () => {
      if (!estatusId) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from("peticionEstatus")
          .select("nombre, color")
          .eq("id", estatusId)
          .single()

        if (error) throw error
        setEstatus(data)
      } catch (error) {
        console.error("Error al cargar estatus:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEstatus()
  }, [estatusId, supabase])

  // Función para determinar si el texto debe ser blanco o negro según el color de fondo
  const getTextColor = (bgColor: string) => {
    // Convertir el color hexadecimal a RGB
    const hex = bgColor.replace("#", "")
    const r = Number.parseInt(hex.substring(0, 2), 16)
    const g = Number.parseInt(hex.substring(2, 4), 16)
    const b = Number.parseInt(hex.substring(4, 6), 16)

    // Calcular la luminosidad (fórmula estándar)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    // Si la luminosidad es mayor a 0.5, el fondo es claro, por lo que el texto debe ser negro
    return luminance > 0.5 ? "#000000" : "#FFFFFF"
  }

  if (loading) {
    return <div className="h-6 w-20 bg-gray-200 animate-pulse rounded"></div>
  }

  if (!estatus) {
    return <span className="text-gray-500">Sin estatus</span>
  }

  return (
    <div
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{
        backgroundColor: estatus.color,
        color: getTextColor(estatus.color),
      }}
    >
      {estatus.nombre}
    </div>
  )
}
