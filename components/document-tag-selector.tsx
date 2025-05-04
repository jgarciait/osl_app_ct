"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, Tag, X, PlusCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// Sistema de caché global para etiquetas de documentos
const documentTagsCache = new Map()
const allTagsCache = { data: null, timestamp: 0 }
const CACHE_DURATION = 60000 // 1 minuto en milisegundos

// Función de utilidad para reintentos con retroceso exponencial
async function fetchWithRetry(fetchFn, maxRetries = 3, initialDelay = 1000) {
  let retries = 0
  let delay = initialDelay

  while (retries < maxRetries) {
    try {
      return await fetchFn()
    } catch (error) {
      retries++

      // Si es el último intento, lanzar el error
      if (retries >= maxRetries) {
        throw error
      }

      // Verificar si es un error de "Too Many Requests"
      const isTooManyRequests =
        (error.message && error.message.includes("Too Many R")) ||
        (error instanceof SyntaxError && error.message.includes("Unexpected token"))

      // Si es un error de limitación de tasa, esperar más tiempo
      if (isTooManyRequests) {
        console.log(`Detectada limitación de tasa, reintentando en ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay *= 2 // Retroceso exponencial
      } else {
        // Para otros errores, no esperar tanto
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
  }
}

export function DocumentTagSelector({ documentId, initialTags = [], onTagsChange, readOnly = false }) {
  const supabase = createClientClient()
  const [open, setOpen] = useState(false)
  const [allTags, setAllTags] = useState([])
  const [selectedTags, setSelectedTags] = useState(initialTags)
  const [loading, setLoading] = useState(true)
  const [newTagName, setNewTagName] = useState("")
  const [isCreatingTag, setIsCreatingTag] = useState(false)

  // Usar una ref para rastrear si ya se han cargado las etiquetas para este documento
  const hasLoadedTags = useRef(false)
  // Usar una ref para el ID del documento para comparaciones
  const documentIdRef = useRef(documentId)

  // Cargar todas las etiquetas disponibles - con caché
  useEffect(() => {
    const fetchTags = async () => {
      // Verificar si tenemos datos en caché y si son recientes
      const now = Date.now()
      if (allTagsCache.data && now - allTagsCache.timestamp < CACHE_DURATION) {
        setAllTags(allTagsCache.data)
        return
      }

      setLoading(true)
      try {
        const { data, error } = await supabase.from("etiquetas").select("*").order("nombre")
        if (error) throw error

        // Guardar en caché
        allTagsCache.data = data || []
        allTagsCache.timestamp = now

        setAllTags(data || [])
      } catch (error) {
        console.error("Error al cargar etiquetas:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTags()
  }, [supabase])

  // Función memoizada para cargar etiquetas del documento
  const fetchDocumentTags = useCallback(
    async (docId) => {
      // Verificar si el documentId es un ID temporal (comienza con "temp-")
      const isTemporaryId = typeof docId === "string" && docId.startsWith("temp-")
      if (isTemporaryId || !docId) {
        return initialTags
      }

      // Verificar si tenemos datos en caché para este documento
      if (documentTagsCache.has(docId)) {
        return documentTagsCache.get(docId)
      }

      try {
        // Verificar que el cliente de Supabase esté disponible
        if (!supabase) {
          console.error("Supabase client not initialized")
          return initialTags
        }

        // Usar fetchWithRetry para manejar reintentos automáticamente
        const data = await fetchWithRetry(async () => {
          const response = await supabase
            .from("documento_etiquetas")
            .select(
              `
            etiqueta_id,
            etiquetas (
              id, nombre, color
            )
          `,
            )
            .eq("documento_id", docId)

          // Verificar explícitamente si hay un error
          if (response.error) {
            throw response.error
          }

          // Verificar que la respuesta sea un array
          if (!Array.isArray(response.data)) {
            throw new Error("Formato de respuesta inesperado: " + JSON.stringify(response.data))
          }

          return response.data
        })

        // Procesar los datos solo si son válidos
        if (data && Array.isArray(data)) {
          const tags = data
            .filter((item) => item && item.etiquetas) // Filtrar elementos nulos
            .map((item) => ({
              id: item.etiquetas.id,
              nombre: item.etiquetas.nombre,
              color: item.etiquetas.color,
            }))

          // Guardar en caché
          documentTagsCache.set(docId, tags)

          return tags
        }
      } catch (error) {
        console.error("Error al cargar etiquetas del documento:", error)
      }

      return initialTags
    },
    [supabase, initialTags],
  )

  // Cargar etiquetas del documento si se proporciona un ID - optimizado
  useEffect(() => {
    // Evitar cargar etiquetas si:
    // 1. Ya se han cargado para este documento
    // 2. El ID del documento no ha cambiado
    // 3. Es un ID temporal
    if (hasLoadedTags.current && documentIdRef.current === documentId) {
      return
    }

    // Actualizar las refs
    documentIdRef.current = documentId

    const isTemporaryId = typeof documentId === "string" && documentId.startsWith("temp-")
    if (documentId && !isTemporaryId) {
      setLoading(true)

      fetchDocumentTags(documentId).then((tags) => {
        setSelectedTags(tags)
        if (onTagsChange) onTagsChange(tags)
        hasLoadedTags.current = true
        setLoading(false)
      })
    } else {
      setSelectedTags(initialTags)
    }
  }, [documentId, fetchDocumentTags, initialTags, onTagsChange])

  const handleTagSelect = (tag) => {
    // Verificar si la etiqueta ya está seleccionada
    const isSelected = selectedTags.some((t) => t.id === tag.id)

    let newSelectedTags
    if (isSelected) {
      // Eliminar la etiqueta
      newSelectedTags = selectedTags.filter((t) => t.id !== tag.id)
    } else {
      // Agregar la etiqueta
      newSelectedTags = [...selectedTags, tag]
    }

    setSelectedTags(newSelectedTags)
    if (onTagsChange) onTagsChange(newSelectedTags)

    // Si hay un documentId, actualizar la relación en la base de datos
    if (documentId) {
      updateDocumentTags(tag.id, !isSelected)
    }
  }

  const updateDocumentTags = async (tagId, isAdding) => {
    // Verificar si el documentId es un ID temporal (comienza con "temp-")
    const isTemporaryId = typeof documentId === "string" && documentId.startsWith("temp-")

    // Si es un ID temporal, solo actualizamos el estado local, no la base de datos
    if (isTemporaryId) {
      return
    }

    try {
      await fetchWithRetry(async () => {
        if (isAdding) {
          // Agregar relación
          const { error } = await supabase.from("documento_etiquetas").insert({
            documento_id: documentId,
            etiqueta_id: tagId,
          })
          if (error) throw error

          // Invalidar caché para este documento
          documentTagsCache.delete(documentId)
        } else {
          // Eliminar relación
          const { error } = await supabase
            .from("documento_etiquetas")
            .delete()
            .eq("documento_id", documentId)
            .eq("etiqueta_id", tagId)
          if (error) throw error

          // Invalidar caché para este documento
          documentTagsCache.delete(documentId)
        }
      })
    } catch (error) {
      console.error("Error al actualizar etiquetas del documento:", error)
    }
  }

  const removeTag = (tagId) => {
    if (readOnly) return

    const newSelectedTags = selectedTags.filter((tag) => tag.id !== tagId)
    setSelectedTags(newSelectedTags)
    if (onTagsChange) onTagsChange(newSelectedTags)

    // Si hay un documentId, actualizar la relación en la base de datos
    if (documentId) {
      updateDocumentTags(tagId, false)
    }
  }

  const createNewTag = async () => {
    if (!newTagName.trim()) return

    try {
      setIsCreatingTag(true)

      // Usar color gris claro por defecto
      const defaultColor = "#cfcfcf"

      // Crear la nueva etiqueta en la base de datos usando fetchWithRetry
      const data = await fetchWithRetry(async () => {
        const response = await supabase
          .from("etiquetas")
          .insert({
            nombre: newTagName.trim(),
            color: defaultColor,
          })
          .select()

        if (response.error) throw response.error
        return response.data
      })

      if (data && data.length > 0) {
        // Invalidar caché de todas las etiquetas
        allTagsCache.timestamp = 0

        // Añadir la nueva etiqueta a la lista de todas las etiquetas
        setAllTags((prev) => [...prev, data[0]])

        // Seleccionar automáticamente la nueva etiqueta
        const newTag = data[0]
        handleTagSelect(newTag)

        // Limpiar el campo de entrada
        setNewTagName("")
      }
    } catch (error) {
      console.error("Error al crear etiqueta:", error)
    } finally {
      setIsCreatingTag(false)
    }
  }

  if (readOnly) {
    return (
      <div className="flex flex-wrap gap-1">
        {selectedTags.length === 0 ? (
          <span className="text-sm text-muted-foreground">Sin etiquetas</span>
        ) : (
          selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="flex items-center gap-1 bg-gray-100"
              style={{
                borderColor: tag.color || "#cfcfcf", // Usar #cfcfcf como color por defecto
                color: "#1a365d", // Color de los botones de la app
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tag.color || "#cfcfcf" }}
                aria-hidden="true"
              ></span>
              {tag.nombre}
            </Badge>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="flex flex-col w-full">
            <div className="flex flex-wrap gap-1 p-2 border rounded-md min-h-10">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="flex items-center gap-1 bg-gray-100"
                  style={{
                    borderColor: tag.color || "#cfcfcf", // Usar #cfcfcf como color por defecto
                    color: "#1a365d", // Color de los botones de la app
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tag.color || "#cfcfcf" }}
                    aria-hidden="true"
                  ></span>
                  {tag.nombre}
                  <button
                    type="button"
                    className="ml-1 rounded-full outline-none focus:ring-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeTag(tag.id)
                    }}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Eliminar etiqueta {tag.nombre}</span>
                  </button>
                </Badge>
              ))}
              {selectedTags.length === 0 && (
                <span className="text-sm text-muted-foreground">Haga clic para añadir etiquetas</span>
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <div className="flex items-center border-b px-3">
              <Tag className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <CommandInput
                placeholder="Buscar o crear etiqueta..."
                value={newTagName}
                onValueChange={setNewTagName}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTagName.trim()) {
                    e.preventDefault()
                    createNewTag()
                  }
                }}
              />
            </div>
            <CommandList>
              <CommandEmpty>
                {newTagName.trim() ? (
                  <div className="px-2 py-3 text-sm">
                    <p>No se encontraron etiquetas.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={createNewTag}
                      disabled={isCreatingTag}
                    >
                      {isCreatingTag ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        <>
                          <PlusCircle className="mr-2 h-3 w-3" />
                          Crear "{newTagName}"
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  "No se encontraron etiquetas."
                )}
              </CommandEmpty>
              <CommandGroup>
                {allTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.nombre}
                    onSelect={() => handleTagSelect(tag)}
                    className="flex items-center gap-2"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                      aria-hidden="true"
                    ></div>
                    {tag.nombre}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedTags.some((t) => t.id === tag.id) ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
