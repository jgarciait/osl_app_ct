"use client"

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ChevronDownIcon,
  SearchIcon,
  MoreVerticalIcon,
  EyeIcon,
  EditIcon,
  TrashIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  RefreshCw,
  AlertTriangleIcon,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useNotify } from "@/lib/notifications"
import { createClientClient } from "@/lib/supabase-client"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import type { RealtimeChannel } from "@supabase/supabase-js"

export function PeticionesTable({ peticiones, years, tagMap }) {
  const router = useRouter()
  const notify = useNotify() // Añadir esta línea
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedAsesor, setSelectedAsesor] = useState("all")
  const [sortColumn, setSortColumn] = useState("created_at")
  const [sortDirection, setSortDirection] = useState("desc")
  const [groupByAsesor, setGroupByAsesor] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSendingReminder, setIsSendingReminder] = useState(false)
  const supabase = createClientClient()

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [peticionToDelete, setPeticionToDelete] = useState(null)
  const [localPeticiones, setLocalPeticiones] = useState(peticiones)
  const [estatus, setEstatus] = useState([])

  // Referencias para las suscripciones de Realtime
  const realtimeSubscriptions = useRef<RealtimeChannel[]>([])

  // Cargar los estatus disponibles
  useEffect(() => {
    const fetchEstatus = async () => {
      try {
        const { data, error } = await supabase.from("peticionEstatus").select("id, nombre, color").order("nombre")
        if (error) throw error
        setEstatus(data || [])
      } catch (error) {
        console.error("Error al cargar estatus:", error)
      }
    }

    fetchEstatus()
  }, [supabase])

  // Función para actualizar el estatus de una petición
  const handleUpdateEstatus = async (peticionId, estatusId) => {
    try {
      // Buscar el estatus seleccionado
      const selectedEstatus = estatus.find((item) => item.id === estatusId)

      // Actualizar primero en el estado local para una respuesta inmediata en la UI
      setLocalPeticiones((prevPeticiones) =>
        prevPeticiones.map((pet) => {
          if (pet.id === peticionId) {
            return {
              ...pet,
              peticionEstatus_id: estatusId,
              estatusNombre: selectedEstatus?.nombre || pet.estatusNombre,
              estatusColor: selectedEstatus?.color || pet.estatusColor,
            }
          }
          return pet
        }),
      )

      // Luego actualizar en la base de datos
      const { error } = await supabase.from("peticiones").update({ peticionEstatus_id: estatusId }).eq("id", peticionId)

      if (error) throw error

      notify.success("El estatus de la petición ha sido actualizado correctamente.", "Estatus actualizado")
    } catch (error) {
      console.error("Error al actualizar estatus:", error)

      // Si hay error, revertir el cambio en el estado local
      handleRefresh()

      notify.error("No se pudo actualizar el estatus de la petición.", "Error")
    }
  }

  // Configurar suscripciones Realtime
  useEffect(() => {
    // Función para limpiar suscripciones
    const cleanupSubscriptions = () => {
      realtimeSubscriptions.current.forEach((channel) => {
        if (channel && channel.unsubscribe) {
          channel.unsubscribe()
        }
      })
      realtimeSubscriptions.current = []
    }

    // Limpiar suscripciones existentes
    cleanupSubscriptions()

    // Crear nueva suscripción para peticiones
    const peticionesChannel = supabase
      .channel("peticiones-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "peticiones",
        },
        async (payload) => {
          console.log("Cambio en peticiones detectado:", payload)

          try {
            // Para actualizaciones que nosotros mismos iniciamos, no hacemos nada
            // ya que ya actualizamos el estado local en handleUpdateEstatus
            if (
              payload.eventType === "UPDATE" &&
              payload.new &&
              payload.old &&
              payload.new.peticionEstatus_id !== payload.old.peticionEstatus_id
            ) {
              // Solo para cambios de estatus que vienen de otros clientes
              const existingPeticion = localPeticiones.find((p) => p.id === payload.new.id)
              if (!existingPeticion) return

              // Obtener el estatus actualizado
              const updatedEstatus = estatus.find((e) => e.id === payload.new.peticionEstatus_id)

              if (updatedEstatus) {
                // Actualizar solo el estatus en el estado local
                setLocalPeticiones((prev) =>
                  prev.map((pet) => {
                    if (pet.id === payload.new.id) {
                      return {
                        ...pet,
                        peticionEstatus_id: payload.new.peticionEstatus_id,
                        estatusNombre: updatedEstatus.nombre,
                        estatusColor: updatedEstatus.color,
                      }
                    }
                    return pet
                  }),
                )
              }
            } else if (payload.eventType === "INSERT") {
              // Obtener la petición completa con sus relaciones
              const { data: newPeticion, error } = await supabase
                .from("peticiones")
                .select(`
              *,
              peticionEstatus(id, nombre, color),
              peticiones_legisladores(legisladoresPeticion(id, nombre)),
              peticiones_clasificacion(clasificacionesPeticion(id, nombre)),
              peticiones_temas(temasPeticiones(id, nombre)),
              peticiones_asesores(asesores(id, name, color))
            `)
                .eq("id", payload.new.id)
                .single()

              if (error) {
                console.error("Error al obtener nueva petición:", error)
                return
              }

              // Procesar los datos de la nueva petición
              const processedPeticion = {
                ...newPeticion,
                legislador: newPeticion.peticiones_legisladores?.[0]?.legisladoresPeticion?.nombre || "-",
                clasificacionNombre: newPeticion.peticiones_clasificacion?.[0]?.clasificacionesPeticion?.nombre || "-",
                temaNombre: newPeticion.peticiones_temas?.[0]?.temasPeticiones?.nombre || "-",
                asesorNombre: newPeticion.peticiones_asesores?.[0]?.asesores?.name || "-",
                asesorColor: newPeticion.peticiones_asesores?.[0]?.asesores?.color || null,
                estatusNombre: newPeticion.peticionEstatus?.nombre || "-",
                estatusColor: newPeticion.peticionEstatus?.color || null,
              }

              // Añadir la nueva petición al estado
              setLocalPeticiones((prev) => [processedPeticion, ...prev])

              notify.success("Se ha añadido una nueva petición.", "Nueva petición")
            } else if (payload.eventType === "DELETE") {
              // Eliminar la petición del estado
              setLocalPeticiones((prev) => prev.filter((pet) => pet.id !== payload.old.id))

              notify.success("Una petición ha sido eliminada.", "Petición eliminada")
            }
          } catch (error) {
            console.error("Error al procesar cambio en tiempo real:", error)
          }
        },
      )
      .subscribe()

    // Crear suscripción para cambios en estatus
    const estatusChannel = supabase
      .channel("estatus-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "peticionEstatus",
        },
        async (payload) => {
          console.log("Cambio en estatus detectado:", payload)

          // Actualizar la lista de estatus
          const { data, error } = await supabase.from("peticionEstatus").select("id, nombre, color").order("nombre")

          if (error) {
            console.error("Error al recargar estatus:", error)
            return
          }

          setEstatus(data || [])

          // Si se actualizó un estatus, actualizar las peticiones que lo usan
          if (payload.eventType === "UPDATE") {
            setLocalPeticiones((prev) =>
              prev.map((pet) => {
                if (pet.peticionEstatus_id === payload.new.id) {
                  return {
                    ...pet,
                    estatusNombre: payload.new.nombre,
                    estatusColor: payload.new.color,
                  }
                }
                return pet
              }),
            )
          }
        },
      )
      .subscribe()

    // Guardar referencias a las suscripciones
    realtimeSubscriptions.current = [peticionesChannel, estatusChannel]

    // Limpiar suscripciones al desmontar
    return () => {
      cleanupSubscriptions()
    }
  }, [supabase, estatus, localPeticiones])

  // Actualizar localPeticiones cuando cambia peticiones
  useEffect(() => {
    setLocalPeticiones(peticiones)
  }, [peticiones])

  // Función para recargar datos manualmente
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
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
        peticionEstatus_id,
        peticionEstatus(id, nombre, color),
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
          asesores(id, name, color, email)
        )
      `)
        .order("created_at", { ascending: false })

      if (error) {
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

        // Obtener el nombre, color y email del asesor si existe
        const asesorNombre = peticion.peticiones_asesores?.[0]?.asesores?.name || "-"
        const asesorColor = peticion.peticiones_asesores?.[0]?.asesores?.color || null
        const asesorEmail = peticion.peticiones_asesores?.[0]?.asesores?.email || null

        // Obtener el nombre y color del estatus si existe
        const estatusNombre = peticion.peticionEstatus?.nombre || "-"
        const estatusColor = peticion.peticionEstatus?.color || null

        return {
          ...peticion,
          legislador,
          clasificacionNombre,
          temaNombre,
          asesorNombre,
          asesorColor,
          asesorEmail,
          estatusNombre,
          estatusColor,
        }
      })

      setLocalPeticiones(processedData)

      // También actualizar la lista de estatus
      const { data: estatusData, error: estatusError } = await supabase
        .from("peticionEstatus")
        .select("id, nombre, color")
        .order("nombre")

      if (!estatusError && estatusData) {
        setEstatus(estatusData)
      }

      notify.success("Los datos de peticiones han sido actualizados correctamente.", "Datos actualizados")
    } catch (error) {
      console.error("Error al recargar datos:", error)
      notify.error("No se pudieron recargar los datos. Por favor, intente nuevamente.", "Error")
    } finally {
      setIsRefreshing(false)
    }
  }

  // Actualizar la función handlePanicButton para usar el mismo sistema de notificaciones que se usa en la creación de peticiones

  // Función para enviar correo de pánico
  const handlePanicButton = async (peticion) => {
    try {
      setIsSendingReminder(true)

      // Mostrar notificación de inicio del proceso
      notify.info("Procesando el envío del recordatorio al asesor.", "Enviando recordatorio...")

      // Obtener el correo del asesor si no lo tenemos
      let asesorEmail = peticion.asesorEmail

      if (!asesorEmail) {
        // Intentar obtener el correo del asesor desde la base de datos
        const { data: asesorData, error: asesorError } = await supabase
          .from("peticiones_asesores")
          .select("asesores(id, email, name)")
          .eq("peticiones_id", peticion.id)
          .single()

        if (!asesorError && asesorData?.asesores?.email) {
          asesorEmail = asesorData.asesores.email
          // Actualizar también el nombre si está disponible
          if (asesorData.asesores.name) {
            peticion.asesorNombre = asesorData.asesores.name
          }
        }
      }

      // Verificar si tenemos el correo del asesor
      if (!asesorEmail) {
        notify.error(
          `No se encontró un correo electrónico para el asesor ${peticion.asesorNombre || "asignado"}. Por favor, actualice la información del asesor.`,
          "No se pudo enviar el recordatorio",
        )
        return
      }

      // Preparar los datos para enviar a la API
      const reminderData = {
        asesorEmail,
        asesorNombre: peticion.asesorNombre,
        num_peticion: peticion.num_peticion,
        clasificacionNombre: peticion.clasificacionNombre,
        legislador: peticion.legislador,
        temaNombre: peticion.temaNombre,
        estatusNombre: peticion.estatusNombre,
        fecha_asignacion: peticion.fecha_asignacion,
        fecha_limite: peticion.fecha_limite,
        detalles: peticion.detalles,
      }

      // Llamar a nuestra API para enviar el correo
      const response = await fetch("/api/send-reminder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reminderData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al enviar el recordatorio")
      }

      // Mostrar notificación de éxito con más detalles
      notify.success(
        `Se ha enviado un recordatorio a ${peticion.asesorNombre} (${asesorEmail}) sobre la petición ${peticion.num_peticion || "sin número"}.`,
        "Recordatorio enviado exitosamente",
      )
    } catch (error) {
      console.error("Error al enviar recordatorio:", error)

      // Mostrar notificación de error detallada
      notify.error(
        error.message || "Ocurrió un error al enviar el recordatorio. Por favor, inténtelo de nuevo.",
        "Error al enviar recordatorio",
      )
    } finally {
      setIsSendingReminder(false)
    }
  }

  // Opciones para el filtro de status
  const statusOptions = [
    { label: "Todos", value: "all" },
    { label: "Activas", value: "active" },
    { label: "Archivadas", value: "archived" },
  ]

  // Obtener lista única de asesores para el filtro
  const asesoresOptions = useMemo(() => {
    const asesores = new Set()
    localPeticiones.forEach((peticion) => {
      if (peticion.asesorNombre && peticion.asesorNombre !== "-") {
        asesores.add(peticion.asesorNombre)
      }
    })
    return [
      { label: "Todos los asesores", value: "all" },
      ...Array.from(asesores).map((asesor) => ({
        label: asesor,
        value: asesor,
      })),
    ]
  }, [localPeticiones])

  const filteredData = useMemo(() => {
    return localPeticiones.filter((peticion) => {
      // Filtrar por año
      if (selectedYear !== "all" && peticion.year !== Number.parseInt(selectedYear)) {
        return false
      }

      // Filtrar por estado
      if (selectedStatus === "active" && peticion.archivado) {
        return false
      }
      if (selectedStatus === "archived" && !peticion.archivado) {
        return false
      }

      // Filtrar por asesor
      if (selectedAsesor !== "all" && peticion.asesorNombre !== selectedAsesor) {
        return false
      }

      // Filtrar por término de búsqueda (num_peticion, clasificacion, detalles o asesor)
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase()
        return (
          (peticion.num_peticion && peticion.num_peticion.toLowerCase().includes(searchTermLower)) ||
          (peticion.clasificacion && peticion.clasificacion.toLowerCase().includes(searchTermLower)) ||
          (peticion.detalles && peticion.detalles.toLowerCase().includes(searchTermLower)) ||
          (peticion.asesorNombre && peticion.asesorNombre.toLowerCase().includes(searchTermLower))
        )
      }

      return true
    })
  }, [localPeticiones, selectedYear, selectedStatus, selectedAsesor, searchTerm])

  // Ordenar los datos según la columna seleccionada
  const sortedData = useMemo(() => {
    const sorted = [...filteredData]

    // Ordenar por la columna seleccionada
    sorted.sort((a, b) => {
      if (sortColumn === "created_at") {
        return sortDirection === "desc"
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }

      if (sortColumn === "num_peticion") {
        // Ordenar por número de petición
        if (!a.num_peticion) return sortDirection === "desc" ? -1 : 1
        if (!b.num_peticion) return sortDirection === "desc" ? 1 : -1
        return sortDirection === "desc"
          ? b.num_peticion.localeCompare(a.num_peticion)
          : a.num_peticion.localeCompare(b.num_peticion)
      }

      // Ordenamiento por defecto (fecha de creación)
      return sortDirection === "desc"
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    return sorted
  }, [filteredData, sortColumn, sortDirection])

  // Agrupar por asesor si está activada la opción
  const groupedData = useMemo(() => {
    if (!groupByAsesor) return { ungrouped: sortedData }

    const groups = {}
    sortedData.forEach((peticion) => {
      const asesorKey = peticion.asesorNombre || "Sin asesor"
      if (!groups[asesorKey]) {
        groups[asesorKey] = []
      }
      groups[asesorKey].push(peticion)
    })

    return groups
  }, [sortedData, groupByAsesor])

  // Paginación
  const totalPages = useMemo(() => {
    if (groupByAsesor) {
      // Si está agrupado, no aplicamos paginación
      return 1
    }
    return Math.ceil(sortedData.length / pageSize)
  }, [sortedData.length, pageSize, groupByAsesor])

  // Datos paginados
  const paginatedData = useMemo(() => {
    if (groupByAsesor) {
      // Si está agrupado, no aplicamos paginación
      return groupedData
    }

    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return { ungrouped: sortedData.slice(startIndex, endIndex) }
  }, [sortedData, currentPage, pageSize, groupByAsesor, groupedData])

  // Función para ver una petición
  const handleViewPeticion = (id) => {
    router.push(`/dashboard/peticiones/${id}/ver`)
  }

  // Función para editar una petición
  const handleEditPeticion = (id) => {
    router.push(`/dashboard/peticiones/${id}/editar`)
  }

  // Función para eliminar una petición y sus documentos
  const handleDeletePeticion = useCallback(
    async (id) => {
      if (!id) {
        notify.error("ID de petición no válido", "Error")
        return
      }

      setIsDeleting(true)

      try {
        console.log("Eliminando petición con ID:", id)

        // 1. Primero obtener los documentos asociados para conocer las rutas de los archivos
        const { data: documentos, error: fetchError } = await supabase
          .from("documentos_peticiones")
          .select("*")
          .eq("peticion_id", id)

        if (fetchError) {
          console.error("Error al obtener documentos:", fetchError)
          throw new Error(`Error al obtener documentos: ${fetchError.message}`)
        }

        console.log(`Encontrados ${documentos?.length || 0} documentos para eliminar`)

        // Mostrar información detallada de cada documento para depuración
        if (documentos && documentos.length > 0) {
          documentos.forEach((doc, index) => {
            console.log(`Documento ${index + 1}:`, {
              id: doc.id,
              nombre: doc.nombre,
              ruta: doc.ruta,
              tipo: doc.tipo,
            })
          })

          // 2. Intentar eliminar los archivos del bucket de almacenamiento
          for (const documento of documentos) {
            if (documento.ruta) {
              try {
                // Extraer solo el nombre del archivo sin la ruta
                const nombreArchivo = documento.ruta.split("/").pop()

                // IMPORTANTE: Usar ÚNICAMENTE la subcarpeta "peticiones"
                const rutaCorrecta = `peticiones/${nombreArchivo}`
                console.log(`Intentando eliminar archivo en: ${rutaCorrecta}`)

                const { data, error } = await supabase.storage.from("documentos").remove([rutaCorrecta])

                if (error) {
                  console.log(`Error al eliminar archivo: ${error.message}`)

                  // Si falla, intentar buscar coincidencias en la carpeta peticiones
                  console.log("Buscando coincidencias en la carpeta peticiones...")

                  // Listar archivos en la carpeta peticiones
                  const { data: listaPeticiones, error: errorLista } = await supabase.storage
                    .from("documentos")
                    .list("peticiones")

                  if (!errorLista && listaPeticiones) {
                    // Buscar coincidencias por nombre de archivo
                    const coincidencias = listaPeticiones.filter(
                      (archivo) =>
                        archivo.name === nombreArchivo ||
                        archivo.name.includes(nombreArchivo.split("_")[0]) ||
                        (documento.nombre &&
                          archivo.name.includes(documento.nombre.replace(/\s+/g, "_").toLowerCase())),
                    )

                    console.log(`Encontradas ${coincidencias.length} posibles coincidencias`)

                    // Intentar eliminar cada coincidencia
                    for (const coincidencia of coincidencias) {
                      console.log(`Intentando eliminar coincidencia: peticiones/${coincidencia.name}`)

                      const { error: errorCoincidencia } = await supabase.storage
                        .from("documentos")
                        .remove([`peticiones/${coincidencia.name}`])

                      if (errorCoincidencia) {
                        console.log(`Error al eliminar coincidencia: ${errorCoincidencia.message}`)
                      } else {
                        console.log(`Coincidencia eliminada con éxito: peticiones/${coincidencia.name}`)
                      }
                    }
                  }
                } else {
                  console.log(`Archivo eliminado con éxito: ${rutaCorrecta}`)
                }
              } catch (error) {
                console.error(`Error al procesar la eliminación del archivo:`, error)
              }
            }
          }
        }

        // 3. Eliminar documentos relacionados de la base de datos
        const { error: docsError } = await supabase.from("documentos_peticiones").delete().eq("peticion_id", id)
        if (docsError) {
          console.error("Error al eliminar documentos:", docsError)
          throw new Error(`Error al eliminar documentos: ${docsError.message}`)
        }
        console.log("Documentos eliminados correctamente de la base de datos")

        // 4. Eliminar relaciones en peticiones_temas
        const { error: temasError } = await supabase.from("peticiones_temas").delete().eq("peticiones_id", id)
        if (temasError) {
          console.error("Error al eliminar relaciones de temas:", temasError)
          throw new Error(`Error al eliminar relaciones de temas: ${temasError.message}`)
        }
        console.log("Relaciones de temas eliminadas correctamente")

        // 5. Eliminar relaciones en peticiones_clasificacion
        const { error: clasifError } = await supabase.from("peticiones_clasificacion").delete().eq("peticiones_id", id)
        if (clasifError) {
          console.error("Error al eliminar relaciones de clasificación:", clasifError)
          // Continuamos aunque haya error
        }
        console.log("Relaciones de clasificación eliminadas correctamente")

        // 6. Eliminar relaciones en peticiones_legisladores
        const { error: legisError } = await supabase.from("peticiones_legisladores").delete().eq("peticiones_id", id)
        if (legisError) {
          console.error("Error al eliminar relaciones de legisladores:", legisError)
          // Continuamos aunque haya error
        }
        console.log("Relaciones de legisladores eliminadas correctamente")

        // 7. Eliminar relaciones en peticiones_asesores
        const { error: asesorError } = await supabase.from("peticiones_asesores").delete().eq("peticiones_id", id)
        if (asesorError) {
          console.error("Error al eliminar relaciones de asesores:", asesorError)
          // Continuamos aunque haya error
        }
        console.log("Relaciones de asesores eliminadas correctamente")

        // 8. Eliminar la petición
        const { error: peticionError } = await supabase.from("peticiones").delete().eq("id", id)
        if (peticionError) {
          console.error("Error al eliminar la petición:", peticionError)
          throw new Error(`Error al eliminar la petición: ${peticionError.message}`)
        }
        console.log("Petición eliminada correctamente")

        // Actualizar el estado local para reflejar la eliminación
        setLocalPeticiones((prevPeticiones) => prevPeticiones.filter((p) => p.id !== id))

        // Cerrar el diálogo y actualizar la UI
        setDeleteDialogOpen(false)
        setPeticionToDelete(null)

        notify.success(
          "La petición, sus documentos y archivos asociados han sido eliminados correctamente.",
          "Petición eliminada",
        )

        // Forzar actualización de la interfaz
        router.refresh()
      } catch (error) {
        console.error("Error completo al eliminar la petición:", error)

        notify.error(
          error.message || "Ocurrió un error al eliminar la petición. Por favor, inténtalo de nuevo.",
          "Error al eliminar",
        )
      } finally {
        setIsDeleting(false)
      }
    },
    [supabase, router],
  )

  // Función para abrir el diálogo de confirmación
  const openDeleteDialog = (peticion) => {
    setPeticionToDelete(peticion)
    setDeleteDialogOpen(true)
  }

  // Función para cambiar el ordenamiento
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Si ya estamos ordenando por esta columna, cambiar la dirección
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // Si es una nueva columna, establecerla como columna de ordenamiento
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  // Cambiar de página
  const goToPage = (page) => {
    setCurrentPage(page)
  }

  // Renderizar fila de datos
  const renderTableRow = (peticion) => {
    const fechaAsignacion = peticion.fecha_asignacion ? new Date(peticion.fecha_asignacion) : null
    const fechaLimite = peticion.fecha_limite ? new Date(peticion.fecha_limite) : null

    return (
      <TableRow
        key={peticion.id}
        className="hover:bg-muted/50"
        style={{ backgroundColor: peticion.asesorColor || "transparent" }}
      >
        <TableCell>{peticion.asesorNombre || "-"}</TableCell>
        <TableCell className="font-medium">{peticion.num_peticion || "-"}</TableCell>
        <TableCell>{peticion.clasificacionNombre || "-"}</TableCell>
        <TableCell>{peticion.legislador || "-"}</TableCell>
        <TableCell>{peticion.temaNombre || "-"}</TableCell>
        <TableCell>
          <Popover>
            <PopoverTrigger asChild>
              <div className="flex items-center cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors">
                {peticion.estatusColor ? (
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: peticion.estatusColor }} />
                ) : null}
                <span>{peticion.estatusNombre}</span>
                <ChevronDownIcon className="ml-1 h-3 w-3 opacity-70" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0">
              <Command>
                <CommandInput placeholder="Buscar estatus..." />
                <CommandList>
                  <CommandEmpty>No se encontraron estatus.</CommandEmpty>
                  <CommandGroup>
                    {estatus.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.nombre}
                        onSelect={() => handleUpdateEstatus(peticion.id, item.id)}
                      >
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                          {item.nombre}
                        </div>
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            peticion.peticionEstatus_id === item.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </TableCell>
        <TableCell>{fechaAsignacion ? format(fechaAsignacion, "dd MMMM yyyy", { locale: es }) : "-"}</TableCell>
        <TableCell>{fechaLimite ? format(fechaLimite, "dd MMMM yyyy", { locale: es }) : "-"}</TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewPeticion(peticion.id)}>
                <EyeIcon className="mr-2 h-4 w-4" />
                <span>Ver</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditPeticion(peticion.id)}>
                <EditIcon className="mr-2 h-4 w-4" />
                <span>Editar</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handlePanicButton(peticion)}
                className="text-amber-600 focus:text-amber-600"
                disabled={isSendingReminder}
              >
                <AlertTriangleIcon className="mr-2 h-4 w-4" />
                <span>{isSendingReminder ? "Enviando..." : "Botón de Pánico"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openDeleteDialog(peticion)} className="text-red-600 focus:text-red-600">
                <TrashIcon className="mr-2 h-4 w-4" />
                <span>Eliminar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    )
  }

  // Diálogo de confirmación para eliminar
  return (
    <>
      <div className="space-y-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Filtro de año */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-fit max-w-[200px] truncate">
                  <span className="truncate">{selectedYear === "all" ? "Todos los años" : `Año ${selectedYear}`}</span>
                  <ChevronDownIcon className="ml-2 h-4 w-4 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px]">
                <DropdownMenuItem onClick={() => setSelectedYear("all")}>Todos los años</DropdownMenuItem>
                {years.map((year) => (
                  <DropdownMenuItem key={year} onClick={() => setSelectedYear(year.toString())}>
                    Año {year}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filtro de status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-fit max-w-[200px] truncate">
                  <span className="truncate">
                    {statusOptions.find((option) => option.value === selectedStatus)?.label}
                  </span>
                  <ChevronDownIcon className="ml-2 h-4 w-4 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px]">
                {statusOptions.map((option) => (
                  <DropdownMenuItem key={option.value} onClick={() => setSelectedStatus(option.value)}>
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filtro de asesor */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-fit max-w-[300px] truncate">
                  <span className="truncate">{selectedAsesor === "all" ? "Todos los asesores" : selectedAsesor}</span>
                  <ChevronDownIcon className="ml-2 h-4 w-4 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[300px] max-h-[350px] overflow-y-auto">
                {asesoresOptions.map((option) => (
                  <DropdownMenuItem key={option.value} onClick={() => setSelectedAsesor(option.value)}>
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Búsqueda */}
          <div className="relative w-full sm:w-[300px]">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar peticiones..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Botones para crear nueva petición y agrupar */}
        <div className="flex justify-between">
          <div className="flex gap-2">
            <Button variant={groupByAsesor ? "default" : "outline"} onClick={() => setGroupByAsesor(!groupByAsesor)}>
              {groupByAsesor ? "Desagrupar" : "Agrupar por Asesor"}
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/asesores/colores">Configurar Colores de Asesores</Link>
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Actualizando..." : "Actualizar datos"}
            </Button>
          </div>
          <Button asChild>
            <Link href="/dashboard/peticiones/nueva">Nueva Petición</Link>
          </Button>
        </div>

        {/* Tabla de peticiones */}
        <div className="rounded-md border">
          <div>
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="text-black">Asesor</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 text-black"
                    onClick={() => handleSort("num_peticion")}
                  >
                    Trabajo Asignado
                    {sortColumn === "num_peticion" && (
                      <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </TableHead>
                  <TableHead className="text-black">Clasificación</TableHead>
                  <TableHead className="text-black">Legislador</TableHead>
                  <TableHead className="text-black">Tema</TableHead>
                  <TableHead className="text-black">Estatus</TableHead>
                  <TableHead className="text-black">Fecha Asignación</TableHead>
                  <TableHead className="text-black">Fecha Límite</TableHead>
                  <TableHead className="text-right text-black">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupByAsesor ? (
                  // Mostrar datos agrupados por asesor
                  Object.entries(groupedData).map(([asesor, peticiones]) => (
                    <React.Fragment key={asesor}>
                      {/* Encabezado del grupo */}
                      <TableRow className="bg-gray-800 font-medium text-white hover:bg-[#1d3658] transition-colors duration-200">
                        <TableCell colSpan={9} className="py-2 text-white">
                          {asesor} ({peticiones.length} peticiones)
                        </TableCell>
                      </TableRow>
                      {/* Filas de peticiones */}
                      {peticiones.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="h-12 text-center text-muted-foreground">
                            No hay peticiones para este asesor.
                          </TableCell>
                        </TableRow>
                      ) : (
                        peticiones.map(renderTableRow)
                      )}
                    </React.Fragment>
                  ))
                ) : // Mostrar datos sin agrupar
                sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      No se encontraron resultados.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.ungrouped.map(renderTableRow)
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación - siempre visible */}
          {!groupByAsesor && (
            <div className="flex items-center justify-between bg-white py-4 border-t sticky bottom-0">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">Mostrar</p>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value))
                    setCurrentPage(1) // Resetear a la primera página al cambiar el tamaño
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[5, 10, 20, 30, 40, 50].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">entradas por página</p>
              </div>

              <div className="text-sm text-muted-foreground">
                Mostrando {paginatedData.ungrouped.length} de {sortedData.length} registros
              </div>

              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Página anterior</span>
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                      let pageToShow
                      if (totalPages <= 5) {
                        pageToShow = i + 1
                      } else {
                        let startPage = Math.max(1, currentPage - 2)
                        const endPage = Math.min(totalPages, startPage + 4)
                        if (endPage === totalPages) {
                          startPage = Math.max(1, endPage - 4)
                        }
                        pageToShow = startPage + i
                      }

                      if (pageToShow <= totalPages) {
                        return (
                          <Button
                            key={pageToShow}
                            variant={pageToShow === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageToShow)}
                            className={pageToShow === currentPage ? "bg-[#1a365d] hover:bg-[#15294d]" : ""}
                          >
                            {pageToShow}
                          </Button>
                        )
                      }
                      return null
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Página siguiente</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta petición? Esta acción también eliminará todos los documentos
              asociados y no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => peticionToDelete && handleDeletePeticion(peticionToDelete.id)}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
