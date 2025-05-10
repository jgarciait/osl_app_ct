"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export type PeticionWithTimes = {
  id: string
  num_peticion: string
  clasificacion: string
  tema?: string
  fecha_recibido: string
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
    const fetchMetrics = async () => {
      try {
        const supabase = createClientComponentClient()

        console.log("Fetching peticiones data...")

        // Obtener todas las peticiones sin filtros
        const { data: peticiones, error } = await supabase
          .from("peticiones")
          .select("*")
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching peticiones:", error)
          throw error
        }

        console.log(`Fetched ${peticiones?.length || 0} peticiones:`, peticiones)

        if (!peticiones || peticiones.length === 0) {
          setMetricsData({
            promedioRecepcionAsignacion: 0,
            promedioAsignacionDespacho: 0,
            promedioTotal: 0,
            peticionesRecientes: [],
            isLoading: false,
            error: "No hay peticiones disponibles",
          })
          return
        }

        // Procesar peticiones y calcular tiempos
        const peticionesConTiempos: PeticionWithTimes[] = peticiones.map((peticion) => {
          // Asegurarse de que las fechas sean strings válidos
          const fechaRecibido = peticion.fecha_recibido ? String(peticion.fecha_recibido) : null
          const fechaAsignacion = peticion.fecha_asignacion ? String(peticion.fecha_asignacion) : null
          const fechaDespacho = peticion.fecha_despacho ? String(peticion.fecha_despacho) : null

          console.log("Procesando petición:", {
            id: peticion.id,
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
            fecha_recibido: fechaRecibido || "",
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

        console.log("Processed peticiones with times:", peticionesConTiempos)

        // Calcular promedios solo con peticiones que tienen las fechas necesarias
        const peticionesConAsignacion = peticionesConTiempos.filter((p) => p.fecha_asignacion && p.fecha_recibido)
        const peticionesCompletadas = peticionesConTiempos.filter((p) => p.fecha_despacho && p.fecha_asignacion)
        const peticionesTotales = peticionesConTiempos.filter((p) => p.fecha_despacho && p.fecha_recibido)

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

        console.log("Calculated averages:", {
          promedioRecepcionAsignacion,
          promedioAsignacionDespacho,
          promedioTotal,
        })

        // Actualizar estado con los datos calculados
        setMetricsData({
          promedioRecepcionAsignacion,
          promedioAsignacionDespacho,
          promedioTotal,
          peticionesRecientes: peticionesConTiempos,
          isLoading: false,
          error: null,
        })
      } catch (error) {
        console.error("Error al obtener métricas:", error)
        setMetricsData((prev) => ({
          ...prev,
          isLoading: false,
          error: `Error al cargar los datos de métricas: ${error instanceof Error ? error.message : String(error)}`,
        }))
      }
    }

    fetchMetrics()
  }, [])

  return metricsData
}
