"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, MoreHorizontal, Trash2, Eye, AlertCircle, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useGroupPermissions } from "@/hooks/use-group-permissions"

type BugReport = {
  id: string
  title: string
  description: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  user_id: string
  user_name?: string
  user_email?: string
}

interface BugReportsTableProps {
  statusFilter?: string[]
}

export function BugReportsTable({ statusFilter }: BugReportsTableProps) {
  const [bugReports, setBugReports] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { isAdmin } = useGroupPermissions()

  // Estados para la tabla
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true }, // Ordenar por fecha de creación descendente por defecto
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  useEffect(() => {
    fetchBugReports()
  }, [statusFilter])

  const fetchBugReports = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClientClient()

      // Iniciar la consulta
      let query = supabase.from("bug_reports").select("*")

      // Aplicar filtro de estatus si existe
      if (statusFilter && statusFilter.length > 0) {
        query = query.in("status", statusFilter)
      }

      // Ordenar y ejecutar la consulta
      const { data: bugReports, error: reportsError } = await query.order("created_at", { ascending: false })

      // Y luego obtener los perfiles de usuario por separado:
      if (bugReports && !reportsError) {
        // Obtener los IDs de usuario únicos
        const userIds = [...new Set(bugReports.map((report) => report.user_id))]

        // Obtener los perfiles de esos usuarios
        const { data: userProfiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, nombre, apellido, email")
          .in("id", userIds)

        if (userProfiles && !profilesError) {
          // Crear un mapa de perfiles por ID
          const profilesMap = userProfiles.reduce((map, profile) => {
            map[profile.id] = profile
            return map
          }, {})

          // Combinar los datos
          const formattedReports = bugReports.map((report) => {
            const profile = profilesMap[report.user_id]
            return {
              ...report,
              user_name: profile ? `${profile.nombre || ""} ${profile.apellido || ""}`.trim() : "Usuario desconocido",
              user_email: profile?.email || "",
            }
          })

          setBugReports(formattedReports)
        } else {
          console.error("Error al cargar los perfiles:", profilesError)
          setBugReports(
            bugReports.map((report) => ({
              ...report,
              user_name: "Usuario desconocido",
              user_email: "",
            })),
          )
        }
      }
    } catch (err) {
      console.error("Error al cargar los reportes:", err)
      setError("No se pudieron cargar los reportes de bugs. Por favor, intente nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast({
        variant: "destructive",
        title: "Permiso denegado",
        description: "Solo los administradores pueden eliminar reportes.",
      })
      return
    }

    if (!confirm("¿Está seguro que desea eliminar este reporte? Esta acción no se puede deshacer.")) {
      return
    }

    try {
      const supabase = createClientClient()
      const { error } = await supabase.from("bug_reports").delete().eq("id", id)

      if (error) throw error

      toast({
        title: "Reporte eliminado",
        description: "El reporte ha sido eliminado exitosamente.",
      })

      // Actualizar la lista de reportes
      fetchBugReports()
    } catch (err) {
      console.error("Error al eliminar el reporte:", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el reporte. Por favor, intente nuevamente.",
      })
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const supabase = createClientClient()
      const { error } = await supabase.from("bug_reports").update({ status }).eq("id", id)

      if (error) throw error

      toast({
        title: "Estado actualizado",
        description: `El reporte ha sido marcado como ${status}.`,
      })

      // Actualizar la lista de reportes
      fetchBugReports()
    } catch (err) {
      console.error("Error al actualizar el estado del reporte:", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estado del reporte. Por favor, intente nuevamente.",
      })
    }
  }

  const handleViewDetails = (id: string) => {
    router.push(`/dashboard/bugs/${id}`)
  }

  // Mapeo de prioridades a colores de badge
  const priorityVariant = {
    baja: "outline",
    media: "secondary",
    alta: "default",
    critica: "destructive",
  } as const

  // Mapeo de estados a colores de badge
  const statusVariant = {
    abierto: "outline",
    pendiente: "outline",
    "en progreso": "secondary",
    completado: "success",
    resuelto: "success",
    cerrado: "default",
  } as const

  // Definición de columnas
  const columns: ColumnDef<BugReport>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Título
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.getValue("title")}</div>,
    },
    {
      accessorKey: "status",
      header: "Estatus",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const variant = statusVariant[status as keyof typeof statusVariant] || "default"
        return <Badge variant={variant}>{status}</Badge>
      },
    },
    {
      accessorKey: "priority",
      header: "Prioridad",
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string
        const variant = priorityVariant[priority as keyof typeof priorityVariant] || "default"
        return <Badge variant={variant}>{priority}</Badge>
      },
    },
    {
      accessorKey: "user_name",
      header: "Reportado por",
      cell: ({ row }) => <div>{row.getValue("user_name")}</div>,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Fecha
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"))
        return <div>{format(date, "dd/MM/yyyy HH:mm", { locale: es })}</div>
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const report = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones 2</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleViewDetails(report.id)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateStatus(report.id, "pendiente")}>
                <AlertCircle className="mr-2 h-4 w-4" />
                Marcar como pendiente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateStatus(report.id, "resuelto")}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Marcar como resuelto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateStatus(report.id, "cerrado")}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Marcar como cerrado
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(report.id)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: bugReports,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filtrar por título..."
          value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("title")?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={() => fetchBugReports()} className="ml-auto">
          Actualizar
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {loading ? "Cargando..." : "No hay reportes de bugs."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} reporte(s) en total.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
