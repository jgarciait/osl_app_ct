"use client"

import { useState, useEffect, useRef } from "react"
import { createClientClient, cachedQuery } from "@/lib/supabase-client"
import { ExpresionesTable } from "@/components/expresiones-table"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { AvailableNumbersDialog } from "@/components/available-numbers-dialog"

export default function ExpresionesPage() {
  const [expresiones, setExpresiones] = useState([])
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

  useEffect(() => {
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

        // Obtener las expresiones con su campo tema
        const { data, error } = await supabase
          .from("expresiones")
          .select(`
            id, 
            nombre, 
            email, 
            numero, 
            ano, 
            mes, 
            archivado, 
            created_at,
            assigned_to,
            assigned_color,
            assigned_text_color,
            assigned_border_color,
            tema
          `)
          .order("created_at", { ascending: false })
        // Removed limit to fetch all expressions

        if (error) {
          console.error("Error al obtener expresiones:", error)
          throw error
        }

        // Obtener las relaciones entre expresiones y temas
        const { data: expresionTemas, error: expresionTemasError } = await supabase
          .from("expresion_temas")
          .select("expresion_id, tema_id")

        if (expresionTemasError) {
          console.error("Error al obtener relaciones expresion-tema:", expresionTemasError)
          // Continuamos aunque haya error, ya que podemos usar el campo tema directo
        }

        // Crear un mapa de expresión a temas
        const expresionTemasMap = new Map()
        if (expresionTemas) {
          expresionTemas.forEach((rel) => {
            if (!expresionTemasMap.has(rel.expresion_id)) {
              expresionTemasMap.set(rel.expresion_id, [])
            }
            expresionTemasMap.get(rel.expresion_id).push(rel.tema_id)
          })
        }

        // Crear un mapa de IDs de tema a nombres
        const temasMap = new Map()
        temas?.data?.forEach((tema) => {
          temasMap.set(tema.id, tema.nombre)
        })

        // Procesar los datos para incluir el nombre del tema y el nombre del usuario asignado
        let processedData = data.map((expresion) => {
          // Primero intentamos obtener el tema de la relación muchos a muchos
          let tema_nombre = "Sin asignar"

          // Si hay relaciones en expresion_temas, usamos el primer tema relacionado
          const temasRelacionados = expresionTemasMap.get(expresion.id)
          if (temasRelacionados && temasRelacionados.length > 0) {
            const primerTemaId = temasRelacionados[0]
            tema_nombre = temasMap.get(primerTemaId) || "Sin asignar"
          }
          // Si no hay relación, intentamos usar el campo tema directo
          else if (expresion.tema) {
            tema_nombre = temasMap.get(expresion.tema) || "Sin asignar"
          }

          // Obtener el nombre del usuario asignado si existe
          const assigned_to_name = expresion.assigned_to ? userMap.get(expresion.assigned_to) || null : null

          return {
            ...expresion,
            tema_nombre,
            assigned_to_name,
          }
        })

        // Después de procesar los datos de expresiones, cargar información de etiquetas
        if (data && data.length > 0) {
          // Obtener IDs de todas las expresiones
          const expresionIds = data.map((exp) => exp.id)

          // Consultar documentos y sus etiquetas para estas expresiones
          const { data: documentosConEtiquetas, error: documentosError } = await supabase
            .from("documentos")
            .select(`
              id,
              expresion_id,
              documento_etiquetas(etiqueta_id)
            `)
            .in("expresion_id", expresionIds)

          if (documentosError) {
            console.error("Error al obtener documentos con etiquetas:", documentosError)
            throw documentosError
          }

          // Crear un mapa de expresión a etiquetas
          const expresionEtiquetasMap = new Map()

          // Procesar los datos para agrupar etiquetas por expresión
          documentosConEtiquetas.forEach((doc) => {
            if (doc.documento_etiquetas && doc.documento_etiquetas.length > 0) {
              const tagIds = doc.documento_etiquetas.map((tag) => tag.etiqueta_id)

              if (!expresionEtiquetasMap.has(doc.expresion_id)) {
                expresionEtiquetasMap.set(doc.expresion_id, new Set())
              }

              // Añadir etiquetas al conjunto para esta expresión
              tagIds.forEach((tagId) => {
                expresionEtiquetasMap.get(doc.expresion_id).add(tagId)
              })
            }
          })

          // Actualizar los datos procesados con la información de etiquetas
          processedData = processedData.map((exp) => {
            const tagIds = expresionEtiquetasMap.has(exp.id) ? Array.from(expresionEtiquetasMap.get(exp.id)) : []

            // Convertir IDs a nombres de etiquetas
            const tagNames = tagIds.map((id) => etiquetasMap[id] || id)

            return {
              ...exp,
              document_tags: tagIds,
              document_tag_names: tagNames,
            }
          })
        }

        setExpresiones(processedData)

        // Obtener años únicos para el filtro
        const uniqueYears = [...new Set(data.map((item) => item.ano))].sort((a, b) => b - a)
        setYears(uniqueYears)

        // Configurar suscripciones en tiempo real
        setupRealtimeSubscriptions(userMap, temasMap, expresionTemasMap)
      } catch (error) {
        console.error("Error al cargar datos:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las expresiones. Por favor, intente nuevamente.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()

    // Limpiar suscripciones al desmontar
    return () => {
      cleanupSubscriptions()
    }
  }, [supabase, toast])

  // Función para configurar suscripciones en tiempo real
  const setupRealtimeSubscriptions = (userMap, temasMap, expresionTemasMap) => {
    // Limpiar suscripciones existentes
    cleanupSubscriptions()

    // Suscribirse a cambios en expresiones
    const expresionesSubscription = supabase
      .channel("expresiones-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expresiones",
        },
        (payload) => {
          console.log("Cambio en expresiones:", payload)

          if (payload.eventType === "INSERT") {
            // Procesar nueva expresión
            const newExpresion = payload.new

            // Obtener el nombre del tema
            let tema_nombre = "Sin asignar"
            if (newExpresion.tema) {
              tema_nombre = temasMap.get(newExpresion.tema) || "Sin asignar"
            }

            // Obtener el nombre del usuario asignado
            const assigned_to_name = newExpresion.assigned_to ? userMap.get(newExpresion.assigned_to) || null : null

            // Añadir la nueva expresión al estado
            setExpresiones((prev) => [
              {
                ...newExpresion,
                tema_nombre,
                assigned_to_name,
                document_tags: [],
                document_tag_names: [],
              },
              ...prev,
            ])
          } else if (payload.eventType === "UPDATE") {
            // Actualizar expresión existente
            setExpresiones((prev) =>
              prev.map((exp) => {
                if (exp.id === payload.new.id) {
                  // Obtener el nombre del tema
                  let tema_nombre = "Sin asignar"
                  if (payload.new.tema) {
                    tema_nombre = temasMap.get(payload.new.tema) || "Sin asignar"
                  }

                  // Obtener el nombre del usuario asignado
                  const assigned_to_name = payload.new.assigned_to ? userMap.get(payload.new.assigned_to) || null : null

                  return {
                    ...payload.new,
                    tema_nombre,
                    assigned_to_name,
                    document_tags: exp.document_tags || [],
                    document_tag_names: exp.document_tag_names || [],
                  }
                }
                return exp
              }),
            )
          } else if (payload.eventType === "DELETE") {
            // Eliminar expresión
            setExpresiones((prev) => prev.filter((exp) => exp.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    // Suscribirse a cambios en expresion_comites
    const expresionComitesSubscription = supabase
      .channel("expresion-comites-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expresion_comites",
        },
        (payload) => {
          console.log("Cambio en expresion_comites:", payload)
          // Aquí podrías implementar lógica específica para actualizar las relaciones
          // entre expresiones y comités si es necesario
        },
      )
      .subscribe()

    // Suscribirse a cambios en expresion_clasificaciones
    const expresionClasificacionesSubscription = supabase
      .channel("expresion-clasificaciones-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expresion_clasificaciones",
        },
        (payload) => {
          console.log("Cambio en expresion_clasificaciones:", payload)
          // Aquí podrías implementar lógica específica para actualizar las relaciones
          // entre expresiones y clasificaciones si es necesario
        },
      )
      .subscribe()

    // Suscribirse a cambios en documentos
    const documentosSubscription = supabase
      .channel("documentos-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "documentos",
        },
        (payload) => {
          console.log("Cambio en documentos:", payload)
          // Aquí podrías implementar lógica específica para actualizar los documentos
          // si es necesario en esta vista
        },
      )
      .subscribe()

    // Guardar referencias a las suscripciones para limpiarlas después
    subscriptions.current = [
      expresionesSubscription,
      expresionComitesSubscription,
      expresionClasificacionesSubscription,
      documentosSubscription,
    ]
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6"></div>
      <ExpresionesTable expresiones={expresiones} years={years} tagMap={tagMap} />

      {/* Diálogo para seleccionar números disponibles */}
      <AvailableNumbersDialog open={isAvailableNumbersDialogOpen} onOpenChange={setIsAvailableNumbersDialogOpen} />
    </div>
  )
}
