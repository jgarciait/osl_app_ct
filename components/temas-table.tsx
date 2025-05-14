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
// Cambiar la importación de useGroupPermissions a usePermissions
import { usePermissions } from "@/hooks/use-permissions"

export function TemasTable() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()
  // Cambiar la verificación de permisos
  const { hasPermission } = usePermissions()
  const canManageTemas = hasPermission("topics_pcl", "manage")

  const [temas, setTemas] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [temaToDelete, setTemaToDelete] = useState(null)
  const [searchValue, setSearchValue] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Cargar temas
  useEffect(() => {
    const fetchTemas = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase.from("temasPeticiones").select("*").order("nombre", { ascending: true })

        if (error) throw error

        setTemas(data || [])
      } catch (error) {
        console.error("Error fetching temas:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los temas",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemas()

    // Set up real-time subscription
    const channel = supabase
      .channel("temasPeticiones-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "temasPeticiones",
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload

          if (eventType === "INSERT") {
            setTemas((prev) => [...prev, newRecord].sort((a, b) => a.nombre.localeCompare(b.nombre)))
            toast({
              title: "Nuevo tema",
              description: `El tema "${newRecord.nombre}" ha sido añadido`,
            })
          } else if (eventType === "UPDATE") {
            setTemas((prev) =>
              prev
                .map((item) => (item.id === newRecord.id ? newRecord : item))
                .sort((a, b) => a.nombre.localeCompare(b.nombre)),
            )
            toast({
              title: "Tema actualizado",
              description: `El tema "${newRecord.nombre}" ha sido actualizado`,
            })
          } else if (eventType === "DELETE") {
            setTemas((prev) => prev.filter((item) => item.id !== oldRecord.id))
            toast({
              title: "Tema eliminado",
              description: `El tema ha sido eliminado`,
            })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Filtrar temas basados en la búsqueda
  const filteredTemas = temas.filter((tema) => tema.nombre.toLowerCase().includes(searchValue.toLowerCase()))

  // Calcular el número total de páginas
  const totalPages = Math.ceil(filteredTemas.length / pageSize)

  // Obtener los temas para la página actual
  const paginatedTemas = filteredTemas.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Resetear a la primera página cuando cambia la búsqueda o el tamaño de página
  useEffect(() => {
    setCurrentPage(1)
  }, [searchValue, pageSize])

  const handleEdit = (tema) => {
    // Dispatch an event to update the form
    window.dispatchEvent(new CustomEvent("edit-tema", { detail: tema }))
  }

  const handleDelete = async () => {
    if (!temaToDelete) return

    setIsDeleting(true)

    try {
      // Check if tema is used in any petition
      const { data: usedTemas, error: checkError } = await supabase
        .from("peticiones")
        .select("tema")
        .eq("tema", temaToDelete.id)
        .limit(1)

      if (checkError) throw checkError

      if (usedTemas && usedTemas.length > 0) {
        toast({
          variant: "destructive",
          title: "No se puede eliminar",
          description: "Este tema está siendo utilizado en una o más peticiones",
        })
        return
      }

      // Delete tema
      const { error } = await supabase.from("temasPeticiones").delete().eq("id", temaToDelete.id)

      if (error) throw error

      toast({
        title: "Tema eliminado",
        description: "El tema ha sido eliminado exitosamente",
      })

      router.refresh()
    } catch (error) {
      console.error("Error deleting tema:", error)
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error.message || "Ocurrió un error al eliminar el tema",
      })
    } finally {
      setIsDeleting(false)
      setTemaToDelete(null)
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
              placeholder="Buscar temas..."
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
                {canManageTemas && <TableHead className="w-[80px]">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Cargando temas...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTemas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    No hay temas registrados
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTemas.map((tema) => (
                  <TableRow key={tema.id}>
                    <TableCell className="font-medium">{tema.nombre}</TableCell>
                    {canManageTemas && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(tema)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTemaToDelete(tema)} className="text-red-600">
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
              Mostrando {paginatedTemas.length} de {filteredTemas.length} temas
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

      <AlertDialog open={!!temaToDelete} onOpenChange={() => setTemaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el tema
              {temaToDelete?.nombre && ` "${temaToDelete.nombre}"`}.
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
