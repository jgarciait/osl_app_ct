"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Edit, MoreHorizontal, Trash, Search, ChevronLeft, ChevronRight } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useGroupPermissions } from "@/hooks/use-group-permissions"

export function ComitesTable({ comites = [] }) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()
  const { hasPermission } = useGroupPermissions()
  const canManageComites = hasPermission("committees", "manage")

  const [isDeleting, setIsDeleting] = useState(false)
  const [comiteToDelete, setComiteToDelete] = useState(null)

  const [searchValue, setSearchValue] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Filtrar comisiones basadas en la búsqueda
  const filteredComites = comites.filter(
    (comite) =>
      comite.nombre.toLowerCase().includes(searchValue.toLowerCase()) ||
      comite.tipo.toLowerCase().includes(searchValue.toLowerCase()),
  )

  // Calcular el número total de páginas
  const totalPages = Math.ceil(filteredComites.length / pageSize)

  // Obtener las comisiones para la página actual
  const paginatedComites = filteredComites.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Resetear a la primera página cuando cambia la búsqueda o el tamaño de página
  useEffect(() => {
    setCurrentPage(1)
  }, [searchValue, pageSize])

  const handleEdit = (comite) => {
    // Dispatch an event to update the form
    window.dispatchEvent(new CustomEvent("edit-comite", { detail: comite }))
  }

  const handleDelete = async () => {
    if (!comiteToDelete) return

    setIsDeleting(true)

    try {
      // Check if committee is used in any expression
      const { data: usedComites, error: checkError } = await supabase
        .from("expresion_comites")
        .select("comite_id")
        .eq("comite_id", comiteToDelete.id)
        .limit(1)

      if (checkError) throw checkError

      if (usedComites && usedComites.length > 0) {
        toast({
          variant: "destructive",
          title: "No se puede eliminar",
          description: "Esta comisión está siendo utilizada en una o más expresiones",
        })
        return
      }

      // Delete committee
      const { error } = await supabase.from("comites").delete().eq("id", comiteToDelete.id)

      if (error) throw error

      toast({
        title: "Comisión eliminada",
        description: "La comisión ha sido eliminada exitosamente",
      })

      router.refresh()
    } catch (error) {
      console.error("Error deleting committee:", error)
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error.message || "Ocurrió un error al eliminar la comisión",
      })
    } finally {
      setIsDeleting(false)
      setComiteToDelete(null)
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
              placeholder="Buscar comisiones..."
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
                <TableHead>Tipo</TableHead>
                {canManageComites && <TableHead className="w-[80px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredComites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No hay comisiones registradas
                  </TableCell>
                </TableRow>
              ) : (
                paginatedComites.map((comite) => (
                  <TableRow key={comite.id}>
                    <TableCell className="font-medium">{comite.nombre}</TableCell>
                    <TableCell>{comite.tipo === "senado" ? "Senado" : "Cámara"}</TableCell>
                    {canManageComites && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(comite)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setComiteToDelete(comite)} className="text-red-600">
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
              Mostrando {paginatedComites.length} de {filteredComites.length} entradas
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

      <AlertDialog open={!!comiteToDelete} onOpenChange={() => setComiteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la comisión
              {comiteToDelete?.nombre && ` "${comiteToDelete.nombre}"`}.
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
