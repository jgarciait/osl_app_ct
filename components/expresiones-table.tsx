"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClientClient, handleAuthError, cachedQuery } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table"
import {
  MoreHorizontal,
  Edit,
  Trash,
  UserPlus,
  Loader2,
  Filter,
  FilterX,
  FileDown,
  Eye,
  ArrowUpDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"

// Primero, añadir la importación de JSZip en la parte superior del archivo
import JSZip from "jszip"

// Importar jsPDF
import jsPDF from "jspdf"
import "jspdf-autotable"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@supabase/supabase-js"

// Importar el hook useGroupPermissions
import { useGroupPermissions } from "@/hooks/use-group-permissions"

// Importar la función logAuditTrail
import { logCurrentUserAction } from "@/lib/audit-trail"

// Importar componentes adicionales
import { DataTable } from "@/components/data-table/data-table"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { ContextMenu } from "@/components/ui/context-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Función para eliminar etiquetas HTML del texto
const stripHtml = (html) => {
  if (!html) return ""

  // Primero reemplazamos <br> y <p> con saltos de línea para preservar el formato
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<p>/gi, "")

  // Luego eliminamos todas las demás etiquetas HTML
  text = text.replace(/<[^>]*>/g, "")

  // Decodificamos entidades HTML comunes
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Eliminamos espacios en blanco múltiples
  text = text.replace(/\s+/g, " ").trim()

  return text
}

// Función para generar el PDF
export const generateExpresionPDF = async (expresion, documentos = [], comites = []) => {
  try {
    // Crear cliente de Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    )

    // Obtener el logo desde Supabase
    const { data: logoData, error: logoError } = await supabase.storage.from("src").download("logo-expresion.png")

    if (logoError) {
      console.error("Error al obtener el logo:", logoError)
    }

    // Crear un nuevo documento PDF
    const doc = new jsPDF()

    // Configuración de la fuente
    doc.setFont("helvetica", "normal")

    // Márgenes y dimensiones
    const margin = 20
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const contentWidth = pageWidth - margin * 2
    const footerHeight = 40 // Altura reservada para el pie de página
    const headerHeight = 15 // Altura reservada para el encabezado en páginas adicionales

    // Variable para almacenar la imagen del logo en base64
    let logoBase64 = null

    // Función para añadir el logo
    const addLogo = async (y) => {
      if (!logoData) return y

      try {
        if (!logoBase64) {
          // Convertir el blob a base64 solo la primera vez
          const reader = new FileReader()
          reader.readAsDataURL(logoData)

          await new Promise((resolve) => {
            reader.onloadend = () => {
              logoBase64 = reader.result
              resolve()
            }
          })
        }

        // Añadir la imagen al PDF
        const imgWidth = 60 // Ancho de la imagen en mm
        const imgHeight = 30 // Alto de la imagen en mm
        const xPos = (pageWidth - imgWidth) / 2 // Centrar horizontalmente

        doc.addImage(logoBase64, "PNG", xPos, y, imgWidth, imgHeight)
        return y + imgHeight + 15 // Espacio después del logo
      } catch (err) {
        console.error("Error al procesar el logo:", err)
        return y
      }
    }

    // Función para añadir el pie de página
    const addFooter = () => {
      const footerY = pageHeight - 30
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.text(
        "Tel. 787-721-5200 Exts. 305 • 331 Email: participacion@oslpr.org Web: www.oslpr.org/participacion-ciudadana",
        pageWidth / 2,
        footerY,
        { align: "center" },
      )
      doc.text("PO BOX 9023986, San Juan, Puerto Rico 00902-3986", pageWidth / 2, footerY + 5, { align: "center" })
      doc.text("Autorizado por la Oficina del Contralor Electoral OCE-SA-2024-01144", pageWidth / 2, footerY + 10, {
        align: "center",
      })
    }

    // Función para verificar si hay suficiente espacio en la página
    const checkPageBreak = async (currentY, neededSpace) => {
      if (currentY + neededSpace > pageHeight - footerHeight) {
        addFooter() // Añadir pie de página a la página actual
        doc.addPage() // Añadir nueva página
        return await addLogo(margin) // Añadir logo en la nueva página y devolver la nueva posición Y
      }
      return currentY
    }

    // Iniciar con el logo en la primera página
    let currentY = await addLogo(margin)

    // PRIMERA LÍNEA: NOMBRE Y FECHA
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("NOMBRE:", margin, currentY)

    doc.setFont("helvetica", "normal")
    doc.text(expresion?.nombre || "N/A", margin + 20, currentY)

    doc.setFont("helvetica", "bold")
    doc.text("FECHA:", pageWidth - margin - 47, currentY)

    doc.setFont("helvetica", "normal")
    const fechaText = expresion?.fecha_recibido
      ? format(new Date(expresion.fecha_recibido), "dd 'de' MMMM 'de' yyyy", { locale: es })
      : "N/A"
    doc.text(fechaText, pageWidth - margin - 30, currentY)

    currentY += 8

    // SEGUNDA LÍNEA: TEMA
    doc.setFont("helvetica", "bold")
    doc.text("TEMA:", margin, currentY)

    doc.setFont("helvetica", "normal")
    doc.text(expresion?.tema_nombre || "N/A", margin + 15, currentY)

    currentY += 8

    // TERCERA LÍNEA: REFERIDO A
    doc.setFont("helvetica", "bold")
    doc.text("REFERIDO A:", margin, currentY)

    doc.setFont("helvetica", "normal")
    // Construir la lista de comités referidos
    let comitesText = "N/A"
    if (comites && comites.length > 0) {
      comitesText = comites.map((comite) => `${comite.nombre} (${comite.tipo})`).join(", ")
    }
    doc.text(comitesText, margin + 27, currentY)

    currentY += 8

    // CUARTA LÍNEA: TRÁMITES Y FECHA DE RESPUESTA
    doc.setFont("helvetica", "bold")
    doc.text("TRÁMITES:", margin, currentY)

    doc.setFont("helvetica", "normal")
    doc.text(expresion?.tramite || "N/A", margin + 23, currentY)

    doc.setFont("helvetica", "bold")
    doc.text("FECHA DE RESPUESTA:", pageWidth - margin - 75, currentY)

    doc.setFont("helvetica", "normal")
    const fechaRespuestaText = expresion?.fecha_respuesta
      ? format(new Date(expresion.fecha_respuesta), "dd 'de' MMMM 'de' yyyy", { locale: es })
      : expresion?.respuesta
        ? format(new Date(expresion.respuesta), "dd 'de' MMMM 'de' yyyy", { locale: es })
        : "N/A"
    doc.text(fechaRespuestaText, pageWidth - margin - 30, currentY)

    currentY += 8

    // QUINTA LÍNEA: NÚMERO
    doc.setFont("helvetica", "bold")
    doc.text("NÚMERO:", margin, currentY)

    doc.setFont("helvetica", "normal")
    doc.text(expresion?.numero || "N/A", margin + 20, currentY)

    currentY += 10

    // SECCIÓN: PROPUESTA O RESUMEN
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("PROPUESTA O RESUMEN:", margin, currentY)
    currentY += 6

    // Normalizar el contenido HTML antes de añadirlo al PDF
    const normalizedContent = stripHtml(expresion?.propuesta || "N/A")

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    const contentText = doc.splitTextToSize(normalizedContent, contentWidth)

    // Añadir el contenido línea por línea, verificando si hay suficiente espacio
    for (let i = 0; i < contentText.length; i++) {
      currentY = await checkPageBreak(currentY, 5) // Verificar si hay espacio para esta línea
      doc.text(contentText[i], margin, currentY)
      currentY += 5
    }

    currentY += 5
    currentY = await checkPageBreak(currentY, 15) // Verificar si hay espacio para la siguiente sección

    // SECCIÓN: DOCUMENTOS ADJUNTOS
    if (documentos && documentos.length > 0) {
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text("DOCUMENTOS ADJUNTOS:", margin, currentY)
      currentY += 6

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")

      // Añadir documentos línea por línea, verificando si hay suficiente espacio
      for (let i = 0; i < documentos.length; i++) {
        currentY = await checkPageBreak(currentY, 5) // Verificar si hay espacio para este documento
        doc.text(`• ${documentos[i].nombre}`, margin + 5, currentY)
        currentY += 5
      }

      currentY += 5
      currentY = await checkPageBreak(currentY, 15) // Verificar si hay espacio para la siguiente sección
    }

    // SECCIÓN: ANOTACIONES
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("ANOTACIONES:", margin, currentY)
    currentY += 6

    // Normalizar las notas HTML antes de añadirlas al PDF
    const normalizedNotes = stripHtml(expresion?.notas || "N/A")

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    const notesText = doc.splitTextToSize(normalizedNotes, contentWidth)

    // Añadir las notas línea por línea, verificando si hay suficiente espacio
    for (let i = 0; i < notesText.length; i++) {
      currentY = await checkPageBreak(currentY, 5) // Verificar si hay espacio para esta línea
      doc.text(notesText[i], margin, currentY)
      currentY += 5
    }

    // Añadir el pie de página a la última página
    addFooter()

    // Guardar el PDF
    doc.save(`expresion_${expresion?.numero || "N/A"}.pdf`)
  } catch (error) {
    console.error("Error al generar PDF:", error)
    throw error
  }
}

// Caché para usuarios
const usersCache = {
  data: null,
  timestamp: 0,
}
const CACHE_DURATION = 60000 // 1 minuto

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

interface ExpresionesTableProps {
  expresiones: any[]
  years: number[]
  tagMap?: Record<string, string>
}

export function ExpresionesTable({ expresiones, years, tagMap = {} }: ExpresionesTableProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()
  const { hasPermission } = useGroupPermissions()
  const canManageExpressions = hasPermission("expressions", "manage")
  const canViewExpressions = hasPermission("expressions", "view")

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "numero",
      desc: true,
    },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    {
      id: "estado",
      value: ["Activa"],
    },
  ])
  const [rowSelection, setRowSelection] = useState({})
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [expressionToDelete, setExpressionToDelete] = useState(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; data: any } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [expressionToAssign, setExpressionToAssign] = useState(null)
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [isAssigning, setIsAssigning] = useState(false)
  const [expresionesData, setExpresiones] = useState(expresiones)
  const [assignedUsers, setAssignedUsers] = useState([])
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(null)
  const [expressionToChangeColor, setExpressionToChangeColor] = useState(null)
  const [selectedColor, setSelectedColor] = useState("")
  const [currentUser, setCurrentUser] = useState(null)
  const [isFilteringByCurrentUser, setIsFilteringByCurrentUser] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [tagOptions, setTagOptions] = useState([])
  const [globalFilter, setGlobalFilter] = useState("")

  // Ref para controlar las solicitudes de datos
  const isDataFetched = useRef(false)

  // Añadir refs para las suscripciones
  const realtimeSubscriptions = useRef([])

  // Función para limpiar suscripciones
  const cleanupRealtimeSubscriptions = () => {
    realtimeSubscriptions.current.forEach((subscription) => subscription.unsubscribe())
    realtimeSubscriptions.current = []
  }

  // Añadir este useEffect para configurar suscripciones en tiempo real
  useEffect(() => {
    // Configurar suscripciones en tiempo real para las tablas relacionadas
    const setupRealtimeSubscriptions = () => {
      // Limpiar suscripciones existentes
      cleanupRealtimeSubscriptions()

      // Suscribirse a cambios en document_etiquetas
      const documentEtiquetasSubscription = supabase
        .channel("document-etiquetas-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "documento_etiquetas",
          },
          (payload) => {
            console.log("Cambio en documento_etiquetas:", payload)
            // Si estamos viendo documentos de una expresión específica,
            // podríamos actualizar las etiquetas aquí
          },
        )
        .subscribe()

      // Suscribirse a cambios en etiquetas
      const etiquetasSubscription = supabase
        .channel("etiquetas-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "etiquetas",
          },
          (payload) => {
            console.log("Cambio en etiquetas:", payload)
            // Actualizar las etiquetas si cambian sus nombres o colores
          },
        )
        .subscribe()

      // Suscribirse a cambios en clasificaciones
      const clasificacionesSubscription = supabase
        .channel("clasificaciones-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "clasificaciones",
          },
          (payload) => {
            console.log("Cambio en clasificaciones:", payload)
            // Actualizar las clasificaciones si cambian
          },
        )
        .subscribe()

      // Suscribirse a cambios en comites
      const comitesSubscription = supabase
        .channel("comites-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "comites",
          },
          (payload) => {
            console.log("Cambio en comites:", payload)
            // Actualizar los comités si cambian
          },
        )
        .subscribe()

      // Guardar referencias a las suscripciones
      realtimeSubscriptions.current = [
        documentEtiquetasSubscription,
        etiquetasSubscription,
        clasificacionesSubscription,
        comitesSubscription,
      ]
    }

    setupRealtimeSubscriptions()

    // Limpiar suscripciones al desmontar
    return () => {
      cleanupRealtimeSubscriptions()
    }
  }, [supabase])

  // Actualizar expresionesData cuando cambian las expresiones recibidas como prop
  useEffect(() => {
    setExpresiones(expresiones)
  }, [expresiones])

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Seleccionar todo"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Seleccionar fila"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "numero",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="px-0"
            >
              Número
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
      },
      {
        accessorKey: "nombre",
        header: "Nombre",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => {
          const email = row.original.email
          if (!email) return <span className="text-gray-400 text-xs">No disponible</span>
          return email
        },
      },
      {
        accessorKey: "tema_nombre",
        header: "Tema",
      },
      {
        accessorKey: "estado",
        header: "Estatus",
        accessorFn: (row) => (row.archivado ? "Archivada" : "Activa"),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
        cell: ({ row }) => {
          const archived = row.original.archivado
          return (
            <span className={archived ? "text-gray-500 font-medium" : "text-green-600 font-medium"}>
              {archived ? "Archivada" : "Activa"}
            </span>
          )
        },
      },
      {
        accessorKey: "ano",
        header: "Año",
        accessorFn: (row) => row.ano.toString(),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
        cell: ({ row }) => {
          // Mostrar el año en lugar del mes
          return row.original.ano
        },
      },
      {
        accessorKey: "mes",
        header: "Mes",
        accessorFn: (row) => row.mes.toString(),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
        cell: ({ row }) => {
          const month = row.original.mes
          const monthNames = [
            "Enero",
            "Febrero",
            "Marzo",
            "Abril",
            "Mayo",
            "Junio",
            "Julio",
            "Agosto",
            "Septiembre",
            "Octubre",
            "Noviembre",
            "Diciembre",
          ]
          return monthNames[month - 1]
        },
      },
      {
        accessorKey: "assigned_to_name",
        header: "Asignado a",
        filterFn: (row, id, value) => {
          // Si el valor incluye "Sin asignar" y el valor de la celda es null o vacío, devuelve true
          if (value.includes("Sin asignar") && (!row.getValue(id) || row.getValue(id) === "")) {
            return true
          }
          // Para otros valores, comprueba si el valor de la celda está en el array de valores
          return value.includes(row.getValue(id))
        },
        cell: ({ row }) => {
          const assignedTo = row.original.assigned_to_name
          if (!assignedTo) return <span className="text-gray-400 text-xs">Sin asignar</span>

          // Generar un color único basado en el nombre del usuario o usar el color guardado
          const colorHash = assignedTo.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360
          const userColor = row.original.assigned_color || `hsl(${colorHash}, 70%, 90%)`
          const textColor = row.original.assigned_text_color || `hsl(${colorHash}, 70%, 30%)`
          const borderColor = row.original.assigned_border_color || `hsl(${colorHash}, 70%, 80%)`

          // Verificar si esta expresión está asignada al usuario actual
          const isCurrentUser = currentUser && row.original.assigned_to === currentUser.id

          return (
            <div className="flex items-center">
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer group relative ${
                  isCurrentUser ? "ring-2 ring-offset-1 ring-blue-500" : ""
                }`}
                style={{
                  backgroundColor: userColor,
                  color: textColor,
                  border: `1px solid ${borderColor}`,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleColorChange(row.original)
                }}
              >
                {assignedTo}
                {isCurrentUser && <span className="ml-1 text-xs opacity-70">(Tú)</span>}
                <span
                  className="absolute -top-1 -right-1 size-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Cambiar color"
                ></span>
              </div>
            </div>
          )
        },
      },
      {
        id: "document_tags",
        accessorFn: (row) => row.document_tags || [],
        filterFn: (row, id, filterValue) => {
          // Si no hay valores de filtro, devolver true
          if (!filterValue || filterValue.length === 0) return true

          // Obtener las etiquetas de los documentos de esta expresión
          const rowTags = row.getValue(id)

          // Si no hay etiquetas, devolver false
          if (!rowTags || rowTags.length === 0) return false

          // Comprobar si alguna de las etiquetas coincide con los valores de filtro
          return filterValue.some((filter) => rowTags.includes(filter))
        },
        enableSorting: false,
        enableHiding: true,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canManageExpressions && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/dashboard/expresiones/${row.original.id}/editar`)
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {canViewExpressions && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/dashboard/expresiones/${row.original.id}/ver`)
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver
                </DropdownMenuItem>
              )}
              {canManageExpressions && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpressionToAssign(row.original)
                    setIsAssignDialogOpen(true)
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Asignar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleGeneratePDF(row.original)
                }}
              >
                <FileDown className="mr-2 h-4 w-4" />
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleGeneratePDFWithAttachments(row.original)
                }}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Solo Anejos
              </DropdownMenuItem>
              {canManageExpressions && (
                <DropdownMenuItem
                  onClick={async (e) => {
                    e.stopPropagation()
                    setExpressionToDelete(row.original)
                    setIsDeleteDialogOpen(true)
                  }}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [router, currentUser, isGeneratingPDF, canManageExpressions, canViewExpressions],
  )

  // Función modificada para generar PDF con documentos adjuntos y comités
  const handleGeneratePDF = async (expresion: any) => {
    try {
      setIsGeneratingPDF(true)
      setIsLoading(true)

      // Ejecutar en un setTimeout para no bloquear la interfaz
      setTimeout(async () => {
        try {
          // Obtener los documentos adjuntos si existen
          let documentosAdjuntos = []
          try {
            const { data: docsData, error: docsErrorData } = await supabase
              .from("documentos")
              .select("id, nombre, tipo, created_at")
              .eq("expresion_id", expresion.id)

            if (docsErrorData) {
              console.error("Error al obtener documentos:", docsErrorData)
            } else if (docsData) {
              documentosAdjuntos = docsData
            }
          } catch (error) {
            console.error("Error al consultar documentos:", error)
          }

          // Obtener los comités relacionados con la expresión
          let comitesRelacionados = []
          try {
            // Primero obtenemos las relaciones
            const { data: relacionesData, error: relacionesError } = await supabase
              .from("expresion_comites")
              .select("comite_id")
              .eq("expresion_id", expresion.id)

            if (relacionesError) {
              console.error("Error al obtener relaciones con comités:", relacionesError)
            } else if (relacionesData && relacionesData.length > 0) {
              // Luego obtenemos los detalles de los comités
              const comiteIds = relacionesData.map((rel) => rel.comite_id)

              const { data: comitesData, error: comitesError } = await supabase
                .from("comites")
                .select("id, nombre, tipo")
                .in("id", comiteIds)

              if (comitesError) {
                console.error("Error al obtener detalles de comités:", comitesError)
              } else if (comitesData) {
                comitesRelacionados = comitesData
              }
            }
          } catch (error) {
            console.error("Error al consultar comités relacionados:", error)
          }

          // Obtener datos completos de la expresión
          const { data, error } = await supabase
            .from("view_expresiones_with_assignment")
            .select("*")
            .eq("id", expresion.id)
            .single()

          if (error) {
            console.error("Error al obtener datos de la expresión:", error)
            toast({
              title: "Error",
              description: "No se pudo generar el PDF. Intente nuevamente.",
              variant: "destructive",
            })
            setIsLoading(false)
            setIsGeneratingPDF(false)
            return
          }

          // Generar el PDF con los datos obtenidos
          await generateExpresionPDF(data, documentosAdjuntos, comitesRelacionados)

          toast({
            title: "PDF generado",
            description: "El PDF se ha generado correctamente.",
          })
        } catch (error) {
          console.error("Error al generar PDF:", error)
          toast({
            title: "Error",
            description: "No se pudo generar el PDF. Intente nuevamente.",
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
          setIsGeneratingPDF(false)
        }
      }, 0)
    } catch (error) {
      setIsLoading(false)
      setIsGeneratingPDF(false)
    }
  }

  // Luego, añadir la nueva función para descargar PDF con anejos después de la función handleGeneratePDF
  // Añadir esta función después de handleGeneratePDF

  // Función para generar PDF con anejos
  const handleGeneratePDFWithAttachments = async (expresion: any) => {
    try {
      setIsGeneratingPDF(true)
      setIsLoading(true)

      toast({
        title: "Preparando archivos",
        description: "Recopilando documentos adjuntos...",
      })

      // Ejecutar en un setTimeout para no bloquear la interfaz
      setTimeout(async () => {
        try {
          // Crear un nuevo objeto JSZip
          const zip = new JSZip()

          // Obtener los documentos adjuntos
          const { data: docsData, error: docsErrorData } = await supabase
            .from("documentos")
            .select("id, nombre, tipo, ruta, created_at")
            .eq("expresion_id", expresion.id)

          if (docsErrorData) {
            console.error("Error al obtener documentos:", docsErrorData)
            throw docsErrorData
          }

          const documentosAdjuntos = docsData || []

          // Descargar y añadir cada documento adjunto al zip
          if (documentosAdjuntos.length > 0) {
            for (const doc of documentosAdjuntos) {
              try {
                if (doc.ruta) {
                  const { data: fileData, error: fileError } = await supabase.storage
                    .from("documentos")
                    .download(doc.ruta)

                  if (fileError) {
                    console.error(`Error al descargar archivo ${doc.ruta}:`, fileError)
                    continue // Continuar con el siguiente documento si hay error
                  }

                  // Añadir el archivo al zip
                  const fileName = doc.nombre || doc.ruta.split("/").pop() || `documento_${doc.id}`
                  zip.file(`documentos/${fileName}`, fileData)
                }
              } catch (docError) {
                console.error(`Error procesando documento ${doc.id}:`, docError)
              }
            }
          }

          // Generar el archivo zip
          const zipBlob = await zip.generateAsync({ type: "blob" })

          // Crear un enlace para descargar el zip
          const url = URL.createObjectURL(zipBlob)
          const link = document.createElement("a")
          link.href = url
          link.download = `expresion_${expresion?.numero || "N/A"}_anejos.zip`
          document.body.appendChild(link)
          link.click()

          // Limpiar
          setTimeout(() => {
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
          }, 100)

          toast({
            title: "Descarga completada",
            description: `Se ha generado un archivo ZIP con ${documentosAdjuntos.length} documento(s) adjunto(s).`,
          })
        } catch (error) {
          console.error("Error al generar ZIP con anejos:", error)
          toast({
            title: "Error",
            description: "No se pudo generar el archivo. Intente nuevamente.",
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
          setIsGeneratingPDF(false)
        }
      }, 0)
    } catch (error) {
      setIsLoading(false)
      setIsGeneratingPDF(false)
    }
  }

  // Obtener el usuario actual al cargar el componente
  useEffect(() => {
    const fetchCurrentUser = async () => {
      // Evitar solicitudes repetidas
      if (isDataFetched.current) return

      try {
        setIsLoading(true)

        // Obtener la sesión actual
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          await handleAuthError(sessionError)
          throw sessionError
        }

        if (session) {
          // Obtener los detalles del perfil del usuario
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single()

          if (profileError) throw profileError

          setCurrentUser({
            id: session.user.id,
            ...profileData,
          })
        }

        // Marcar que los datos ya se han cargado
        isDataFetched.current = true
      } catch (error) {
        console.error("Error al obtener el usuario actual:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo obtener la información del usuario actual",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchCurrentUser()
  }, [supabase, toast])

  const table = useReactTable({
    data: expresionesData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    globalFilterFn: (row, columnId, filterValue) => {
      const searchValue = filterValue.toLowerCase()

      // Check multiple fields for the search term
      const numero = String(row.getValue("numero") || "").toLowerCase()
      const nombre = String(row.getValue("nombre") || "").toLowerCase()
      const email = String(row.original.email || "").toLowerCase()
      const tema = String(row.getValue("tema_nombre") || "").toLowerCase()

      return (
        numero.includes(searchValue) ||
        nombre.includes(searchValue) ||
        email.includes(searchValue) ||
        tema.includes(searchValue)
      )
    },
    state: {
      sorting,
      columnFilters,
      rowSelection,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  })

  const statusOptions = [
    {
      label: "Activa",
      value: "Activa",
    },
    {
      label: "Archivada",
      value: "Archivada",
    },
  ]

  const yearOptions = years.map((year) => ({
    label: year.toString(),
    value: year.toString(),
  }))

  const monthOptions = [
    { label: "Enero", value: "1" },
    { label: "Febrero", value: "2" },
    { label: "Marzo", value: "3" },
    { label: "Abril", value: "4" },
    { label: "Mayo", value: "5" },
    { label: "Junio", value: "6" },
    { label: "Julio", value: "7" },
    { label: "Agosto", value: "8" },
    { label: "Septiembre", value: "9" },
    { label: "Octubre", value: "10" },
    { label: "Noviembre", value: "11" },
    { label: "Diciembre", value: "12" },
  ]

  const handleRowClick = useCallback(
    (row) => {
      router.push(`/dashboard/expresiones/${row.id}/editar`)
    },
    [router],
  )

  const handleRowRightClick = useCallback((e, row) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, data: row })
  }, [])

  const handleEdit = useCallback(() => {
    if (contextMenu?.data) {
      router.push(`/dashboard/expresiones/${contextMenu.data.id}/editar`)
      setContextMenu(null)
    }
  }, [router, contextMenu])

  const handleDelete = useCallback(async () => {
    if (contextMenu?.data) {
      setExpressionToDelete(contextMenu.data)
      setIsDeleteDialogOpen(true)
      setContextMenu(null)
    }
  }, [contextMenu])

  const fetchUsers = async () => {
    try {
      // Verificar si tenemos datos en caché y si son recientes
      const now = Date.now()
      if (usersCache.data && now - usersCache.timestamp < CACHE_DURATION) {
        setUsers(usersCache.data)
        return
      }

      // Usar la función cachedQuery para obtener los usuarios
      const { data, error } = await supabase.from("profiles").select("id, nombre, apellido, email")

      if (error) throw error

      // Guardar en caché
      usersCache.data = data || []
      usersCache.timestamp = now

      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        variant: "destructive",
        title: "Error al cargar usuarios",
        description: "No se pudieron cargar los usuarios disponibles",
      })
    }
  }

  const handleAssignUser = async () => {
    if (!expressionToAssign) return

    setIsAssigning(true)

    try {
      // Si selectedUser es "none", establecer assigned_to a null
      const assignedTo = selectedUser === "none" ? null : selectedUser

      let updateData = {
        assigned_to: assignedTo,
        updated_at: new Date().toISOString(), // Asegurar que se actualiza el timestamp
      }

      // Si hay un usuario asignado, buscar si ya tiene un color asignado
      if (assignedTo) {
        // Buscar otra expresión que ya tenga este usuario asignado
        const { data: existingAssignments, error: searchError } = await supabase
          .from("expresiones")
          .select("assigned_color, assigned_text_color, assigned_border_color")
          .eq("assigned_to", assignedTo)
          .not("assigned_color", "is", null)
          .limit(1)

        if (searchError) throw searchError

        // Si el usuario ya tiene un color asignado en otra expresión, usar ese color
        if (existingAssignments && existingAssignments.length > 0) {
          const { assigned_color, assigned_text_color, assigned_border_color } = existingAssignments[0]
          updateData = {
            ...updateData,
            assigned_color,
            assigned_text_color,
            assigned_border_color,
          }
        }
      }

      console.log("Actualizando expresión con datos:", updateData)
      console.log("ID de expresión:", expressionToAssign.id)

      // Actualizar la expresión con el usuario asignado y posiblemente el color
      const { data, error } = await supabase
        .from("expresiones")
        .update(updateData)
        .eq("id", expressionToAssign.id)
        .select()

      if (error) {
        console.error("Error al actualizar expresión:", error)
        throw error
      }

      console.log("Respuesta de actualización:", data)

      // Obtener el nombre del usuario asignado
      let assignedToName = null
      if (assignedTo) {
        const assignedUser = users.find((u) => u.id === assignedTo)
        if (assignedUser) {
          assignedToName = `${assignedUser.nombre} ${assignedUser.apellido}`
        }
      }

      toast({
        title: assignedTo ? "Expresión asignada" : "Asignación removida",
        description: assignedTo
          ? "La expresión ha sido asignada exitosamente"
          : "Se ha removido la asignación de la expresión",
      })

      // Actualizar los datos localmente
      setExpresiones((prev) =>
        prev.map((exp) =>
          exp.id === expressionToAssign.id
            ? {
                ...exp,
                assigned_to: assignedTo,
                assigned_to_name: assignedToName,
                ...(updateData.assigned_color
                  ? {
                      assigned_color: updateData.assigned_color,
                      assigned_text_color: updateData.assigned_text_color,
                      assigned_border_color: updateData.assigned_border_color,
                    }
                  : {}),
              }
            : exp,
        ),
      )

      setIsAssignDialogOpen(false)
      setSelectedUser(null)
    } catch (error) {
      console.error("Error assigning expression:", error)
      toast({
        variant: "destructive",
        title: "Error al asignar",
        description: error.message || "Ocurrió un error al asignar la expresión",
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const handleColorChange = (expression) => {
    setExpressionToChangeColor(expression)
    setSelectedColor(expression.assigned_color || "")
    setIsColorDialogOpen(true)
  }

  const saveColorChange = async () => {
    if (!expressionToChangeColor) return

    try {
      // Preparar los valores de color basados en el color seleccionado
      const colorValues = selectedColor
        ? {
            assigned_color: selectedColor,
            assigned_text_color: `hsl(${selectedColor.match(/\d+/)?.[0] || 0}, 70%, 30%)`,
            assigned_border_color: `hsl(${selectedColor.match(/\d+/)?.[0] || 0}, 70%, 80%)`,
          }
        : {
            assigned_color: null,
            assigned_text_color: null,
            assigned_border_color: null,
          }

      // Obtener el ID del usuario asignado
      const assignedUserId = expressionToChangeColor.assigned_to

      if (!assignedUserId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No hay usuario asignado a esta expresión",
        })
        return
      }

      // Actualizar todas las expresiones asignadas a este usuario
      const { error } = await supabase.from("expresiones").update(colorValues).eq("assigned_to", assignedUserId)

      if (error) throw error

      toast({
        title: "Color actualizado",
        description: "El color ha sido actualizado para todas las expresiones asignadas a este usuario",
      })

      // Actualizar los datos localmente
      setExpresiones((prev) =>
        prev.map((exp) =>
          exp.assigned_to === assignedUserId
            ? {
                ...exp,
                ...colorValues,
              }
            : exp,
        ),
      )

      setIsColorDialogOpen(false)
    } catch (error) {
      console.error("Error updating color:", error)
      toast({
        variant: "destructive",
        title: "Error al actualizar color",
        description: error.message || "Ocurrió un error al actualizar el color",
      })
    }
  }

  // Función para alternar el filtro de usuario actual
  const toggleCurrentUserFilter = () => {
    if (currentUser) {
      if (isFilteringByCurrentUser) {
        // Quitar el filtro de usuario actual
        setColumnFilters((prev) => prev.filter((filter) => filter.id !== "assigned_to_name"))
        setIsFilteringByCurrentUser(false)
      } else {
        // Añadir el filtro de usuario actual
        const fullName = `${currentUser.nombre} ${currentUser.apellido}`
        setColumnFilters((prev) => [
          ...prev.filter((filter) => filter.id !== "assigned_to_name"),
          {
            id: "assigned_to_name",
            value: [fullName],
          },
        ])
        setIsFilteringByCurrentUser(true)
      }
    }
  }

  useEffect(() => {
    if (isAssignDialogOpen) {
      fetchUsers()
    }
  }, [isAssignDialogOpen])

  // Modificar la función confirmDelete para verificar y actualizar la secuencia si es necesario
  const confirmDelete = async () => {
    if (!expressionToDelete) return

    setIsDeleting(true)

    try {
      // Primero verificar si esta expresión es la última (con el número de secuencia más alto) para su año
      const { data: lastExpression, error: lastExpressionError } = await supabase
        .from("expresiones")
        .select("id, sequence, ano, numero")
        .eq("ano", expressionToDelete.ano)
        .order("sequence", { ascending: false })
        .limit(1)
        .single()

      if (lastExpressionError) {
        console.error("Error al verificar si es la última expresión:", lastExpressionError)
        // Continuamos con el proceso aunque haya error en esta verificación
      }

      // Si esta expresión es la última para su año, actualizar la secuencia
      const isLastExpression = lastExpression && lastExpression.id === expressionToDelete.id

      // Primero eliminar las relaciones con comités
      const { error: comitesError } = await supabase
        .from("expresion_comites")
        .delete()
        .eq("expresion_id", expressionToDelete.id)

      if (comitesError) {
        console.error("Error eliminando relaciones con comités:", comitesError)
        throw comitesError
      }

      // Obtener los documentos asociados con sus rutas de almacenamiento
      const { data: documentos, error: docsQueryError } = await supabase
        .from("documentos")
        .select("id, ruta")
        .eq("expresion_id", expressionToDelete.id)

      if (docsQueryError) {
        console.error("Error consultando documentos:", docsQueryError)
        throw docsQueryError
      }

      // Si hay documentos, eliminar primero los archivos del bucket
      if (documentos && documentos.length > 0) {
        // Eliminar los archivos del bucket de almacenamiento
        for (const doc of documentos) {
          if (doc.ruta) {
            const { error: storageError } = await supabase.storage.from("documentos").remove([doc.ruta])

            if (storageError) {
              console.error(`Error eliminando archivo ${doc.ruta} del bucket:`, storageError)
              // Continuamos con el proceso aunque haya errores en la eliminación de archivos
            }
          }
        }

        // Eliminar las relaciones con etiquetas
        const { error: tagsError } = await supabase
          .from("documento_etiquetas")
          .delete()
          .in(
            "documento_id",
            documentos.map((doc) => doc.id),
          )

        if (tagsError) {
          console.error("Error eliminando etiquetas de documentos:", tagsError)
          throw tagsError
        }

        // Eliminar los registros de documentos de la base de datos
        const { error: docsDeleteError } = await supabase
          .from("documentos")
          .delete()
          .eq("expresion_id", expressionToDelete.id)

        if (docsDeleteError) {
          console.error("Error eliminando documentos:", docsDeleteError)
          throw docsDeleteError
        }
      }

      // Finally eliminar la expresión
      const { error: expresionError } = await supabase.from("expresiones").delete().eq("id", expressionToDelete.id)

      if (expresionError) {
        console.error("Error eliminando expresión:", expresionError)
        throw expresionError
      }

      // Si era la última expresión del año, actualizar la secuencia
      if (isLastExpression) {
        // Obtener la nueva última expresión para ese año (después de eliminar la anterior)
        const { data: newLastExpression, error: newLastExpressionError } = await supabase
          .from("expresiones")
          .select("sequence")
          .eq("ano", expressionToDelete.ano)
          .order("sequence", { ascending: false })
          .limit(1)
          .single()

        // Si no hay error, significa que hay al menos una expresión para ese año
        if (!newLastExpressionError && newLastExpression) {
          // Actualizar la secuencia al valor de la nueva última expresión
          const newSequenceValue = newLastExpression.sequence

          // Obtener el valor actual de la secuencia
          const { data: currentSequence, error: sequenceError } = await supabase
            .from("secuencia")
            .select("valor")
            .eq("id", "next_sequence")
            .single()

          if (!sequenceError && currentSequence) {
            const currentValue = Number.parseInt(currentSequence.valor, 10)

            // Solo actualizar si el valor actual es mayor que el nuevo valor + 1
            // (el +1 es porque next_sequence guarda el próximo valor a usar)
            if (currentValue > newSequenceValue + 1) {
              await supabase
                .from("secuencia")
                .update({
                  valor: String(newSequenceValue + 1),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", "next_sequence")
            }
          }
        } else if (newLastExpressionError && newLastExpressionError.code === "PGRST116") {
          // Si el error es PGRST116, significa que no hay más expresiones para ese año
          // Podríamos reiniciar la secuencia a 1 para ese año, pero esto depende de la lógica de negocio
          console.log(`No hay más expresiones para el año ${expressionToDelete.ano}`)
        }
      }

      // Registrar la acción en el audit trail
      if (lastExpression?.numero) {
        await logCurrentUserAction(`Expresión Eliminada: ${lastExpression.numero}`)
      }

      toast({
        title: "Expresión eliminada",
        description: "La expresión ha sido eliminada exitosamente",
      })

      // Refrescar la página para mostrar los cambios
      router.refresh()
    } catch (error) {
      console.error("Error al eliminar expresión:", error)
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error.message || "Ocurrió un error al eliminar la expresión",
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setExpressionToDelete(null)
    }
  }

  // Preparar opciones de usuarios asignados para el filtro
  const assignedUserOptions = useMemo(() => {
    const options = [{ label: "Sin asignar", value: "Sin asignar" }]

    // Añadir el usuario actual primero si existe
    if (currentUser) {
      options.push({
        label: `${currentUser.nombre} ${currentUser.apellido} (Tú)`,
        value: `${currentUser.nombre} ${currentUser.apellido}`,
      })
    }

    // Añadir el resto de usuarios
    users.forEach((user) => {
      // Evitar duplicar el usuario actual
      if (!currentUser || user.id !== currentUser.id) {
        options.push({
          label: `${user.nombre} ${user.apellido}`,
          value: `${user.nombre} ${user.apellido}`,
        })
      }
    })

    return options
  }, [users, currentUser])

  // Añadir esta función para cargar las etiquetas disponibles
  const fetchTagOptions = async () => {
    try {
      const { data, error } = await cachedQuery("etiquetas", () =>
        supabase.from("etiquetas").select("id, nombre, color").order("nombre"),
      )

      if (error) throw error

      // Transformar los datos para el formato del filtro
      const options = data.map((tag) => ({
        label: tag.nombre,
        value: tag.id,
        color: tag.color,
      }))

      setTagOptions(options)
    } catch (error) {
      console.error("Error al cargar etiquetas:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las etiquetas para el filtro",
      })
    }
  }

  // Cargar las etiquetas al montar el componente
  useEffect(() => {
    fetchTagOptions()
  }, [])

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {currentUser && (
            <Button
              variant={isFilteringByCurrentUser ? "default" : "outline"}
              size="sm"
              onClick={toggleCurrentUserFilter}
              className={isFilteringByCurrentUser ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {isFilteringByCurrentUser ? (
                <>
                  <FilterX className="mr-2 h-4 w-4" />
                  Ver todas
                </>
              ) : (
                <>
                  <Filter className="mr-2 h-4 w-4" />
                  Ver mis asignaciones
                </>
              )}
            </Button>
          )}
          {isFilteringByCurrentUser && currentUser && (
            <Badge variant="secondary" className="ml-2">
              Filtrando: Mis asignaciones
            </Badge>
          )}
        </div>
      </div>

      <DataTableToolbar
        table={table}
        statusOptions={statusOptions}
        yearOptions={yearOptions}
        monthOptions={monthOptions}
        assignedUserOptions={assignedUserOptions}
        tagOptions={tagOptions}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
      />

      {isLoading ? (
        <div className="w-full flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <DataTable
            table={table}
            columns={columns}
            onRowClick={handleRowClick}
            onRowRightClick={handleRowRightClick}
            canEdit={canManageExpressions}
            tagMap={tagMap}
          />
          <DataTablePagination table={table} />
        </>
      )}

      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="¿Está seguro de que desea eliminar esta expresión?"
        description="Esta acción no se puede deshacer. Se eliminarán todos los datos asociados, incluyendo documentos y relaciones con comités."
        onConfirm={confirmDelete}
        confirmText={isDeleting ? "Eliminando..." : "Eliminar"}
      />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Diálogo de asignación de usuario */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Asignar Expresión</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user">Seleccione un usuario</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.nombre} {user.apellido} ({user.email})
                      {currentUser && user.id === currentUser.id ? " (Tú)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignUser} disabled={isAssigning} className="bg-[#1a365d] hover:bg-[#15294d]">
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Asignando...
                </>
              ) : (
                "Asignar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de cambio de color */}
      <Dialog open={isColorDialogOpen} onOpenChange={setIsColorDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cambiar color de asignación</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="color">Seleccione un color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {[0, 30, 60, 120, 180, 210, 240, 270, 300, 330].map((hue) => (
                  <button
                    key={hue}
                    className={`size-8 rounded-full cursor-pointer border-2 ${
                      selectedColor === `hsl(${hue}, 70%, 90%)` ? "border-black" : "border-transparent"
                    }`}
                    style={{ backgroundColor: `hsl(${hue}, 70%, 90%)` }}
                    onClick={() => setSelectedColor(`hsl(${hue}, 70%, 90%)`)}
                    aria-label={`Color ${hue}`}
                  />
                ))}
                <button
                  className={`size-8 rounded-full cursor-pointer border-2 ${
                    selectedColor === "" ? "border-black" : "border-transparent"
                  }`}
                  style={{ backgroundColor: "#f1f5f9" }}
                  onClick={() => setSelectedColor("")}
                  aria-label="Color por defecto"
                >
                  <span className="text-gray-400 text-xs">Auto</span>
                </button>
              </div>
              <div className="mt-4">
                <div
                  className="px-4 py-2 rounded-full text-sm font-medium w-fit mx-auto"
                  style={{
                    backgroundColor:
                      selectedColor ||
                      `hsl(${expressionToChangeColor?.assigned_to_name?.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360 || 0}, 70%, 90%)`,
                    color: selectedColor
                      ? `hsl(${selectedColor.match(/\d+/)?.[0] || 0}, 70%, 30%)`
                      : `hsl(${expressionToChangeColor?.assigned_to_name?.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360 || 0}, 70%, 30%)`,
                    border: selectedColor
                      ? `1px solid hsl(${selectedColor.match(/\d+/)?.[0] || 0}, 70%, 80%)`
                      : `1px solid hsl(${expressionToChangeColor?.assigned_to_name?.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % 360 || 0}, 70%, 80%)`,
                  }}
                >
                  {expressionToChangeColor?.assigned_to_name || "Usuario"}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsColorDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveColorChange} className="bg-[#1a365d] hover:bg-[#15294d]">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
