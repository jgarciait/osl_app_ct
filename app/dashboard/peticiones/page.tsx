"use client"

import { Button } from "@/components/ui/button"

import { useState, useEffect, useRef } from "react"
import { createClientClient, cachedQuery } from "@/lib/supabase-client"
import { PeticionesTable } from "@/components/peticiones-table"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { AvailableNumbersDialog } from "@/components/available-numbers-dialog"

export default function PeticionesPage() {
  const [peticiones, setPeticiones] = useState([])
  const [years, setYears] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [tagMap, setTagMap] = useState({})
  const supabase = createClientClient()
  const { toast } = useToast()
  const router = useRouter()
  const [isAvailableNumbersDialogOpen, setIsAvailableNumbersDialogOpen] = useState(false)

  // Añadir refs para las suscripciones
  const subscriptions = useRef([])

  // Función para limpiar suscripciones
  const cleanupSubscriptions = () => {
    subscriptions.current.forEach((subscription) => subscription.unsubscribe())
    subscriptions.current = []
  }

  // Función para cargar datos
  const fetchData = async () => {
    try {
      setIsLoading(true)

      // Obtener todas las etiquetas y crear un mapa de ID a nombre
      const { data: etiquetas, error: etiquetasError } = await supabase.from("etiquetas").select("id, nombre, color")

      if (etiquetasError) {
        console.error("Error al obtener etiquetas:", etiquetasError)
        throw etiquetasError
      }

      // Crear un mapa de ID a nombre de etiqueta
      const etiquetasMap = {}
      etiquetas.forEach((etiqueta) => {
        etiquetasMap[etiqueta.id] = etiqueta.nombre
      })

      // Guardar el mapa de etiquetas
      setTagMap(etiquetasMap)

      // Obtener los perfiles de usuarios con caché
      const profiles = await cachedQuery("profiles", () => supabase.from("profiles").select("id, nombre, apellido"))

      // Obtener los temas con caché
      const temas = await cachedQuery("temas", () => supabase.from("temas").select("id, nombre"))

      // Crear un mapa de IDs de usuario a nombres completos
      const userMap = new Map()
      profiles?.data?.forEach((profile) => {
        userMap.set(profile.id, `${profile.nombre} ${profile.apellido}`)
      })

      // Obtener las peticiones con sus relaciones
      const { data, error } = await supabase
        .from("peticiones")
        .select(`
id, 
clasificacion,
year, 
mes, 
archivado, 
created_at,
asesor,
status,
detalles,
num_peticion,
tramite_despachado,
fecha_asignacion,
fecha_limite,
peticiones_legisladores(
  legisladoresPeticion(id, nombre)
),
peticiones_clasificacion(
  clasificacionesPeticion(id, nombre)
),
peticiones_temas(
  temasPeticiones(id, nombre)
),
peticiones_asesores(
  asesores(id, name, color)
)
`)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error al obtener peticiones:", error)
        throw error
      }

      // Procesamos los datos
      const processedData = data.map((peticion) => {
        // Obtener el nombre del legislador si existe
        const legislador = peticion.peticiones_legisladores?.[0]?.legisladoresPeticion?.nombre || "-"

        // Obtener el nombre de la clasificación si existe
        const clasificacionNombre = peticion.peticiones_clasificacion?.[0]?.clasificacionesPeticion?.nombre || "-"

        // Obtener el nombre del tema si existe
        const temaNombre = peticion.peticiones_temas?.[0]?.temasPeticiones?.nombre || "-"

        // Obtener el nombre y color del asesor si existe
        const asesorNombre = peticion.peticiones_asesores?.[0]?.asesores?.name || "-"
        const asesorColor = peticion.peticiones_asesores?.[0]?.asesores?.color || null

        return {
          ...peticion,
          legislador,
          clasificacionNombre,
          temaNombre,
          asesorNombre,
          asesorColor,
        }
      })

      setPeticiones(processedData)

      // Obtener años únicos para el filtro
      const uniqueYears = [...new Set(data.map((item) => item.year))].sort((a, b) => b - a)
      setYears(uniqueYears)

      // Configurar suscripciones en tiempo real
      setupRealtimeSubscriptions(userMap)
    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las peticiones. Por favor, intente nuevamente.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Limpiar suscripciones al desmontar
    return () => {
      cleanupSubscriptions()
    }
  }, [supabase, toast])

  // Función para configurar suscripciones en tiempo real
  const setupRealtimeSubscriptions = (userMap) => {
    // Limpiar suscripciones existentes
    cleanupSubscriptions()

    // Suscribirse a cambios en peticiones
    const peticionesSubscription = supabase
      .channel("peticiones-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "peticiones",
        },
        (payload) => {
          console.log("Cambio en peticiones:", payload)

          if (payload.eventType === "INSERT") {
            // Procesar nueva petición
            const newPeticion = payload.new

            // Añadir la nueva petición al estado
            setPeticiones((prev) => [
              {
                ...newPeticion,
              },
              ...prev,
            ])
          } else if (payload.eventType === "UPDATE") {
            // Actualizar petición existente
            setPeticiones((prev) =>
              prev.map((pet) => {
                if (pet.id === payload.new.id) {
                  return {
                    ...payload.new,
                  }
                }
                return pet
              }),
            )
          } else if (payload.eventType === "DELETE") {
            // Eliminar petición
            setPeticiones((prev) => prev.filter((pet) => pet.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    // Guardar referencias a las suscripciones para limpiarlas después
    subscriptions.current = [peticionesSubscription]
  }

  // Función para recargar datos manualmente
  const handleRefresh = () => {
    fetchData()
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <Button onClick={handleRefresh} variant="outline" className="ml-auto">
          Actualizar datos
        </Button>
      </div>
      <PeticionesTable peticiones={peticiones} years={years} tagMap={tagMap} />

      {/* Diálogo para seleccionar números disponibles */}
      <AvailableNumbersDialog open={isAvailableNumbersDialogOpen} onOpenChange={setIsAvailableNumbersDialogOpen} />
    </div>
  )
}
