"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClientClient } from "@/lib/supabase-client"
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
  FileText,
  Download,
  Eye,
  ArrowUpDown,
  Loader2,
  File,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FileAudio,
  FileVideo,
  FileIcon as FilePdf,
  FileCode,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { DataTable } from "@/components/data-table/data-table"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { useGroupPermissions } from "@/hooks/use-group-permissions"

// Función para formatear el tamaño en bytes a una unidad legible
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// Función para obtener el icono según el tipo de archivo
const getFileIcon = (fileType) => {
  if (!fileType) return <File className="h-4 w-4" />

  const type = fileType.toLowerCase()

  if (type.includes("image")) return <FileImage className="h-4 w-4" />
  if (type.includes("pdf")) return <FilePdf className="h-4 w-4" />
  if (type.includes("excel") || type.includes("spreadsheet") || type.includes("csv"))
    return <FileSpreadsheet className="h-4 w-4" />
  if (type.includes("zip") || type.includes("rar") || type.includes("tar") || type.includes("compressed"))
    return <FileArchive className="h-4 w-4" />
  if (type.includes("audio")) return <FileAudio className="h-4 w-4" />
  if (type.includes("video")) return <FileVideo className="h-4 w-4" />
  if (type.includes("code") || type.includes("json") || type.includes("xml") || type.includes("html"))
    return <FileCode className="h-4 w-4" />

  return <FileText className="h-4 w-4" />
}

interface DocumentosTableProps {
  documentos: any[]
  tagMap?: Record<string, string>
}

export function DocumentosTable({ documentos, tagMap = {} }: DocumentosTableProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()
  const { hasPermission } = useGroupPermissions()
  const canManageDocuments = hasPermission("documents", "manage")
  const canViewDocuments = hasPermission("documents", "view")

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "created_at",
      desc: true,
    },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Preparar opciones para filtros
  const tipoOptions = useMemo(() => {
    const tipos = new Set()
    documentos.forEach((doc) => {
      if (doc.tipo) {
        const tipoBase = doc.tipo.split("/")[0]
        tipos.add(tipoBase)
      }
    })

    return Array.from(tipos).map((tipo) => ({
      label: tipo.charAt(0).toUpperCase() + tipo.slice(1),
      value: tipo,
    }))
  }, [documentos])

  // Preparar opciones de etiquetas para filtros
  const tagOptions = useMemo(() => {
    const tags = []
    documentos.forEach((doc) => {
      if (doc.etiquetas && doc.etiquetas.length > 0) {
        doc.etiquetas.forEach((tag) => {
          if (!tags.some((t) => t.value === tag.id)) {
            tags.push({
              label: tag.nombre,
              value: tag.id,
              color: tag.color,
            })
          }
        })
      }
    })
    return tags
  }, [documentos])

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: "nombre",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="px-0"
            >
              Nombre
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
        cell: ({ row }) => {
          const nombre = row.getValue("nombre")
          const tipo = row.original.tipo

          return (
            <div className="flex items-center space-x-2">
              {getFileIcon(tipo)}
              <span className="font-medium">{nombre}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "expresiones.numero",
        header: "Expresión",
        cell: ({ row }) => {
          const expresion = row.original.expresiones
          if (!expresion) return <span className="text-gray-400 text-xs">No asociado</span>

          return (
            <div className="flex flex-col">
              <span className="font-medium">{expresion.numero}</span>
              <span className="text-xs text-gray-500 truncate max-w-[200px]">{expresion.nombre}</span>
            </div>
          )
        },
      },
      {
        id: "etiquetas",
        header: "Etiquetas",
        cell: ({ row }) => {
          const etiquetas = row.original.etiquetas || []

          if (etiquetas.length === 0) {
            return <span className="text-gray-400 text-xs">Sin etiquetas</span>
          }

          return (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {etiquetas.slice(0, 3).map((etiqueta) => (
                <Badge
                  key={etiqueta.id}
                  variant="outline"
                  className="flex items-center gap-1 bg-gray-100"
                  style={{
                    borderColor: etiqueta.color || "#cfcfcf",
                    color: "#1a365d",
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: etiqueta.color || "#cfcfcf" }}
                    aria-hidden="true"
                  ></span>
                  {etiqueta.nombre}
                </Badge>
              ))}
              {etiquetas.length > 3 && (
                <Badge variant="outline" className="bg-gray-100">
                  +{etiquetas.length - 3}
                </Badge>
              )}
            </div>
          )
        },
        filterFn: (row, id, filterValue) => {
          // Si no hay valores de filtro, devolver true
          if (!filterValue || filterValue.length === 0) return true

          // Obtener las etiquetas del documento
          const etiquetas = row.original.etiquetas || []

          // Si no hay etiquetas, devolver false
          if (etiquetas.length === 0) return false

          // Comprobar si alguna de las etiquetas coincide con los valores de filtro
          return filterValue.some((filter) => etiquetas.some((etiqueta) => etiqueta.id === filter))
        },
      },
      {
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => {
          const tipo = row.getValue("tipo") as string
          if (!tipo) return <span className="text-gray-400 text-xs">Desconocido</span>

          return (
            <Badge variant="outline" className="bg-gray-100">
              {tipo}
            </Badge>
          )
        },
        filterFn: (row, id, filterValue) => {
          // Si no hay valores de filtro, devolver true
          if (!filterValue || filterValue.length === 0) return true

          // Obtener el tipo del documento
          const tipo = row.getValue(id) as string
          if (!tipo) return false

          // Comprobar si el tipo base coincide con alguno de los valores de filtro
          const tipoBase = tipo.split("/")[0]
          return filterValue.includes(tipoBase)
        },
      },
      {
        accessorKey: "tamano",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="px-0"
            >
              Tamaño
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
        cell: ({ row }) => {
          const tamano = row.getValue("tamano") as number
          return <span>{formatFileSize(tamano)}</span>
        },
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="px-0"
            >
              Fecha
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          )
        },
        cell: ({ row }) => {
          const created_at = row.getValue("created_at") as string
          return <span>{format(new Date(created_at), "dd/MM/yyyy", { locale: es })}</span>
        },
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
              {canViewDocuments && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    handleViewDocument(row.original)
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  handleDownloadDocument(row.original)
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [canManageDocuments, canViewDocuments],
  )

  const handleViewDocument = async (doc) => {
    try {
      setIsLoading(true)

      // Obtener la URL pública del documento
      const { data, error } = await supabase.storage.from("documentos").createSignedUrl(doc.ruta, 60) // URL válida por 60 segundos

      if (error) throw error

      // Abrir el documento en una nueva pestaña
      window.open(data.signedUrl, "_blank")
    } catch (error) {
      console.error("Error al visualizar el documento:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo visualizar el documento. Por favor, intente nuevamente.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownloadDocument = async (doc) => {
    try {
      setIsLoading(true)

      // Obtener la URL pública del documento
      const { data, error } = await supabase.storage.from("documentos").createSignedUrl(doc.ruta, 60)

      if (error) throw error

      // Usar fetch para obtener el contenido del archivo como Blob
      const response = await fetch(data.signedUrl)

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      // Convertir la respuesta a un Blob
      const blob = await response.blob()

      // Crear un objeto URL para el Blob (ahora es una URL local)
      const blobUrl = URL.createObjectURL(blob)

      // Crear un enlace para descargar el archivo
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = doc.nombre
      document.body.appendChild(link)
      link.click()

      // Limpiar
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl) // Importante liberar memoria

      toast({
        title: "Descarga iniciada",
        description: "El documento se está descargando.",
      })
    } catch (error) {
      console.error("Error al descargar el documento:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo descargar el documento. Por favor, intente nuevamente.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!documentToDelete) return

    setIsDeleting(true)

    try {
      // Primero eliminar el archivo del bucket de almacenamiento
      if (documentToDelete.ruta) {
        const { error: storageError } = await supabase.storage.from("documentos").remove([documentToDelete.ruta])

        if (storageError) {
          console.error("Error eliminando archivo del bucket:", storageError)
          throw storageError
        }
      }

      // Eliminar las relaciones con etiquetas
      const { error: tagsError } = await supabase
        .from("documento_etiquetas")
        .delete()
        .eq("documento_id", documentToDelete.id)

      if (tagsError) {
        console.error("Error eliminando etiquetas del documento:", tagsError)
        throw tagsError
      }

      // Eliminar el registro del documento de la base de datos
      const { error: docDeleteError } = await supabase.from("documentos").delete().eq("id", documentToDelete.id)

      if (docDeleteError) {
        console.error("Error eliminando documento:", docDeleteError)
        throw docDeleteError
      }

      toast({
        title: "Documento eliminado",
        description: "El documento ha sido eliminado exitosamente",
      })

      // Refrescar la página para mostrar los cambios
      router.refresh()
    } catch (error) {
      console.error("Error al eliminar documento:", error)
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error.message || "Ocurrió un error al eliminar el documento",
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setDocumentToDelete(null)
    }
  }

  const table = useReactTable({
    data: documentos,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const searchValue = filterValue.toLowerCase()

      // Check multiple fields for the search term
      const nombre = String(row.getValue("nombre") || "").toLowerCase()
      const expresionNumero = row.original.expresiones?.numero?.toLowerCase() || ""
      const expresionNombre = row.original.expresiones?.nombre?.toLowerCase() || ""
      const tipo = String(row.getValue("tipo") || "").toLowerCase()

      return (
        nombre.includes(searchValue) ||
        expresionNumero.includes(searchValue) ||
        expresionNombre.includes(searchValue) ||
        tipo.includes(searchValue)
      )
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  })

  return (
    <div className="w-full">
      <DataTableToolbar
        table={table}
        tagOptions={tagOptions}
        statusOptions={tipoOptions}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
      />

      {isLoading ? (
        <div className="w-full flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <DataTable table={table} columns={columns} tagMap={tagMap} />
          <DataTablePagination table={table} />
        </>
      )}

      <ConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="¿Está seguro de que desea eliminar este documento?"
        description="Esta acción no se puede deshacer. Se eliminará el archivo del almacenamiento y todos los datos asociados."
        onConfirm={confirmDelete}
        confirmText={isDeleting ? "Eliminando..." : "Eliminar"}
      />
    </div>
  )
}
