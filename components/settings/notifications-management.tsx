"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase/client"
import { useGroupPermissions } from "@/hooks/use-group-permissions"
import { Pencil, Trash2, PlusCircle, AlertCircle, Info, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useToast } from "@/components/ui/use-toast"

type Notification = {
  id: string
  title: string | null
  message: string
  type: "info" | "warning" | "error" | "success"
  is_active: boolean
  is_dismissible?: boolean // Hacemos que is_dismissible sea opcional
  created_at: string
  updated_at: string
  expires_at: string | null
  priority?: number // Hacemos que priority sea opcional
}

export function NotificationsManagement() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info" as "info" | "warning" | "error" | "success",
    is_active: true,
    is_dismissible: true,
    expires_at: "",
    priority: 1,
  })
  const [hasPriorityColumn, setHasPriorityColumn] = useState(false)
  const [hasDismissibleColumn, setHasDismissibleColumn] = useState(false)

  const { hasPermission } = useGroupPermissions()
  const { toast } = useToast()
  const supabase = createClientClient()

  const canManageNotifications = hasPermission("notifications", "manage")

  useEffect(() => {
    // Verificar si las columnas existen
    const checkColumns = async () => {
      try {
        // Intentamos hacer una consulta que incluya la columna priority
        const { data: priorityData, error: priorityError } = await supabase
          .from("system_notifications")
          .select("priority")
          .limit(1)

        // Si no hay error, la columna existe
        setHasPriorityColumn(!priorityError)

        // Intentamos hacer una consulta que incluya la columna is_dismissible
        const { data: dismissibleData, error: dismissibleError } = await supabase
          .from("system_notifications")
          .select("is_dismissible")
          .limit(1)

        // Si no hay error, la columna existe
        setHasDismissibleColumn(!dismissibleError)
      } catch (error) {
        console.error("Error checking columns:", error)
        setHasPriorityColumn(false)
        setHasDismissibleColumn(false)
      }
    }

    checkColumns()
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    setIsLoading(true)
    try {
      // Consulta básica sin ordenar por priority
      let query = supabase.from("system_notifications").select("*")

      // Primero ordenamos por is_active
      query = query.order("is_active", { ascending: false })

      // Si sabemos que la columna priority existe, ordenamos por ella
      if (hasPriorityColumn) {
        query = query.order("priority", { ascending: false })
      }

      // Finalmente ordenamos por fecha de creación
      query = query.order("created_at", { ascending: false })

      const { data, error } = await query

      if (error) {
        throw error
      }

      setNotifications(data || [])
    } catch (error) {
      console.error("Error fetching notifications:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las notificaciones",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const resetForm = () => {
    setFormData({
      title: "",
      message: "",
      type: "info",
      is_active: true,
      is_dismissible: true,
      expires_at: "",
      priority: 1,
    })
    setSelectedNotification(null)
  }

  const handleEdit = (notification: Notification) => {
    setSelectedNotification(notification)
    setFormData({
      title: notification.title || "",
      message: notification.message,
      type: notification.type,
      is_active: notification.is_active,
      is_dismissible: notification.is_dismissible ?? true, // Usar true como valor predeterminado si is_dismissible es undefined
      expires_at: notification.expires_at ? new Date(notification.expires_at).toISOString().split("T")[0] : "",
      priority: notification.priority ?? 1, // Usar 1 como valor predeterminado si priority es undefined
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (notification: Notification) => {
    setSelectedNotification(notification)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedNotification) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from("system_notifications").delete().eq("id", selectedNotification.id)

      if (error) {
        throw error
      }

      toast({
        title: "Notificación eliminada",
        description: "La notificación ha sido eliminada correctamente",
      })

      await fetchNotifications()
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la notificación",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validación básica
      if (!formData.message.trim()) {
        toast({
          title: "Campo requerido",
          description: "El mensaje de la notificación es obligatorio",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const notificationData: any = {
        title: formData.title.trim() || null,
        message: formData.message.trim(),
        type: formData.type,
        is_active: formData.is_active,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      }

      // Solo incluir priority si la columna existe
      if (hasPriorityColumn) {
        notificationData.priority = formData.priority
      }

      // Solo incluir is_dismissible si la columna existe
      if (hasDismissibleColumn) {
        notificationData.is_dismissible = formData.is_dismissible
      }

      let result

      if (selectedNotification) {
        // Actualizar notificación existente
        result = await supabase.from("system_notifications").update(notificationData).eq("id", selectedNotification.id)

        if (result.error) throw result.error

        toast({
          title: "Notificación actualizada",
          description: "La notificación ha sido actualizada correctamente",
        })
      } else {
        // Crear nueva notificación
        result = await supabase.from("system_notifications").insert([notificationData])

        if (result.error) throw result.error

        toast({
          title: "Notificación creada",
          description: "La notificación ha sido creada correctamente",
        })
      }

      await fetchNotifications()
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error saving notification:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la notificación",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "info":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Información
          </Badge>
        )
      case "warning":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Advertencia
          </Badge>
        )
      case "error":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Error
          </Badge>
        )
      case "success":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Éxito
          </Badge>
        )
      default:
        return <Badge variant="outline">Desconocido</Badge>
    }
  }

  if (!canManageNotifications) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Notificaciones</CardTitle>
          <CardDescription>Administre las notificaciones del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground">No tiene permisos para gestionar notificaciones</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Gestión de Notificaciones</CardTitle>
          <CardDescription>Administre las notificaciones globales del sistema</CardDescription>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setIsDialogOpen(true)
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Notificación
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-60">
            <p>Cargando notificaciones...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Info className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-6">No hay notificaciones configuradas</p>
            <Button
              onClick={() => {
                resetForm()
                setIsDialogOpen(true)
              }}
            >
              Crear primera notificación
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Título/Mensaje</TableHead>
                  {hasPriorityColumn && <TableHead>Prioridad</TableHead>}
                  <TableHead>Fecha de expiración</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notification) => (
                  <TableRow key={notification.id}>
                    <TableCell>
                      <Badge variant={notification.is_active ? "default" : "secondary"}>
                        {notification.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {getTypeIcon(notification.type)}
                        {getTypeBadge(notification.type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        {notification.title && <p className="font-medium">{notification.title}</p>}
                        <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                      </div>
                    </TableCell>
                    {hasPriorityColumn && (
                      <TableCell>{notification.priority !== undefined ? notification.priority : 1}</TableCell>
                    )}
                    <TableCell>
                      {notification.expires_at
                        ? format(new Date(notification.expires_at), "dd/MM/yyyy", { locale: es })
                        : "No expira"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(notification)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(notification)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Diálogo para crear/editar notificaciones */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedNotification ? "Editar Notificación" : "Nueva Notificación"}</DialogTitle>
            <DialogDescription>
              {selectedNotification
                ? "Actualice los detalles de la notificación existente"
                : "Cree una nueva notificación del sistema para todos los usuarios"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Título
                </Label>
                <Input
                  id="title"
                  name="title"
                  className="col-span-3"
                  placeholder="Título de la notificación (opcional)"
                  value={formData.title}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="message" className="text-right pt-2">
                  Mensaje*
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  className="col-span-3"
                  placeholder="Escriba el mensaje de la notificación"
                  rows={3}
                  required
                  value={formData.message}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Tipo
                </Label>
                <Select name="type" value={formData.type} onValueChange={(value) => handleSelectChange("type", value)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccione un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">
                      <div className="flex items-center">
                        <Info className="h-4 w-4 text-blue-500 mr-2" />
                        Información
                      </div>
                    </SelectItem>
                    <SelectItem value="warning">
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                        Advertencia
                      </div>
                    </SelectItem>
                    <SelectItem value="error">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                        Error
                      </div>
                    </SelectItem>
                    <SelectItem value="success">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        Éxito
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasPriorityColumn && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="priority" className="text-right">
                    Prioridad
                  </Label>
                  <Select
                    name="priority"
                    value={formData.priority.toString()}
                    onValueChange={(value) => handleSelectChange("priority", value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Seleccione una prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Normal (1)</SelectItem>
                      <SelectItem value="2">Media (2)</SelectItem>
                      <SelectItem value="3">Alta (3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="expires_at" className="text-right">
                  Fecha de expiración
                </Label>
                <Input
                  id="expires_at"
                  name="expires_at"
                  type="date"
                  className="col-span-3"
                  value={formData.expires_at}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="is_active" className="text-right">
                  Activa
                </Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleSwitchChange("is_active", checked)}
                  />
                  <Label htmlFor="is_active" className="text-sm text-muted-foreground">
                    {formData.is_active ? "La notificación está activa" : "La notificación está inactiva"}
                  </Label>
                </div>
              </div>

              {hasDismissibleColumn && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="is_dismissible" className="text-right">
                    Descartable
                  </Label>
                  <div className="flex items-center space-x-2 col-span-3">
                    <Switch
                      id="is_dismissible"
                      checked={formData.is_dismissible}
                      onCheckedChange={(checked) => handleSwitchChange("is_dismissible", checked)}
                    />
                    <Label htmlFor="is_dismissible" className="text-sm text-muted-foreground">
                      {formData.is_dismissible
                        ? "Los usuarios pueden cerrar esta notificación"
                        : "Los usuarios no pueden cerrar esta notificación"}
                    </Label>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Guardando..."
                  : selectedNotification
                    ? "Actualizar Notificación"
                    : "Crear Notificación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar esta notificación? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedNotification && (
              <div className="bg-muted rounded-md p-3">
                {selectedNotification.title && <p className="font-medium">{selectedNotification.title}</p>}
                <p className="text-sm mt-1">{selectedNotification.message}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={isSubmitting}>
              {isSubmitting ? "Eliminando..." : "Eliminar Notificación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
