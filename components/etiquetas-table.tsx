"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useGroupPermissions } from "@/hooks/use-group-permissions"

export function EtiquetasTable({ etiquetas: initialEtiquetas = [] }) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()
  const { hasPermission } = useGroupPermissions()
  const canManageTags = hasPermission("tags", "manage")

  const [etiquetas, setEtiquetas] = useState(initialEtiquetas)
  const [isDeleting, setIsDeleting] = useState(false)
  const [etiquetaToDelete, setEtiquetaToDelete] = useState(null)
  const [searchValue, setSearchValue] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Configurar suscripción en tiempo real
  useEffect(() => {
    // Inicializar con los datos proporcionados
    setEtiquetas(initialEtiquetas)

    // Configurar canal de suscripción para etiquetas
    const channel = supabase
      .channel("etiquetas-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "etiquetas",
        },
        (payload) => {
          console.log("Cambio en tiempo real recibido:", payload)

          // Manejar diferentes tipos de eventos
          if (payload.eventType === "INSERT") {
            setEtiquetas((prevEtiquetas) => {
              const newEtiquetas = [...prevEtiquetas, payload.new]
              // Ordenar por nombre
              return newEtiquetas.sort((a, b) => a.nombre.localeCompare(b.nombre))
            })
            toast({
              title: "Nueva etiqueta",
              description: `Se ha agregado la etiqueta "${payload.new.nombre}"`,
            })
          } else if (payload.eventType === "UPDATE") {
            setEtiquetas((prevEtiquetas) =>
              prevEtiquetas.map((etiqueta) => (etiqueta.id === payload.new.id ? payload.new : etiqueta)),
            )
            toast({
              title: "Etiqueta actualizada",
              description: `Se ha actualizado la etiqueta "${payload.new.nombre}"`,
            })
          } else if (payload.eventType === "DELETE") {
            setEtiquetas((prevEtiquetas) => prevEtiquetas.filter((etiqueta) => etiqueta.id !== payload.old.id))
            toast({
              title: "Etiqueta eliminada",
              description: `Se ha eliminado la etiqueta "${payload.old.nombre}"`,
            })
          }
        },
      )
      .subscribe()

    // Limpiar suscripción al desmontar
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, initialEtiquetas, toast])

  // Filtrar etiquetas basadas en la búsqueda
  const filteredEtiquetas = etiquetas.filter(
    (etiqueta) =>
      etiqueta.nombre.toLowerCase().includes(searchValue.toLowerCase()) ||
      (etiqueta.descripcion && etiqueta.descripcion.toLowerCase().includes(searchValue.toLowerCase())),
  )

  // Calcular el número total de páginas
  const totalPages = Math.ceil(filteredEtiquetas.length / pageSize)

  // Obtener las etiquetas para la página actual
  const paginatedEtiquetas = filteredEtiquetas.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Resetear a la primera página cuando cambia la búsqueda o el tamaño de página
  useEffect(() => {
    setCurrentPage(1)
  }, [searchValue, pageSize])

  const handleEdit = (etiqueta) => {
    // Dispatch an event to update the form
    window.dispatchEvent(new CustomEvent("edit-etiqueta", { detail: etiqueta }))
  }

  const handleDelete = async () => {
    if (!etiquetaToDelete) return

    setIsDeleting(true)

    try {
      // Verificar si la etiqueta está siendo utilizada
      const { data: usedEtiquetas, error: checkError } = await supabase
        .from("documento_etiquetas")
        .select("etiqueta_id")
        .eq("etiqueta_id", etiquetaToDelete.id)
        .limit(1)

      if (checkError) throw checkError

      if (usedEtiquetas && usedEtiquetas.length > 0) {
        toast({
          variant: "destructive",
          title: "No se puede eliminar",
          description: "Esta etiqueta está siendo utilizada en uno o más documentos",
        })
        return
      }

      // Eliminar etiqueta
      const { error } = await supabase.from("etiquetas").delete().eq("id", etiquetaToDelete.id)

      if (error) throw error

      // No necesitamos actualizar el estado aquí, ya que la suscripción en tiempo real lo hará
      // No necesitamos llamar a router.refresh() ya que estamos usando tiempo real
    } catch (error) {
      console.error("Error al eliminar etiqueta:", error)
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error.message || "Ocurrió un error al eliminar la etiqueta",
      })
    } finally {
      setIsDeleting(false)
      setEtiquetaToDelete(null)
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
              placeholder="Buscar etiquetas..."
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
                <TableHead>Color</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEtiquetas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No hay etiquetas registradas
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEtiquetas.map((etiqueta) => (
                  <TableRow key={etiqueta.id}>
                    <TableCell>
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: etiqueta.color || "#1a365d" }}
                        aria-hidden="true"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{etiqueta.nombre}</TableCell>
                    <TableCell>
                      {canManageTags ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(etiqueta)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEtiquetaToDelete(etiqueta)} className="text-red-600">
                              <Trash className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {paginatedEtiquetas.length} de {filteredEtiquetas.length} etiquetas
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

      <AlertDialog open={!!etiquetaToDelete} onOpenChange={() => setEtiquetaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la etiqueta
              {etiquetaToDelete?.nombre && ` "${etiquetaToDelete.nombre}"`}.
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
