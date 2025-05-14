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
import { usePermissions } from "@/hooks/use-permissions"

export function AsesoresTable({ asesores: initialAsesores = [] }) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()
  const { hasPermission } = usePermissions()
  const canManageAdvisors = hasPermission("advisors","manage")

  const [asesores, setAsesores] = useState(initialAsesores)
  const [isDeleting, setIsDeleting] = useState(false)
  const [asesorToDelete, setAsesorToDelete] = useState(null)
  const [searchValue, setSearchValue] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Configurar suscripción en tiempo real
  useEffect(() => {
    // Inicializar con los datos proporcionados
    setAsesores(initialAsesores)

    // Configurar canal de suscripción para asesores
    const channel = supabase
      .channel("asesores-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "asesores",
        },
        (payload) => {
          console.log("Cambio en tiempo real recibido:", payload)

          // Manejar diferentes tipos de eventos
          if (payload.eventType === "INSERT") {
            setAsesores((prevAsesores) => {
              const newAsesores = [...prevAsesores, payload.new]
              // Ordenar por nombre
              return newAsesores.sort((a, b) => a.name.localeCompare(b.name))
            })
            toast({
              title: "Nuevo asesor",
              description: `Se ha agregado el asesor "${payload.new.name}"`,
            })
          } else if (payload.eventType === "UPDATE") {
            setAsesores((prevAsesores) =>
              prevAsesores.map((asesor) => (asesor.id === payload.new.id ? payload.new : asesor)),
            )
            toast({
              title: "Asesor actualizado",
              description: `Se ha actualizado el asesor "${payload.new.name}"`,
            })
          } else if (payload.eventType === "DELETE") {
            setAsesores((prevAsesores) => prevAsesores.filter((asesor) => asesor.id !== payload.old.id))
            toast({
              title: "Asesor eliminado",
              description: `Se ha eliminado el asesor "${payload.old.name}"`,
            })
          }
        },
      )
      .subscribe()

    // Limpiar suscripción al desmontar
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, initialAsesores, toast])

  // Filtrar asesores basados en la búsqueda
  const filteredAsesores = asesores.filter(
    (asesor) =>
      (asesor.name && asesor.name.toLowerCase().includes(searchValue.toLowerCase())) ||
      (asesor.email && asesor.email.toLowerCase().includes(searchValue.toLowerCase())) ||
      (asesor.initials && asesor.initials.toLowerCase().includes(searchValue.toLowerCase())),
  )

  // Calcular el número total de páginas
  const totalPages = Math.ceil(filteredAsesores.length / pageSize)

  // Obtener los asesores para la página actual
  const paginatedAsesores = filteredAsesores.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Resetear a la primera página cuando cambia la búsqueda o el tamaño de página
  useEffect(() => {
    setCurrentPage(1)
  }, [searchValue, pageSize])

  const handleEdit = (asesor) => {
    // Dispatch an event to update the form
    window.dispatchEvent(new CustomEvent("edit-asesor", { detail: asesor }))
  }

  const handleDelete = async () => {
    if (!asesorToDelete) return

    setIsDeleting(true)

    try {
      // Eliminar asesor
      const { error } = await supabase.from("asesores").delete().eq("id", asesorToDelete.id)

      if (error) throw error

      // No necesitamos actualizar el estado aquí, ya que la suscripción en tiempo real lo hará
      // No necesitamos llamar a router.refresh() ya que estamos usando tiempo real
    } catch (error) {
      console.error("Error al eliminar asesor:", error)
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: error.message || "Ocurrió un error al eliminar el asesor",
      })
    } finally {
      setIsDeleting(false)
      setAsesorToDelete(null)
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
              placeholder="Buscar asesores..."
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
                {canManageAdvisors && <TableHead className="w-[80px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAsesores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManageAdvisors ? 3 : 2} className="h-24 text-center">
                    No hay asesores registrados
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAsesores.map((asesor) => (
                  <TableRow key={asesor.id}>
                    <TableCell>
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ backgroundColor: asesor.color || "#1a365d" }}
                        aria-hidden="true"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{asesor.name}</TableCell>
                    {canManageAdvisors && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(asesor)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAsesorToDelete(asesor)} className="text-red-600">
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
              Mostrando {paginatedAsesores.length} de {filteredAsesores.length} asesores
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

      <AlertDialog open={!!asesorToDelete} onOpenChange={() => setAsesorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el asesor
              {asesorToDelete?.name && ` "${asesorToDelete.name}"`}.
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
