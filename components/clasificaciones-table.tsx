"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit, MoreHorizontal, Trash, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePermissions } from "@/hooks/use-permissions"

export function ClasificacionesTable() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()
  const { hasPermission } = usePermissions()
  const canManageClassifications = hasPermission("classifications_pcl", "manage")

  const [clasificaciones, setClasificaciones] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [clasificacionToDelete, setClasificacionToDelete] = useState(null)
  const [searchValue, setSearchValue] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Cargar clasificaciones
  useEffect(() => {
    const fetchClasificaciones = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("clasificacionesPeticion")
          .select("*")
          .order("nombre", { ascending: true })

        if (error) throw error

        setClasificaciones(data || [])
      } catch (error) {
        console.error("Error fetching clasificaciones:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las clasificaciones",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchClasificaciones()

    // Set up real-time subscription
    const channel = supabase
      .channel("clasificacionesPeticion-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clasificacionesPeticion",
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload

          if (eventType === "INSERT") {
            setClasificaciones((prev) => [...prev, newRecord].sort((a, b) => a.nombre.localeCompare(b.nombre)))
            toast({
              title: "Nueva clasificación",
              description: `La clasificación "${newRecord.nombre}" ha sido añadida`,
            })
          } else if (eventType === "UPDATE") {
            setClasificaciones((prev) =>
              prev
                .map((item) => (item.id === newRecord.id ? newRecord : item))
                .sort((a, b) => a.nombre.localeCompare(b.nombre)),
            )
            toast({
              title: "Clasificación actualizada",
              description: `La clasificación "${newRecord.nombre}" ha sido actualizada`,
            })
          } else if (eventType === "DELETE") {
            setClasificaciones((prev) => prev.filter((item) => item.id !== oldRecord.id))
            toast({
              title: "Clasificación eliminada",
              description: `La clasificación ha sido eliminada`,
            })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Filtrar clasificaciones basadas en la búsqueda
  const filteredClasificaciones = clasificaciones.filter(
    (clasificacion) =>
      clasificacion.nombre.toLowerCase().includes(searchValue.toLowerCase()) ||
      (clasificacion.abreviatura && clasificacion.abreviatura.toLowerCase().includes(searchValue.toLowerCase())),
  )

  // Calcular el número total de páginas
  const totalPages = Math.ceil(filteredClasificaciones.length / pageSize)

  // Obtener las clasificaciones para la página actual
  const paginatedClasificaciones = filteredClasificaciones.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Resetear a la primera página cuando cambia la búsqueda o el tamaño de página
  useEffect(() => {
    setCurrentPage(1)
  }, [searchValue, pageSize])

  const handleEdit = (clasificacion) => {
    // Dispatch an event to update the form
    window.dispatchEvent(new CustomEvent("edit-clasificacion", { detail: clasificacion }))
  }

  const handleDelete = async () => {
    if (!clasificacionToDelete) return

    setIsDeleting(true)

    try {
      // Check if clasificacion is used in any petition
      const { data: usedClasificaciones, error: checkError } = await supabase
        .from("peticiones")
        .select("clasificacion")
        .eq("clasificacion", clasificacionToDelete.id)
        .limit(1)

      if (checkError) throw checkError

      if (usedClasificaciones && usedClasificaciones.length > 0) {
        toast({
          variant: "destructive",
          title: "No se puede eliminar",
          description: "Esta clasificación está siendo utilizada en una o más peticiones",
        })
        return
      }

      // Delete clasificacion
      const { error } = await supabase.from("clasificacionesPeticion").delete().eq("id", clasificacionToDelete.id)

      if (error) throw error

      toast({
        title: "Clasificación eliminada",
        description: "La clasificación ha sido eliminada exitosamente",
      })

      router.refresh()
    } catch (error) {
      console.error("Error deleting clasificacion:", error)
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error.message || "Ocurrió un error al eliminar la clasificación",
      })
    } finally {
      setIsDeleting(false)
      setClasificacionToDelete(null)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative w-full md:w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar clasificaciones..."
              className="w-full pl-8"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-auto">
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Entradas por página" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 por página</SelectItem>
                <SelectItem value="10">10 por página</SelectItem>
                <SelectItem value="25">25 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Abreviatura</TableHead>
                {canManageClassifications && <TableHead className="w-[80px]">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Cargando clasificaciones...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredClasificaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No hay clasificaciones registradas
                  </TableCell>
                </TableRow>
              ) : (
                paginatedClasificaciones.map((clasificacion) => (
                  <TableRow key={clasificacion.id}>
                    <TableCell className="font-medium">{clasificacion.nombre}</TableCell>
                    <TableCell>{clasificacion.abreviatura || "-"}</TableCell>
                    {canManageClassifications && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(clasificacion)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setClasificacionToDelete(clasificacion)}
                              className="text-red-600"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {paginatedClasificaciones.length} de {filteredClasificaciones.length} clasificaciones
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
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
                        onClick={() => setCurrentPage(pageToShow)}
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
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Página siguiente</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!clasificacionToDelete} onOpenChange={() => setClasificacionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la clasificación
              {clasificacionToDelete?.nombre && ` "${clasificacionToDelete.nombre}"`}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
