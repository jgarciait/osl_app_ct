"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Trash2, Plus, Edit } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

export default function EstatusPeticionesForm() {
  const [estatus, setEstatus] = useState([])
  const [loading, setLoading] = useState(true)
  const [newEstatus, setNewEstatus] = useState({ nombre: "", color: "#3B82F6" })
  const [editingEstatus, setEditingEstatus] = useState(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAlertDialogOpen, setIsAlertDialogOpen] = useState(false)
  const [estatusToDelete, setEstatusToDelete] = useState(null)
  const [isCheckingUsage, setIsCheckingUsage] = useState(false)
  const [usageCount, setUsageCount] = useState(0)

  const supabase = createClientClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchEstatus()
  }, [])

  const fetchEstatus = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("peticionEstatus")
        .select("*")
        .order("created_at", { ascending: true })

      if (error) throw error
      setEstatus(data || [])
    } catch (error) {
      console.error("Error al cargar estatus:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los estatus. Por favor, intente nuevamente.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddEstatus = async () => {
    try {
      if (!newEstatus.nombre.trim()) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "El nombre del estatus no puede estar vacío.",
        })
        return
      }

      const { data, error } = await supabase
        .from("peticionEstatus")
        .insert([
          {
            nombre: newEstatus.nombre.trim(),
            color: newEstatus.color,
          },
        ])
        .select()

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Estatus creado correctamente.",
      })

      setNewEstatus({ nombre: "", color: "#3B82F6" })
      fetchEstatus()
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error al crear estatus:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el estatus. Por favor, intente nuevamente.",
      })
    }
  }

  const handleUpdateEstatus = async () => {
    try {
      if (!editingEstatus.nombre.trim()) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "El nombre del estatus no puede estar vacío.",
        })
        return
      }

      const { error } = await supabase
        .from("peticionEstatus")
        .update({
          nombre: editingEstatus.nombre.trim(),
          color: editingEstatus.color,
        })
        .eq("id", editingEstatus.id)

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Estatus actualizado correctamente.",
      })

      setEditingEstatus(null)
      fetchEstatus()
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error al actualizar estatus:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el estatus. Por favor, intente nuevamente.",
      })
    }
  }

  const checkEstatusUsage = async (estatusId) => {
    try {
      setIsCheckingUsage(true)
      const { count, error } = await supabase
        .from("peticiones")
        .select("*", { count: "exact", head: true })
        .eq("peticionEstatus_id", estatusId)

      if (error) throw error

      setUsageCount(count || 0)
      return count
    } catch (error) {
      console.error("Error al verificar uso del estatus:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo verificar el uso del estatus.",
      })
      return 0
    } finally {
      setIsCheckingUsage(false)
    }
  }

  const handleDeleteEstatus = async () => {
    try {
      if (!estatusToDelete) return

      const { error } = await supabase.from("peticionEstatus").delete().eq("id", estatusToDelete.id)

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Estatus eliminado correctamente.",
      })

      fetchEstatus()
      setEstatusToDelete(null)
      setIsAlertDialogOpen(false)
    } catch (error) {
      console.error("Error al eliminar estatus:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el estatus. Por favor, intente nuevamente.",
      })
    }
  }

  const openDeleteDialog = async (estatus) => {
    setEstatusToDelete(estatus)
    const count = await checkEstatusUsage(estatus.id)
    setIsAlertDialogOpen(true)
  }

  const openEditDialog = (estatus) => {
    setEditingEstatus({ ...estatus })
    setIsDialogOpen(true)
  }

  const openAddDialog = () => {
    setEditingEstatus(null)
    setNewEstatus({ nombre: "", color: "#3B82F6" })
    setIsDialogOpen(true)
  }

  // Función para determinar si el texto debe ser blanco o negro según el color de fondo
  const getTextColor = (bgColor) => {
    // Convertir el color hexadecimal a RGB
    const hex = bgColor.replace("#", "")
    const r = Number.parseInt(hex.substring(0, 2), 16)
    const g = Number.parseInt(hex.substring(2, 4), 16)
    const b = Number.parseInt(hex.substring(4, 6), 16)

    // Calcular la luminosidad (fórmula estándar)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    // Si la luminosidad es mayor a 0.5, el fondo es claro, por lo que el texto debe ser negro
    return luminance > 0.5 ? "#000000" : "#FFFFFF"
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Estatus de Peticiones</h1>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Estatus
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {estatus.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{item.nombre}</CardTitle>
                <CardDescription>ID: {item.id}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center mb-4">
                  <div
                    className="w-full h-10 rounded flex items-center justify-center text-sm font-medium"
                    style={{
                      backgroundColor: item.color,
                      color: getTextColor(item.color),
                    }}
                  >
                    {item.nombre}
                  </div>
                </div>
                <div className="flex items-center">
                  <Label className="mr-2">Color:</Label>
                  <div className="flex items-center">
                    <div
                      className="w-6 h-6 rounded-full mr-2 border border-gray-300"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span>{item.color}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                  <Edit className="h-4 w-4 mr-1" /> Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => openDeleteDialog(item)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Diálogo para añadir/editar estatus */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEstatus ? "Editar Estatus" : "Nuevo Estatus"}</DialogTitle>
            <DialogDescription>
              {editingEstatus
                ? "Modifique los detalles del estatus y guarde los cambios."
                : "Complete los detalles para crear un nuevo estatus."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={editingEstatus ? editingEstatus.nombre : newEstatus.nombre}
                onChange={(e) => {
                  if (editingEstatus) {
                    setEditingEstatus({ ...editingEstatus, nombre: e.target.value })
                  } else {
                    setNewEstatus({ ...newEstatus, nombre: e.target.value })
                  }
                }}
                placeholder="Nombre del estatus"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="color"
                  type="color"
                  className="w-16 h-10 p-1"
                  value={editingEstatus ? editingEstatus.color : newEstatus.color}
                  onChange={(e) => {
                    if (editingEstatus) {
                      setEditingEstatus({ ...editingEstatus, color: e.target.value })
                    } else {
                      setNewEstatus({ ...newEstatus, color: e.target.value })
                    }
                  }}
                />
                <Input
                  value={editingEstatus ? editingEstatus.color : newEstatus.color}
                  onChange={(e) => {
                    if (editingEstatus) {
                      setEditingEstatus({ ...editingEstatus, color: e.target.value })
                    } else {
                      setNewEstatus({ ...newEstatus, color: e.target.value })
                    }
                  }}
                  placeholder="#RRGGBB"
                />
              </div>
            </div>
            <div className="mt-2">
              <Label>Vista previa</Label>
              <div
                className="w-full h-10 mt-2 rounded flex items-center justify-center text-sm font-medium"
                style={{
                  backgroundColor: editingEstatus ? editingEstatus.color : newEstatus.color,
                  color: getTextColor(editingEstatus ? editingEstatus.color : newEstatus.color),
                }}
              >
                {editingEstatus ? editingEstatus.nombre || "Vista previa" : newEstatus.nombre || "Vista previa"}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={editingEstatus ? handleUpdateEstatus : handleAddEstatus}>
              {editingEstatus ? "Guardar cambios" : "Crear estatus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={isAlertDialogOpen} onOpenChange={setIsAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este estatus?</AlertDialogTitle>
            <AlertDialogDescription>
              {isCheckingUsage ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                  Verificando uso del estatus...
                </div>
              ) : usageCount > 0 ? (
                <div className="text-red-500">
                  Este estatus está siendo utilizado en {usageCount} petición(es). Si lo elimina, esas peticiones
                  quedarán sin estatus asignado.
                </div>
              ) : (
                "Esta acción no se puede deshacer."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEstatus} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
