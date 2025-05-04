"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { ClasificacionForm } from "@/components/clasificacion-form"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { createClientClient } from "@/lib/supabase-client"
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react"
import { useGroupPermissions } from "@/hooks/use-group-permissions"

interface Clasificacion {
  id: string
  nombre: string
  descripcion?: string
  created_at: string
}

export function ClasificacionesTable() {
  const [clasificaciones, setClasificaciones] = useState<Clasificacion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedClasificacion, setSelectedClasificacion] = useState<Clasificacion | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const { toast } = useToast()
  const supabase = createClientClient()
  const { hasPermission } = useGroupPermissions()
  const canManageClasificaciones = hasPermission("classifications", "manage")

  // Cargar clasificaciones
  const fetchClasificaciones = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from("clasificaciones").select("*").order("nombre")

      if (error) throw error

      setClasificaciones(data || [])
    } catch (error: any) {
      console.error("Error al cargar clasificaciones:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las clasificaciones",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchClasificaciones()

    // Set up real-time subscription
    const channel = supabase
      .channel("clasificaciones-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clasificaciones",
        },
        (payload) => {
          console.log("Cambio en tiempo real recibido:", payload)

          if (payload.eventType === "INSERT") {
            // Add new classification
            const newClasificacion = payload.new as Clasificacion
            setClasificaciones((prev) => {
              const updated = [...prev, newClasificacion]
              // Sort by name
              return updated.sort((a, b) => a.nombre.localeCompare(b.nombre))
            })

            toast({
              title: "Nueva clasificación",
              description: `Se ha agregado la clasificación "${newClasificacion.nombre}"`,
            })
          } else if (payload.eventType === "UPDATE") {
            // Update existing classification
            const updatedClasificacion = payload.new as Clasificacion
            setClasificaciones((prev) =>
              prev
                .map((item) => (item.id === updatedClasificacion.id ? updatedClasificacion : item))
                .sort((a, b) => a.nombre.localeCompare(b.nombre)),
            )

            toast({
              title: "Clasificación actualizada",
              description: `Se ha actualizado la clasificación "${updatedClasificacion.nombre}"`,
            })
          } else if (payload.eventType === "DELETE") {
            // Remove deleted classification
            const deletedClasificacion = payload.old as Clasificacion
            setClasificaciones((prev) => prev.filter((item) => item.id !== deletedClasificacion.id))

            toast({
              title: "Clasificación eliminada",
              description: `Se ha eliminado una clasificación`,
            })
          }
        },
      )
      .subscribe()

    // Clean up subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Manejar eliminación
  const handleDelete = async () => {
    if (!selectedClasificacion) return

    try {
      const { error } = await supabase.from("clasificaciones").delete().eq("id", selectedClasificacion.id)

      if (error) throw error

      // No need to call fetchClasificaciones, real-time will handle it
    } catch (error: any) {
      console.error("Error al eliminar clasificación:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Ocurrió un error al eliminar la clasificación",
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setSelectedClasificacion(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notas</CardTitle>
        {canManageClasificaciones && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nota</DialogTitle>
                <DialogDescription>Crea una nueva nota para las expresiones.</DialogDescription>
              </DialogHeader>
              <ClasificacionForm
                onSuccess={() => {
                  setIsAddDialogOpen(false)
                  // Real-time will handle the update
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Cargando notas...</span>
          </div>
        ) : clasificaciones.length === 0 ? (
          <div className="text-center p-4 text-gray-500">No hay notas disponibles</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                {canManageClasificaciones && <TableHead className="w-[100px]">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {clasificaciones.map((clasificacion) => (
                <TableRow key={clasificacion.id}>
                  <TableCell className="font-medium">{clasificacion.nombre}</TableCell>
                  <TableCell>{clasificacion.descripcion || "-"}</TableCell>
                  {canManageClasificaciones && (
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setSelectedClasificacion(clasificacion)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setSelectedClasificacion(clasificacion)
                            setIsDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Diálogo de edición */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Nota</DialogTitle>
              <DialogDescription>Actualiza los detalles de la nota.</DialogDescription>
            </DialogHeader>
            {selectedClasificacion && (
              <ClasificacionForm
                clasificacion={selectedClasificacion}
                onSuccess={() => {
                  setIsEditDialogOpen(false)
                  // Real-time will handle the update
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Diálogo de confirmación para eliminar */}
        <ConfirmationDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title="Eliminar Clasificación"
          description={`¿Estás seguro de que deseas eliminar la clasificación "${selectedClasificacion?.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
        />
      </CardContent>
    </Card>
  )
}
