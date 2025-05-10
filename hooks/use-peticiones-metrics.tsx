"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@/lib/supabase/client"

export type PeticionWithTimes = {
  id: string
  num_peticion: string
  clasificacion: string
  tema?: string
  fecha_recibido: string | null
  fecha_asignacion: string | null
  fecha_despacho: string | null
  tiempoRecepcionAsignacion: string
  tiempoAsignacionDespacho: string
  tiempoTotal: string
  tiempoRecepcionAsignacionDias: number
  tiempoAsignacionDespachoDias: number
  tiempoTotalDias: number
}

export type MetricsData = {
  promedioRecepcionAsignacion: number
  promedioAsignacionDespacho: number
  promedioTotal: number
  peticionesRecientes: PeticionWithTimes[]
  isLoading: boolean
  error: string | null
}

const calcularDiasEntreFechas = (fecha1: string | null, fecha2: string | null): number => {
  if (!fecha1 || !fecha2) return 0

  try {
    const date1 = new Date(fecha1)
    const date2 = new Date(fecha2)

    // Verificar que las fechas sean válidas
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
      console.warn("Fechas inválidas:", { fecha1, fecha2 })
      return 0
    }

    // Diferencia en milisegundos
    const diffTime = Math.abs(date2.getTime() - date1.getTime())

    // Convertir a días
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
  } catch (error) {
    console.error("Error calculando días entre fechas:", error, { fecha1, fecha2 })
    return 0
  }
}

const formatearDias = (dias: number): string => {
  return dias === 1 ? `${dias} día` : `${dias} días`
}

export function usePeticionesMetrics(): MetricsData {
  const [metricsData, setMetricsData] = useState<MetricsData>({
    promedioRecepcionAsignacion: 0,
    promedioAsignacionDespacho: 0,
    promedioTotal: 0,
    peticionesRecientes: [],
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    let isMounted = true

    const fetchMetrics = async () => {
      try {
        const supabase = createClientComponentClient()

        console.log("Iniciando obtención de peticiones...")

        // Consulta a la tabla peticiones (solo funcionará si el usuario está autenticado)
        const { data, error } = await supabase.from("peticiones").select("*").order("created_at", { ascending: false })

        if (error) {
          console.error("Error al obtener peticiones:", error)
          throw error
        }

        console.log(`Obtenidas ${data?.length || 0} peticiones:`, data)

        // Si no hay datos, mostrar mensaje pero no error
        if (!data || data.length === 0) {
          console.log("No se encontraron peticiones en la base de datos")
          if (isMounted) {
            setMetricsData({
              promedioRecepcionAsignacion: 0,
              promedioAsignacionDespacho: 0,
              promedioTotal: 0,
              peticionesRecientes: [],
              isLoading: false,
              error: "No hay peticiones disponibles en la base de datos.",
            })
          }
          return
        }

        // Procesar peticiones y calcular tiempos
        const peticionesConTiempos: PeticionWithTimes[] = data.map((peticion) => {
          // Convertir fechas a formato string si no lo son ya
          const fechaRecibido = peticion.fecha_recibido ? String(peticion.fecha_recibido) : null
          const fechaAsignacion = peticion.fecha_asignacion ? String(peticion.fecha_asignacion) : null
          const fechaDespacho = peticion.fecha_despacho ? String(peticion.fecha_despacho) : null

          console.log("Procesando petición:", {
            id: peticion.id,
            num_peticion: peticion.num_peticion,
            clasificacion: peticion.clasificacion,
            fechaRecibido,
            fechaAsignacion,
            fechaDespacho,
          })

          const tiempoRecepcionAsignacionDias =
            fechaRecibido && fechaAsignacion ? calcularDiasEntreFechas(fechaRecibido, fechaAsignacion) : 0

          const tiempoAsignacionDespachoDias =
            fechaAsignacion && fechaDespacho ? calcularDiasEntreFechas(fechaAsignacion, fechaDespacho) : 0

          const tiempoTotalDias =
            fechaRecibido && fechaDespacho ? calcularDiasEntreFechas(fechaRecibido, fechaDespacho) : 0

          return {
            id: peticion.id,
            num_peticion: peticion.num_peticion || `P-${peticion.id.substring(0, 8)}`,
            clasificacion: peticion.clasificacion || "No especificada",
            tema: "No especificado", // Aquí se podría buscar el tema relacionado
            fecha_recibido: fechaRecibido,
            fecha_asignacion: fechaAsignacion,
            fecha_despacho: fechaDespacho,
            tiempoRecepcionAsignacion: formatearDias(tiempoRecepcionAsignacionDias),
            tiempoAsignacionDespacho: formatearDias(tiempoAsignacionDespachoDias),
            tiempoTotal: formatearDias(tiempoTotalDias),
            tiempoRecepcionAsignacionDias,
            tiempoAsignacionDespachoDias,
            tiempoTotalDias,
          }
        })

        console.log("Peticiones procesadas con tiempos:", peticionesConTiempos)

        // Calcular promedios solo con peticiones que tienen las fechas necesarias
        const peticionesConAsignacion = peticionesConTiempos.filter((p) => p.fecha_recibido && p.fecha_asignacion)
        const peticionesCompletadas = peticionesConTiempos.filter((p) => p.fecha_asignacion && p.fecha_despacho)
        const peticionesTotales = peticionesConTiempos.filter((p) => p.fecha_recibido && p.fecha_despacho)

        console.log(`Peticiones con asignación: ${peticionesConAsignacion.length}`)
        console.log(`Peticiones completadas: ${peticionesCompletadas.length}`)
        console.log(`Peticiones con tiempo total: ${peticionesTotales.length}`)

        const promedioRecepcionAsignacion =
          peticionesConAsignacion.length > 0
            ? peticionesConAsignacion.reduce((sum, p) => sum + p.tiempoRecepcionAsignacionDias, 0) /
              peticionesConAsignacion.length
            : 0

        const promedioAsignacionDespacho =
          peticionesCompletadas.length > 0
            ? peticionesCompletadas.reduce((sum, p) => sum + p.tiempoAsignacionDespachoDias, 0) /
              peticionesCompletadas.length
            : 0

        const promedioTotal =
          peticionesTotales.length > 0
            ? peticionesTotales.reduce((sum, p) => sum + p.tiempoTotalDias, 0) / peticionesTotales.length
            : 0

        console.log("Promedios calculados:", {
          promedioRecepcionAsignacion,
          promedioAsignacionDespacho,
          promedioTotal,
        })

        // Actualizar estado con los datos calculados
        if (isMounted) {
          setMetricsData({
            promedioRecepcionAsignacion,
            promedioAsignacionDespacho,
            promedioTotal,
            peticionesRecientes: peticionesConTiempos,
            isLoading: false,
            error: null,
          })
        }
      } catch (error) {
        console.error("Error al obtener métricas:", error)
        if (isMounted) {
          setMetricsData({
            promedioRecepcionAsignacion: 0,
            promedioAsignacionDespacho: 0,
            promedioTotal: 0,
            peticionesRecientes: [],
            isLoading: false,
            error: `Error al cargar los datos de métricas: ${error instanceof Error ? error.message : String(error)}`,
          })
        }
      }
    }

    fetchMetrics()

    return () => {
      isMounted = false
    }
  }, [])

  return metricsData
}
