"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { createClientClient } from "@/lib/supabase-client"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, FileText, Eye, Upload, Download, X } from "lucide-react"
import { generateExpressionNumber } from "@/lib/utils"
import { format } from "date-fns"
// Corregir la importación del locale español
import { es } from "date-fns/locale"
import dynamic from "next/dynamic"

// Importar react-select de forma dinámica para evitar problemas de carga
const ReactSelect = dynamic(() => import("react-select"), { ssr: false })

// Importar el editor
import { Editor } from "@/components/ui/editor"

// Importar MultiSelect para las clasificaciones
import { MultiSelect } from "@/components/ui/multi-select"

// Con la importación y uso de la función centralizada:
import { logCurrentUserAction } from "@/lib/audit-trail"

// Añadir estos imports al principio del archivo, justo después de los imports existentes
import { Dialog, DialogContent } from "@/components/ui/dialog"

import { DocumentTagSelector } from "@/components/document-tag-selector"

const MONTHS = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
]

// Constantes para validación de archivos
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB en bytes
const ALLOWED_FILE_TYPES = ["application/pdf"]

// Reemplazar la función formatDateToISO con esta versión que tiene en cuenta la zona horaria GMT-4
// Función para formatear la fecha a ISO respetando la zona horaria de Puerto Rico
const formatDateToISO = (date: Date | string): string => {
  try {
    // Asegurarnos de que date sea un objeto Date válido
    const validDate = date instanceof Date ? date : new Date(date)

    // Verificar si la fecha es válida
    if (isNaN(validDate.getTime())) {
      console.error("Fecha inválida:", date)
      return null
    }

    // Crear fecha en formato ISO con T12:00:00-04:00 (mediodía en Puerto Rico)
    const year = validDate.getFullYear()
    const month = validDate.getMonth()
    const day = validDate.getDate()

    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00-04:00`
  } catch (error) {
    console.error("Error al formatear fecha:", error)
    return null
  }
}

// Función para parsear correctamente fechas ISO de la base de datos
const parseISODate = (isoString) => {
  if (!isoString) return null

  try {
    // Crear una fecha a partir del string ISO
    const date = new Date(isoString)

    // Verificar si la fecha es válida
    if (isNaN(date.getTime())) {
      console.error("Fecha ISO inválida:", isoString)
      return null
    }

    // Extraer año, mes y día de la fecha ISO
    const parts = isoString.split("T")[0].split("-")
    const year = Number.parseInt(parts[0], 10)
    const month = Number.parseInt(parts[1], 10) - 1 // Meses en JS son 0-11
    const day = Number.parseInt(parts[2], 10)

    // Crear una nueva fecha con la hora fijada a mediodía para evitar problemas de zona horaria
    return new Date(year, month, day, 12, 0, 0)
  } catch (error) {
    console.error("Error al parsear fecha ISO:", error)
    return null
  }
}

// Modificar la definición de props para incluir useAvailableNumber
export function ExpresionForm({
  expresion,
  comites = [],
  temas = [],
  clasificaciones = [],
  currentYear = new Date().getFullYear(),
  nextSequence = 1,
  selectedComiteIds = [],
  selectedClasificacionIds = [],
  isEditing = false,
  readOnly = false,
  useAvailableNumber = false,
  pathname = "",
}) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTema, setSelectedTema] = useState(expresion?.tema || null)
  const [selectedYear, setSelectedYear] = useState(expresion?.ano || currentYear)
  const [selectedComites, setSelectedComites] = useState(selectedComiteIds)
  const [selectedClasificaciones, setSelectedClasificaciones] = useState(selectedClasificacionIds || [])
  const [formData, setFormData] = useState({
    ano: expresion?.ano || currentYear,
    mes: expresion?.mes || new Date().getMonth() + 1,
    numero: expresion?.numero || generateExpressionNumber(currentYear, nextSequence),
    fecha_recibido: expresion?.fecha_recibido ? parseISODate(expresion.fecha_recibido) : new Date(),
    nombre: expresion?.nombre || "",
    email: expresion?.email || "",
    propuesta: expresion?.propuesta || "",
    tramite: expresion?.tramite || "",
    respuesta: expresion?.respuesta ? parseISODate(expresion.respuesta) : null,
    notas: expresion?.notas || "",
    archivado: expresion?.archivado || false,
    tema: expresion?.tema || null,
    sequence: expresion?.sequence || nextSequence, // Aseguramos que sequence tenga un valor
  })

  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [uploadProgress, setUploadProgress] = useState({})
  const [existingDocuments, setExistingDocuments] = useState([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [documentTags, setDocumentTags] = useState({})

  // Añadir un nuevo estado para controlar el modal del visor de PDF
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false)
  const [currentPdfUrl, setCurrentPdfUrl] = useState("")

  // Primero, añadir un estado para rastrear el tab activo después de las declaraciones de estado existentes (alrededor de la línea 70):
  const [activeTab, setActiveTab] = useState("informacion")

  // Primero, añadir un estado para almacenar el ID del usuario actual después de las declaraciones de estado existentes (alrededor de la línea 70):
  const [userId, setUserId] = useState(null)

  // Convertir comités a formato de opciones para el MultiSelect
  const comitesOptions = comites.map((comite) => ({
    value: comite.id,
    label: `${comite.nombre} (${comite.tipo === "senado" ? "Senado" : "Cámara"})`,
  }))

  // Convertir clasificaciones a formato de opciones para el MultiSelect
  const clasificacionesOptions = clasificaciones.map((clasificacion) => ({
    value: clasificacion.id,
    label: clasificacion.nombre,
  }))

  // Verificar que el cliente de Supabase esté disponible
  useEffect(() => {
    if (!supabase) {
      console.error("Supabase client not initialized")
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: "No se pudo establecer conexión con la base de datos. Intente recargar la página.",
      })
    }
  }, [supabase, toast])

  // Cargar documentos existentes cuando estamos en modo edición o solo lectura
  useEffect(() => {
    if ((isEditing || readOnly) && expresion?.id) {
      fetchExistingDocuments(expresion.id)
    }
  }, [isEditing, readOnly, expresion?.id])

  // Efecto para actualizar el número de expresión cuando cambia el tema o el año
  useEffect(() => {
    if (isEditing) return // No actualizar el número si estamos editando

    // Buscar la abreviatura del tema seleccionado
    const temaSeleccionado = temas.find((tema) => tema.id === selectedTema)
    const abreviatura = temaSeleccionado?.abreviatura || "RNAR"

    // Generar el nuevo número de expresión
    const nuevoNumero = generateExpressionNumber(selectedYear, nextSequence, abreviatura)

    // Actualizar el estado del formulario
    setFormData((prev) => ({
      ...prev,
      numero: nuevoNumero,
      ano: selectedYear,
      sequence: nextSequence, // Aseguramos que sequence se actualice también
    }))
  }, [selectedTema, selectedYear, temas, nextSequence, isEditing])

  // Añadir un useEffect para obtener el ID del usuario actual después de los otros useEffects:
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()
        if (error) throw error
        if (user) {
          setUserId(user.id)
        }
      } catch (error) {
        console.error("Error al obtener el usuario:", error)
      }
    }

    fetchUserId()
  }, [supabase])

  // Función para obtener los documentos existentes
  const fetchExistingDocuments = async (expresionId) => {
    setLoadingDocuments(true)
    try {
      // Obtener documentos y etiquetas en una sola consulta
      const { data: documentosData, error: documentosError } = await supabase
        .from("documentos")
        .select("*")
        .eq("expresion_id", expresionId)

      if (documentosError) throw documentosError

      // Si no hay documentos, terminar temprano
      if (!documentosData || documentosData.length === 0) {
        setExistingDocuments([])
        setDocumentTags({})
        return
      }

      setExistingDocuments(documentosData)

      // Obtener todas las etiquetas de todos los documentos en una sola consulta
      const documentIds = documentosData.map((doc) => doc.id)
      const { data: allTagsData, error: allTagsError } = await supabase
        .from("documento_etiquetas")
        .select(`
          documento_id,
          etiquetas (
            id, nombre, color
          )
        `)
        .in("documento_id", documentIds)

      if (allTagsError) throw allTagsError

      // Organizar las etiquetas por documento
      const tagsMap = {}
      documentIds.forEach((docId) => {
        tagsMap[docId] = []
      })

      // Agrupar las etiquetas por documento_id
      allTagsData.forEach((item) => {
        if (item.etiquetas) {
          const docId = item.documento_id
          const tag = {
            id: item.etiquetas.id,
            nombre: item.etiquetas.nombre,
            color: item.etiquetas.color,
          }

          if (tagsMap[docId]) {
            tagsMap[docId].push(tag)
          }
        }
      })

      setDocumentTags(tagsMap)
    } catch (error) {
      console.error("Error fetching documents:", error)
      toast({
        variant: "destructive",
        title: "Error al cargar documentos",
        description: "No se pudieron cargar los documentos asociados a esta expresión.",
      })
    } finally {
      setLoadingDocuments(false)
    }
  }

  // Mantener las declaraciones de estado existentes...

  // Añadir refs para las suscripciones
  const realtimeSubscriptions = useRef([])

  // Función para limpiar suscripciones
  const cleanupRealtimeSubscriptions = () => {
    realtimeSubscriptions.current.forEach((subscription) => subscription.unsubscribe())
    realtimeSubscriptions.current = []
  }

  // Añadir este useEffect para configurar suscripciones en tiempo real
  useEffect(() => {
    if (isEditing && expresion?.id) {
      // Configurar suscripciones en tiempo real para los documentos y etiquetas
      const setupDocumentSubscriptions = () => {
        // Limpiar suscripciones existentes
        cleanupRealtimeSubscriptions()

        // Suscribirse a cambios en documentos relacionados con esta expresión
        const documentosSubscription = supabase
          .channel(`documentos-expresion-${expresion.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "documentos",
              filter: `expresion_id=eq.${expresion.id}`,
            },
            (payload) => {
              console.log("Cambio en documentos de la expresión:", payload)

              if (payload.eventType === "INSERT") {
                // Check if document already exists in the list before adding it
                setExistingDocuments((prev) => {
                  // Check if this document is already in the list (avoid duplicates)
                  const documentExists = prev.some((doc) => doc.id === payload.new.id)
                  if (documentExists) {
                    return prev // Don't add it again
                  }
                  return [...prev, payload.new]
                })
              } else if (payload.eventType === "UPDATE") {
                // Actualizar documento existente
                setExistingDocuments((prev) => prev.map((doc) => (doc.id === payload.new.id ? payload.new : doc)))
              } else if (payload.eventType === "DELETE") {
                // Eliminar documento
                setExistingDocuments((prev) => prev.filter((doc) => doc.id !== payload.old.id))

                // También eliminar las etiquetas asociadas
                const newTagsMap = { ...documentTags }
                delete newTagsMap[payload.old.id]
                setDocumentTags(newTagsMap)
              }
            },
          )
          .subscribe()

        // Suscribirse a cambios en etiquetas de documentos
        const documentEtiquetasSubscription = supabase
          .channel(`documento-etiquetas-changes`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "documento_etiquetas",
            },
            (payload) => {
              console.log("Cambio en etiquetas de documentos:", payload)

              // Recargar las etiquetas si hay cambios
              // Esto es simplificado, idealmente deberías actualizar solo las etiquetas afectadas
              if (
                existingDocuments.some(
                  (doc) => doc.id === payload.new?.documento_id || doc.id === payload.old?.documento_id,
                )
              ) {
                fetchExistingDocuments(expresion.id)
              }
            },
          )
          .subscribe()

        // Guardar referencias a las suscripciones
        realtimeSubscriptions.current = [documentosSubscription, documentEtiquetasSubscription]
      }

      setupDocumentSubscriptions()
    }

    // Limpiar suscripciones al desmontar
    return () => {
      cleanupRealtimeSubscriptions()
    }
  }, [isEditing, expresion?.id, supabase, existingDocuments, documentTags])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Modificar la función handleDateChange para asegurar que se guarde la fecha correcta

  const handleDateChange = (date: Date | undefined, fieldName = "fecha_recibido") => {
    if (!date) return

    try {
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        console.error("Fecha inválida:", date)
        return
      }

      // Crear una fecha a mediodía para evitar problemas de zona horaria
      const fechaAjustada = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)

      // Actualizar el estado con la nueva fecha
      setFormData((prev) => ({
        ...prev,
        [fieldName]: fechaAjustada,
      }))
    } catch (error) {
      console.error("Error al cambiar fecha:", error)
    }
  }

  const handleYearChange = (year) => {
    const yearValue = Number.parseInt(year, 10)
    setSelectedYear(yearValue)
    setFormData((prev) => ({ ...prev, ano: yearValue }))
  }

  const handleTemaChange = (selected) => {
    setSelectedTema(selected ? selected.value : null)
    setFormData((prev) => ({ ...prev, tema: selected ? selected.value : null }))
  }

  const handleComitesChange = (selected) => {
    setSelectedComites(selected)
  }

  const handleClasificacionesChange = (selected) => {
    setSelectedClasificaciones(selected)
  }

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || [])

    // Validar tamaño y tipo de archivo
    const validFiles = selectedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          variant: "destructive",
          title: "Archivo demasiado grande",
          description: `El archivo ${file.name} excede el límite de 50MB.`,
        })
        return false
      }

      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Tipo de archivo no permitido",
          description: `Solo se permiten archivos PDF.`,
        })
        return false
      }

      return true
    })

    setFiles((prev) => [...prev, ...validFiles])
  }

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleTagsChange = (documentId, tags) => {
    setDocumentTags((prev) => ({
      ...prev,
      [documentId]: tags,
    }))
  }

  // También necesitamos modificar la función uploadFiles para almacenar la ruta correcta en la base de datos
  // en lugar de la URL pública que no funcionará
  // Función para eliminar acentos y caracteres especiales de un string
  const removeAccents = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  }

  // Modificar la parte donde se obtiene la URL y se guarda en la base de datos
  // Modificar la función uploadFiles para garantizar que siempre trabaje con un string:

  const uploadFiles = async (expresionId) => {
    if (files.length === 0) return []

    setUploading(true)
    const uploadedDocs = []

    try {
      // Asegurar que expresionId sea un string
      const expresionIdString = String(expresionId)

      console.log("Subiendo archivos para expresión ID:", expresionIdString)

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const originalFileName = file.name
        // Sanitizar el nombre del archivo para el almacenamiento
        const sanitizedFileName = removeAccents(file.name)
        const fileName = `${Date.now()}_${sanitizedFileName}`
        const filePath = `expresiones/${expresionIdString}/${fileName}`

        // Inicializar progreso
        setUploadProgress((prev) => ({
          ...prev,
          [i]: 1, // Comenzar con 1% para mostrar que ha iniciado
        }))

        // Simular progreso de carga (en una aplicación real, esto vendría del evento de progreso)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            const currentProgress = prev[i] || 0
            // Incrementar hasta 90% máximo (el 100% se establece cuando se completa)
            return {
              ...prev,
              [i]: currentProgress < 90 ? currentProgress + 5 : currentProgress,
            }
          })
        }, 200)

        // Subir archivo a Supabase Storage
        const { data, error } = await supabase.storage.from("documentos").upload(filePath, file)

        clearInterval(progressInterval)

        if (error) throw error

        // Registrar documento en la base de datos con la ruta del archivo en lugar de la URL
        // y el nombre original con acentos
        const { data: docData, error: docError } = await supabase
          .from("documentos")
          .insert({
            expresion_id: expresionId,
            nombre: originalFileName, // Guardar el nombre original con acentos
            ruta: filePath, // Guardar la ruta del archivo en lugar de la URL
            tipo: file.type,
            tamano: file.size,
          })
          .select()

        if (docError) throw docError

        uploadedDocs.push(docData[0])

        // Actualizar progreso a 100%
        setUploadProgress((prev) => ({
          ...prev,
          [i]: 100,
        }))
      }

      // Limpiar la lista de archivos después de una carga exitosa
      setFiles([])
      setUploadProgress({})

      return uploadedDocs
    } catch (error) {
      console.error("Error uploading files:", error)
      toast({
        variant: "destructive",
        title: "Error al subir archivos",
        description: "Hubo un problema al subir los documentos. Intente nuevamente.",
      })
      return []
    } finally {
      setUploading(false)
    }
  }

  // Añadir una función para abrir el visor de PDF
  const openPdfViewer = (url) => {
    setCurrentPdfUrl(url)
    setPdfViewerOpen(true)
  }

  const deleteDocument = async (documentId) => {
    try {
      // Primero obtener la información del documento para conocer su ruta
      const { data: docData, error: docQueryError } = await supabase
        .from("documentos")
        .select("ruta")
        .eq("id", documentId)
        .single()

      if (docQueryError) throw docQueryError

      // Eliminar el archivo del bucket de almacenamiento
      if (docData && docData.ruta) {
        const { error: storageError } = await supabase.storage.from("documentos").remove([docData.ruta])

        if (storageError) {
          console.error(`Error eliminando archivo ${docData.ruta} del bucket:`, storageError)
          // Continuamos con el proceso aunque haya errores en la eliminación de archivos
        }
      }

      // Eliminar las relaciones con etiquetas
      const { error: tagError } = await supabase.from("documento_etiquetas").delete().eq("documento_id", documentId)

      if (tagError) throw tagError

      // Luego eliminar el documento
      const { error } = await supabase.from("documentos").delete().eq("id", documentId)

      if (error) throw error

      // Actualizar la lista de documentos
      setExistingDocuments((prev) => prev.filter((doc) => doc.id !== documentId))

      // Eliminar las etiquetas del documento del estado
      const newTagsMap = { ...documentTags }
      delete newTagsMap[documentId]
      setDocumentTags(newTagsMap)

      toast({
        title: "Documento eliminado",
        description: "El documento ha sido eliminado correctamente.",
      })
    } catch (error) {
      console.error("Error deleting document:", error)
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: "No se pudo eliminar el documento. Intente nuevamente.",
      })
    }
  }

  const handleEditorChange = (content) => {
    setFormData((prev) => ({ ...prev, propuesta: content }))
  }

  // Función para obtener el próximo número de secuencia de forma atómica
  // Reemplazar la función getNextSequenceNumber con esta versión que solo usa el método de respaldo
  const getNextSequenceNumber = async () => {
    try {
      // Obtener el valor actual con un bloqueo para actualización
      const { data: currentData, error: fetchError } = await supabase
        .from("secuencia")
        .select("valor, updated_at")
        .eq("id", "next_sequence")
        .single()

      if (fetchError) throw fetchError

      const currentSequence = Number.parseInt(currentData.valor, 10)
      const nextSeq = currentSequence + 1

      // Actualizar el valor usando el updated_at como condición para evitar conflictos
      const { error: updateError } = await supabase
        .from("secuencia")
        .update({
          valor: String(nextSeq),
          updated_at: new Date().toISOString(),
        })
        .eq("id", "next_sequence")
        .eq("updated_at", currentData.updated_at)

      if (updateError) {
        // Si hay un error de concurrencia, esperar un momento y reintentar
        await new Promise((resolve) => setTimeout(resolve, 100))
        return getNextSequenceNumber() // Reintentar recursivamente
      }

      return currentSequence
    } catch (error) {
      console.error("Error al obtener número de secuencia:", error)
      // Si todo falla, usar el nextSequence proporcionado como prop
      return nextSequence
    }
  }

  // Eliminar la función fallbackGetNextSequence ya que ahora está integrada en getNextSequenceNumber

  // Añadir una función para registrar acciones en el audit trail después de las funciones existentes:
  // Actualizar la función logAuditTrail para usar la función del archivo lib/audit-trail.ts

  // Reemplazar la función logAuditTrail existente:
  const logAuditTrail = async (action) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error("No se pudo registrar la acción: No hay usuario autenticado")
        return
      }

      const { error } = await supabase.from("audit_trail_expresiones").insert({
        user_id: user.id,
        action: action,
      })

      if (error) {
        console.error("Error al registrar acción en audit trail:", error)
      }
    } catch (error) {
      console.error("Error al registrar acción en audit trail:", error)
    }
  }

  // Modificar la función handleSubmit para manejar números disponibles
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validar campos requeridos
      if (!formData.nombre || !formData.tema) {
        toast({
          title: "Error",
          description: "Por favor complete todos los campos requeridos: nombre y tema",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Preparar datos para enviar
      let dataToSubmit = {
        ...formData,
        // Si hay fecha_recibido, asegurarse de que se guarde correctamente
        fecha_recibido:
          formData.fecha_recibido && !isNaN(new Date(formData.fecha_recibido).getTime())
            ? formatDateToISO(formData.fecha_recibido)
            : null,
        respuesta:
          formData.respuesta && !isNaN(new Date(formData.respuesta).getTime())
            ? formatDateToISO(formData.respuesta)
            : null,
      }

      let expresionId

      if (isEditing && expresion?.id) {
        // Actualizar la expresión existente
        const { error } = await supabase.from("expresiones").update(dataToSubmit).eq("id", expresion.id)

        if (error) throw error

        expresionId = expresion.id

        // Actualizar las relaciones con los comités
        await supabase.from("expresion_comites").delete().eq("expresion_id", expresion.id)

        for (const comiteId of selectedComites) {
          await supabase.from("expresion_comites").insert({
            expresion_id: expresion.id,
            comite_id: comiteId,
          })
        }

        // Actualizar las relaciones con las clasificaciones
        await supabase.from("expresion_clasificaciones").delete().eq("expresion_id", expresion.id)

        for (const clasificacionId of selectedClasificaciones) {
          await supabase.from("expresion_clasificaciones").insert({
            expresion_id: expresion.id,
            clasificacion_id: clasificacionId,
          })
        }

        toast({
          title: "Expresión actualizada",
          description: "La expresión ha sido actualizada exitosamente",
        })

        // Registrar la acción en el audit trail
        if (formData.numero) {
          await logCurrentUserAction(`Expresión Actualizada: ${formData.numero}`)
        }
      } else {
        // Si estamos usando un número disponible, no necesitamos obtener un nuevo número de secuencia
        if (useAvailableNumber && expresion?.sequence && expresion?.numero) {
          // Usar los valores proporcionados sin alterar la tabla de secuencia
          dataToSubmit = {
            ...dataToSubmit,
            sequence: expresion.sequence,
            numero: expresion.numero,
          }
        } else {
          // Si estamos creando una nueva expresión normal, obtener el próximo número de secuencia
          const secuenciaActual = await getNextSequenceNumber()

          // Buscar la abreviatura del tema seleccionado
          const temaSeleccionado = temas.find((tema) => tema.id === selectedTema)
          const abreviatura = temaSeleccionado?.abreviatura || "RNAR"

          // Generar el número de expresión con la secuencia obtenida
          const numeroExpresion = generateExpressionNumber(selectedYear, secuenciaActual, abreviatura)

          // Actualizar los datos a enviar con la secuencia y número correctos
          dataToSubmit = {
            ...dataToSubmit,
            sequence: secuenciaActual,
            numero: numeroExpresion,
          }
        }

        // Crear una nueva expresión
        const { data, error } = await supabase.from("expresiones").insert(dataToSubmit).select()

        if (error) throw error

        expresionId = data[0].id

        // Crear las relaciones con los comités
        for (const comiteId of selectedComites) {
          await supabase.from("expresion_comites").insert({
            expresion_id: data[0].id,
            comite_id: comiteId,
          })
        }

        // Crear las relaciones con las clasificaciones
        for (const clasificacionId of selectedClasificaciones) {
          await supabase.from("expresion_clasificaciones").insert({
            expresion_id: data[0].id,
            clasificacion_id: clasificacionId,
          })
        }

        toast({
          title: "Expresión creada",
          description: "La expresión ha sido creada exitosamente",
        })

        // Registrar la acción en el audit trail
        if (dataToSubmit.numero) {
          await logCurrentUserAction(`Expresión Creada: ${dataToSubmit.numero}`)
        }
      }

      // Subir archivos si hay alguno y no han sido subidos previamente
      if (files.length > 0) {
        // Verificar si hay archivos que no tienen progreso de carga al 100%
        const filesNeedingUpload = files.some((_, index) => uploadProgress[index] !== 100)

        if (filesNeedingUpload) {
          const uploadedDocs = await uploadFiles(expresionId.toString())

          // Guardar las etiquetas para los documentos recién subidos
          for (const doc of uploadedDocs) {
            if (documentTags[doc.id] && documentTags[doc.id].length > 0) {
              for (const tag of documentTags[doc.id]) {
                await supabase.from("documento_etiquetas").insert({
                  documento_id: doc.id,
                  etiqueta_id: tag.id,
                })
              }
            }
          }
        }
      }

      // Guardar las etiquetas para los documentos existentes
      for (const docId in documentTags) {
        // Primero eliminar todas las etiquetas existentes
        await supabase.from("documento_etiquetas").delete().eq("documento_id", docId)

        // Luego insertar las nuevas etiquetas
        if (documentTags[docId] && documentTags[docId].length > 0) {
          for (const tag of documentTags[docId]) {
            await supabase.from("documento_etiquetas").insert({
              documento_id: docId,
              etiqueta_id: tag.id,
            })
          }
        }
      }

      if (!isEditing) {
        // Si estamos creando una nueva expresión, actualizar la URL y cambiar a modo edición
        router.push(`/dashboard/expresiones/${expresionId}/editar`)
        // Actualizar el estado local para reflejar que ahora estamos en modo edición
        isEditing = true
        expresion = { ...dataToSubmit, id: expresionId }
      } else {
        // Si estamos editando, solo refrescar la página actual sin redirigir
        toast({
          title: "Expresión actualizada",
          description: "La expresión ha sido actualizada exitosamente. Permaneciendo en la página actual.",
        })
      }
      router.refresh()
    } catch (error) {
      console.error("Error saving expression:", error)
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error.message || "Ocurrió un error al guardar la expresión",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={readOnly ? (e) => e.preventDefault() : handleSubmit} className="space-y-6">
      <Tabs defaultValue="informacion" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="informacion">Información</TabsTrigger>
          <TabsTrigger value="tramite">Trámite y Respuesta</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="informacion" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Expresión Ciudadana</CardTitle>
              <CardDescription>Datos básicos de la expresión ciudadana</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primera fila: Tema, Clasificación y Fecha Recibido */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Tema */}
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <div className="relative">
                    {typeof window !== "undefined" && (
                      <ReactSelect
                        name="tema"
                        placeholder="Seleccionar tema..."
                        className="w-full"
                        classNamePrefix="select"
                        options={temas.map((tema) => ({
                          value: tema.id,
                          label: `${tema.nombre} (${tema.abreviatura || "Sin abreviatura"})`,
                          data: {
                            nombre: tema.nombre,
                            abreviatura: tema.abreviatura,
                          },
                        }))}
                        value={
                          selectedTema
                            ? {
                                value: selectedTema,
                                label: temas.find((t) => t.id === selectedTema)
                                  ? `${temas.find((t) => t.id === selectedTema).nombre} (${
                                      temas.find((t) => t.id === selectedTema).abreviatura || "Sin abreviatura"
                                    })`
                                  : selectedTema,
                              }
                            : null
                        }
                        onChange={handleTemaChange}
                        isSearchable={true}
                        isClearable={true}
                        isDisabled={readOnly}
                        styles={{
                          control: (base) => ({
                            ...base,
                            backgroundColor: readOnly ? "#f3f4f6" : "white",
                            borderColor: readOnly ? "transparent" : "hsl(var(--input))",
                            "&:hover": {
                              borderColor: readOnly ? "transparent" : "hsl(var(--input))",
                            },
                            padding: "2px",
                          }),
                          singleValue: (base) => ({
                            ...base,
                            color: readOnly ? "#000000" : "black",
                          }),
                          menu: (base) => ({
                            ...base,
                            backgroundColor: "white",
                            zIndex: 50,
                          }),
                          option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isSelected
                              ? "hsl(var(--primary))"
                              : state.isFocused
                                ? "hsl(var(--accent))"
                                : "white",
                            color: state.isSelected ? "white" : "black",
                            "&:hover": {
                              backgroundColor: state.isSelected ? "hsl(var(--primary))" : "hsl(var(--accent))",
                            },
                          }),
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Clasificación */}
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <MultiSelect
                    options={clasificacionesOptions}
                    selected={selectedClasificaciones}
                    onChange={handleClasificacionesChange}
                    placeholder="Seleccionar notas..."
                    disabled={readOnly}
                    className={readOnly ? "bg-[#f3f4f6] text-black" : ""}
                  />
                </div>

                {/* Fecha Recibido - Movido a la primera fila */}
                <div className="space-y-2">
                  <Label htmlFor="fecha_recibido">Fecha Recibido</Label>
                  <Popover disabled={readOnly}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${
                          readOnly ? "bg-[#f3f4f6] text-black border-0" : ""
                        }`}
                        disabled={readOnly}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.fecha_recibido && !isNaN(new Date(formData.fecha_recibido).getTime()) ? (
                          format(formData.fecha_recibido, "PPP", { locale: es })
                        ) : (
                          <span>Seleccione fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
                      <Calendar
                        mode="single"
                        selected={formData.fecha_recibido}
                        onSelect={(date) => handleDateChange(date)}
                        initialFocus
                        disabled={readOnly}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Segunda fila: Año, Mes y Número */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="ano">Año</Label>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={handleYearChange}
                    disabled={isEditing || readOnly}
                    className={readOnly ? "bg-[#f3f4f6]" : ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione año" />
                    </SelectTrigger>
                    <SelectContent>
                      {[currentYear - 3, currentYear - 2, currentYear - 1, currentYear].map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mes">Mes</Label>
                  <Select
                    value={formData.mes.toString()}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, mes: Number.parseInt(value, 10) }))}
                    disabled={readOnly}
                    className={readOnly ? "bg-[#f3f4f6]" : ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isEditing && (
                  <div className="space-y-2">
                    <Label htmlFor="numero">Número</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="numero"
                        name="numero"
                        value={formData.numero}
                        onChange={handleInputChange}
                        disabled
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            // Obtener el año actual de la expresión
                            const year = formData.ano

                            // Obtener todas las expresiones para este año
                            const { data: expresiones, error: expresionesError } = await supabase
                              .from("expresiones")
                              .select("sequence, numero")
                              .eq("ano", year)
                              .order("sequence", { ascending: true })

                            if (expresionesError) throw expresionesError

                            // Si no hay expresiones, mostrar mensaje
                            if (!expresiones || expresiones.length === 0) {
                              toast({
                                variant: "destructive",
                                title: "No hay expresiones",
                                description: `No hay expresiones para el año ${year}. No se pueden encontrar números disponibles.`,
                              })
                              return
                            }

                            // Buscar el tema actual
                            const temaSeleccionado = temas.find((tema) => tema.id === selectedTema)
                            if (!temaSeleccionado) {
                              toast({
                                variant: "destructive",
                                title: "Tema no encontrado",
                                description: "Por favor seleccione un tema válido.",
                              })
                              return
                            }

                            const abreviatura = temaSeleccionado.abreviatura || "RNAR"

                            // Encontrar huecos en la secuencia
                            const sortedExpresiones = [...expresiones].sort((a, b) => a.sequence - b.sequence)
                            const maxSequence = sortedExpresiones[sortedExpresiones.length - 1].sequence
                            const existingSequences = new Set(sortedExpresiones.map((exp) => exp.sequence))

                            // Buscar huecos desde 1 hasta maxSequence
                            const gaps = []
                            for (let i = 1; i < maxSequence; i++) {
                              if (!existingSequences.has(i)) {
                                const sequenceStr = i.toString().padStart(4, "0")
                                const numeroExpresion = `${year}-${sequenceStr}-${abreviatura}`
                                gaps.push({
                                  sequence: i,
                                  numero: numeroExpresion,
                                })
                              }
                            }

                            if (gaps.length === 0) {
                              toast({
                                variant: "warning",
                                title: "No hay números disponibles",
                                description: `No se encontraron números disponibles para el año ${year} y tema ${temaSeleccionado.nombre}.`,
                              })
                              return
                            }

                            // Mostrar diálogo para seleccionar número
                            const options = gaps.map((gap) => ({
                              label: gap.numero,
                              value: JSON.stringify(gap),
                            }))

                            // Usar un diálogo personalizado o una biblioteca de diálogos
                            // Por simplicidad, usaremos un prompt nativo
                            const selectedOption = window.prompt(
                              `Seleccione un número disponible (${options.length} disponibles):
${options.map((opt, idx) => `${idx + 1}. ${opt.label}`).join("\n")}
Ingrese el número de la opción (1-${options.length}):`,
                              "1",
                            )

                            if (!selectedOption) return

                            const optionIndex = Number.parseInt(selectedOption, 10) - 1
                            if (isNaN(optionIndex) || optionIndex < 0 || optionIndex >= options.length) {
                              toast({
                                variant: "destructive",
                                title: "Opción inválida",
                                description: "Por favor seleccione una opción válida.",
                              })
                              return
                            }

                            const selectedGap = JSON.parse(options[optionIndex].value)

                            // Actualizar el formulario con el nuevo número y secuencia
                            setFormData((prev) => ({
                              ...prev,
                              numero: selectedGap.numero,
                              sequence: selectedGap.sequence,
                            }))

                            toast({
                              title: "Número actualizado",
                              description: `El número de expresión ha sido actualizado a ${selectedGap.numero}.`,
                            })
                          } catch (error) {
                            console.error("Error al buscar números disponibles:", error)
                            toast({
                              variant: "destructive",
                              title: "Error",
                              description: "Ocurrió un error al buscar números disponibles. Intente nuevamente.",
                            })
                          }
                        }}
                        className="whitespace-nowrap"
                      >
                        Cambiar Número
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Tercera fila: Nombre y Email */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    required
                    disabled={readOnly}
                    style={readOnly ? { backgroundColor: "#f3f4f6", color: "#000000" } : {}}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={readOnly}
                    style={readOnly ? { backgroundColor: "#f3f4f6", color: "#000000" } : {}}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="propuesta">Propuesta o Resumen</Label>
                <Editor
                  initialContent={formData.propuesta}
                  onChange={handleEditorChange}
                  placeholder="Escriba aquí la propuesta o resumen..."
                  readOnly={readOnly}
                  className={readOnly ? "bg-[#f3f4f6]" : ""}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tramite" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Trámite y Respuesta</CardTitle>
              <CardDescription>Información sobre el trámite y respuesta a la expresión</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Referidos</Label>
                  <div className="relative">
                    {typeof window !== "undefined" && (
                      <ReactSelect
                        isMulti
                        name="comites"
                        placeholder="Seleccionar comisiones, legisladores u oficinas"
                        className="w-full"
                        classNamePrefix="select"
                        options={comitesOptions.map((comite) => ({
                          value: comite.value,
                          label: comite.label,
                        }))}
                        value={
                          selectedComites
                            ? comitesOptions
                                .filter((comite) => selectedComites.includes(comite.value))
                                .map((comite) => ({
                                  value: comite.value,
                                  label: comite.label,
                                }))
                            : null
                        }
                        onChange={(selectedOptions) => {
                          const selectedValues = selectedOptions ? selectedOptions.map((option) => option.value) : []
                          handleComitesChange(selectedValues)
                        }}
                        isSearchable={true}
                        isDisabled={readOnly}
                        styles={{
                          control: (base) => ({
                            ...base,
                            backgroundColor: readOnly ? "#f3f4f6" : "white",
                            borderColor: readOnly ? "transparent" : "hsl(var(--input))",
                            "&:hover": {
                              borderColor: readOnly ? "transparent" : "hsl(var(--input))",
                            },
                            padding: "2px",
                          }),
                          singleValue: (base) => ({
                            ...base,
                            color: readOnly ? "#000000" : "black",
                          }),
                          menu: (base) => ({
                            ...base,
                            backgroundColor: "white",
                            zIndex: 50,
                          }),
                          option: (base, state) => ({
                            ...base,
                            backgroundColor: state.isSelected
                              ? "hsl(var(--primary))"
                              : state.isFocused
                                ? "hsl(var(--accent))"
                                : "white",
                            color: state.isSelected ? "white" : "black",
                            "&:hover": {
                              backgroundColor: state.isSelected ? "hsl(var(--primary))" : "hsl(var(--accent))",
                            },
                          }),
                        }}
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="respuesta">Fecha de Respuesta</Label>
                  <Popover disabled={readOnly}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${
                          readOnly ? "bg-[#f3f4f6] text-black border-0" : ""
                        }`}
                        disabled={readOnly}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.respuesta && !isNaN(new Date(formData.respuesta).getTime()) ? (
                          format(formData.respuesta, "PPP", { locale: es })
                        ) : (
                          <span>Sin respuesta</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
                      <Calendar
                        mode="single"
                        selected={formData.respuesta}
                        onSelect={(date) => handleDateChange(date, "respuesta")}
                        initialFocus
                        disabled={readOnly}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Comentarios</Label>
                <Textarea
                  id="notas"
                  name="notas"
                  value={formData.notas}
                  onChange={handleInputChange}
                  rows={3}
                  disabled={readOnly}
                  style={readOnly ? { backgroundColor: "#f3f4f6" } : {}}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="archivado"
                  name="archivado"
                  checked={formData.archivado}
                  onChange={(e) => setFormData((prev) => ({ ...prev, archivado: e.target.checked }))}
                  className={`h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${
                    readOnly ? "bg-[#f3f4f6]" : ""
                  }`}
                  disabled={readOnly}
                />
                <Label htmlFor="archivado" className="text-sm font-medium text-gray-700">
                  Trámite Completado
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
              <CardDescription>Documentos relacionados con la expresión</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing || readOnly ? (
                <>
                  {/* Documentos existentes */}
                  <div className="space-y-2">
                    <Label>Documentos</Label>
                    {loadingDocuments ? (
                      <div className="flex flex-col items-center justify-center p-8">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-2" />
                        <p className="text-sm text-gray-600">Cargando documentos...</p>
                      </div>
                    ) : existingDocuments.length > 0 ? (
                      <div className="space-y-4">
                        {existingDocuments.map((doc) => (
                          <div key={doc.id} className="rounded-md border p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-5 w-5 text-gray-500" />
                                <span className="text-sm">{doc.nombre}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                {/* Botones de visualización y descarga - siempre visibles en modo lectura */}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      // Verificar si tenemos una ruta válida
                                      if (!doc.ruta) {
                                        toast({
                                          variant: "destructive",
                                          title: "Error al abrir documento",
                                          description: "La ruta del documento no es válida",
                                        })
                                        return
                                      }

                                      console.log("Intentando acceder al documento con ruta:", doc.ruta)

                                      // Generar una URL firmada para el documento (válida por 60 segundos)
                                      const { data, error } = await supabase.storage
                                        .from("documentos")
                                        .createSignedUrl(doc.ruta, 60)

                                      if (error || !data?.signedUrl) {
                                        console.error("Error al generar URL firmada:", error)
                                        toast({
                                          variant: "destructive",
                                          title: "Error al abrir documento",
                                          description: `No se pudo acceder al documento: ${error?.message || "Error desconocido"}`,
                                        })
                                        return
                                      }

                                      // Usar la URL firmada para abrir el documento
                                      openPdfViewer(data.signedUrl)
                                    } catch (error) {
                                      console.error("Error al obtener URL del documento:", error)
                                      toast({
                                        variant: "destructive",
                                        title: "Error al abrir documento",
                                        description: "No se pudo acceder al documento. Intente nuevamente.",
                                      })
                                    }
                                  }}
                                  className="h-8 w-8 p-0"
                                  title="Ver documento"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      // Verificar si tenemos una ruta válida
                                      if (!doc.ruta) {
                                        toast({
                                          variant: "destructive",
                                          title: "Error al descargar documento",
                                          description: "La ruta del documento no es válida",
                                        })
                                        return
                                      }

                                      console.log("Intentando descargar documento con ruta:", doc.ruta)

                                      // Generar una URL firmada para el documento (válida por 60 segundos)
                                      const { data, error } = await supabase.storage
                                        .from("documentos")
                                        .createSignedUrl(doc.ruta, 60)

                                      if (error || !data?.signedUrl) {
                                        console.error("Error al generar URL firmada:", error)
                                        toast({
                                          variant: "destructive",
                                          title: "Error al descargar documento",
                                          description: `No se pudo acceder al documento: ${error?.message || "Error desconocido"}`,
                                        })
                                        return
                                      }

                                      // Usar la URL firmada para descargar el documento
                                      const link = document.createElement("a")
                                      link.href = data.signedUrl
                                      link.download = doc.nombre
                                      document.body.appendChild(link)
                                      link.click()
                                      document.body.removeChild(link)
                                    } catch (error) {
                                      console.error("Error al descargar documento:", error)
                                      toast({
                                        variant: "destructive",
                                        title: "Error al descargar documento",
                                        description: "No se pudo descargar el documento. Intente nuevamente.",
                                      })
                                    }
                                  }}
                                  className="h-8 w-8 p-0"
                                  title="Descargar documento"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                {/* Botón de eliminar - solo visible si NO estamos en modo lectura */}
                                {!readOnly && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteDocument(doc.id)}
                                    className="h-8 w-8 p-0"
                                    title="Eliminar documento"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="mt-2">
                              <Label className="text-xs text-gray-500 mb-1">Etiquetas</Label>
                              <DocumentTagSelector
                                documentId={doc.id}
                                initialTags={documentTags[doc.id] || []}
                                onTagsChange={(tags) => handleTagsChange(doc.id, tags)}
                                readOnly={readOnly}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No hay documentos adjuntos a esta expresión.</p>
                    )}
                  </div>

                  {/* Subir nuevos documentos - solo mostrar si no es de solo lectura */}
                  {!readOnly && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="documentos">Subir Documentos</Label>
                        <div
                          className="rounded-md border border-dashed border-gray-300 p-4"
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            e.currentTarget.classList.add("border-blue-500", "bg-blue-50")
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            e.currentTarget.classList.remove("border-blue-500", "bg-blue-50")
                          }}
                          onDrop={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            e.currentTarget.classList.remove("border-blue-500", "bg-blue-50")

                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                              // Crear un objeto similar al evento de cambio de input
                              const fileEvent = {
                                target: {
                                  files: e.dataTransfer.files,
                                },
                              }
                              handleFileChange(fileEvent)
                            }
                          }}
                        >
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Upload className="h-8 w-8 text-gray-400" />
                            <p className="text-sm text-gray-500">
                              Arrastre y suelte archivos PDF aquí o haga clic para seleccionar
                            </p>
                            <p className="text-xs text-gray-400">Máximo 50MB por archivo</p>
                            <input
                              id="documentos"
                              type="file"
                              multiple
                              accept=".pdf"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById("documentos").click()}
                            >
                              Seleccionar Archivos
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Lista de archivos seleccionados */}
                      {files.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Archivos Seleccionados</Label>
                            <Button
                              type="button"
                              size="sm"
                              onClick={async () => {
                                if (expresion && expresion.id) {
                                  await uploadFiles(expresion.id.toString())
                                  // Refrescar la lista de documentos después de subir
                                  fetchExistingDocuments(expresion.id)
                                } else {
                                  toast({
                                    variant: "destructive",
                                    title: "Error",
                                    description: "No se puede subir archivos sin guardar la expresión primero",
                                  })
                                }
                              }}
                              disabled={uploading || files.length === 0}
                              className="bg-[#1a365d] hover:bg-[#15294d]"
                            >
                              {uploading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Subiendo...
                                </>
                              ) : (
                                <>
                                  <Upload className="mr-2 h-4 w-4" />
                                  Subir Archivos
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {files.map((file, index) => (
                              <div key={index} className="rounded-md border p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    <span className="text-sm">{file.name}</span>
                                    {uploadProgress[index] > 0 && uploadProgress[index] < 100 && (
                                      <div className="w-24 bg-gray-200 rounded-full h-2.5">
                                        <div
                                          className="bg-blue-600 h-2.5 rounded-full"
                                          style={{ width: `${uploadProgress[index]}%` }}
                                        ></div>
                                      </div>
                                    )}
                                    {uploadProgress[index] === 100 && (
                                      <span className="text-xs text-green-600">Completado</span>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(index)}
                                    className="h-8 w-8 p-0"
                                    disabled={uploading}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                {uploadProgress[index] === 100 && (
                                  <div className="mt-2">
                                    <Label className="text-xs text-gray-500 mb-1">Etiquetas</Label>
                                    <DocumentTagSelector
                                      documentId={`temp-${index}`}
                                      initialTags={documentTags[`temp-${index}`] || []}
                                      onTagsChange={(tags) => handleTagsChange(`temp-${index}`, tags)}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <FileText className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Guarde la expresión primero</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Para adjuntar documentos, primero debe guardar la expresión. Una vez guardada, podrá subir los
                    documentos relacionados.
                  </p>
                  <Button type="submit" className="bg-[#1a365d] hover:bg-[#15294d]">
                    Guardar Expresión
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={() => router.push("/dashboard/expresiones")}>
          Regresar
        </Button>

        {(activeTab !== "documentos" || isEditing) && !readOnly && (
          <div className="flex space-x-2">
            {/* Botón Guardar */}
            <Button type="submit" disabled={isSubmitting} className="bg-[#1a365d] hover:bg-[#15294d]">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Actualizando..." : "Guardando..."}
                </>
              ) : (
                "Guardar"
              )}
            </Button>

            {/* Botón Guardar y Salir */}
            <Button
              type="button"
              disabled={isSubmitting}
              className="bg-[#2a4a7d] hover:bg-[#1e3a6d]"
              // En la función del botón "Guardar y Salir", reemplazar todo el bloque onClick con:
              onClick={async (e) => {
                e.preventDefault()
                setIsSubmitting(true)

                try {
                  // Validar campos requeridos
                  if (!formData.nombre || !formData.tema) {
                    toast({
                      title: "Error",
                      description: "Por favor complete todos los campos requeridos: nombre y tema",
                      variant: "destructive",
                    })
                    setIsSubmitting(false)
                    return
                  }

                  // Preparar datos para enviar
                  let dataToSubmit = {
                    ...formData,
                    fecha_recibido:
                      formData.fecha_recibido && !isNaN(new Date(formData.fecha_recibido).getTime())
                        ? formatDateToISO(formData.fecha_recibido)
                        : null,
                    respuesta:
                      formData.respuesta && !isNaN(new Date(formData.respuesta).getTime())
                        ? formatDateToISO(formData.respuesta)
                        : null,
                  }

                  let expresionId

                  if (isEditing && expresion?.id) {
                    // Actualizar expresión existente
                    const { error } = await supabase.from("expresiones").update(dataToSubmit).eq("id", expresion.id)
                    if (error) throw error
                    expresionId = expresion.id

                    // Actualizar relaciones con comités
                    await supabase.from("expresion_comites").delete().eq("expresion_id", expresion.id)
                    for (const comiteId of selectedComites) {
                      await supabase.from("expresion_comites").insert({
                        expresion_id: expresion.id,
                        comite_id: comiteId,
                      })
                    }

                    // Actualizar relaciones con clasificaciones
                    await supabase.from("expresion_clasificaciones").delete().eq("expresion_id", expresion.id)
                    for (const clasificacionId of selectedClasificaciones) {
                      await supabase.from("expresion_clasificaciones").insert({
                        expresion_id: expresion.id,
                        clasificacion_id: clasificacionId,
                      })
                    }

                    // Registrar la acción en el audit trail
                    if (formData.numero) {
                      await logCurrentUserAction(`Expresión Actualizada y Salida: ${formData.numero}`)
                    }
                  } else {
                    // Crear nueva expresión
                    const secuenciaActual = await getNextSequenceNumber()
                    const temaSeleccionado = temas.find((tema) => tema.id === selectedTema)
                    const abreviatura = temaSeleccionado?.abreviatura || "RNAR"
                    const numeroExpresion = generateExpressionNumber(selectedYear, secuenciaActual, abreviatura)

                    dataToSubmit = {
                      ...dataToSubmit,
                      sequence: secuenciaActual,
                      numero: numeroExpresion,
                    }

                    const { data, error } = await supabase.from("expresiones").insert(dataToSubmit).select()
                    if (error) throw error
                    expresionId = data[0].id

                    // Crear relaciones con comités
                    for (const comiteId of selectedComites) {
                      await supabase.from("expresion_comites").insert({
                        expresion_id: data[0].id,
                        comite_id: comiteId,
                      })
                    }

                    // Crear relaciones con clasificaciones
                    for (const clasificacionId of selectedClasificaciones) {
                      await supabase.from("expresion_clasificaciones").insert({
                        expresion_id: data[0].id,
                        clasificacion_id: clasificacionId,
                      })
                    }

                    // Registrar la acción en el audit trail
                    if (dataToSubmit.numero) {
                      await logCurrentUserAction(`Expresión Creada y Salida: ${dataToSubmit.numero}`)
                    }
                  }

                  toast({
                    title: isEditing ? "Expresión actualizada" : "Expresión creada",
                    description: "La expresión ha sido guardada exitosamente",
                  })

                  // Subir archivos si hay alguno
                  if (files.length > 0) {
                    const filesNeedingUpload = files.some((_, index) => uploadProgress[index] !== 100)
                    if (filesNeedingUpload) {
                      await uploadFiles(expresionId.toString())
                    }
                  }

                  // Redirigir a la lista de expresiones
                  router.push("/dashboard/expresiones")
                } catch (error) {
                  console.error("Error saving expression:", error)
                  toast({
                    variant: "destructive",
                    title: "Error al guardar",
                    description: error.message || "Ocurrió un error al guardar la expresión",
                  })
                } finally {
                  setIsSubmitting(false)
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar y Salir"
              )}
            </Button>
          </div>
        )}
      </div>
      <Dialog open={pdfViewerOpen} onOpenChange={setPdfViewerOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <div className="w-full h-full">
            <p className="text-base">Visor de Documento</p>
            <iframe src={currentPdfUrl} className="w-full h-full border-0" title="Visor de PDF" />
          </div>
        </DialogContent>
      </Dialog>
    </form>
  )
}
