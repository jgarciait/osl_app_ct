"use client"

import { useEffect, useState } from "react"
import { createClientClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SystemNotificationBanner } from "@/components/system-notification-banner"

export default function NotificationDebugPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [userStatus, setUserStatus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClientClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Obtener la sesión actual
        const { data: sessionData } = await supabase.auth.getSession()
        const currentUserId = sessionData.session?.user?.id || null
        setUserId(currentUserId)

        // Obtener todas las notificaciones
        const { data: notificationsData, error: notificationsError } = await supabase
          .from("system_notifications")
          .select("*")
          .order("created_at", { ascending: false })

        if (notificationsError) {
          throw new Error(`Error al cargar notificaciones: ${notificationsError.message}`)
        }

        setNotifications(notificationsData || [])

        // Si hay un usuario logueado, obtener su estado de notificaciones
        if (currentUserId) {
          const { data: statusData, error: statusError } = await supabase
            .from("user_notification_status")
            .select("*")
            .eq("user_id", currentUserId)

          if (statusError) {
            throw new Error(`Error al cargar estados de notificaciones: ${statusError.message}`)
          }

          setUserStatus(statusData || [])
        }
      } catch (err: any) {
        console.error("Error en la página de depuración:", err)
        setError(err.message || "Error desconocido")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  const handleCreateTestNotification = async () => {
    try {
      const { error } = await supabase.from("system_notifications").insert([
        {
          title: "Notificación de Prueba",
          message: "Esta es una notificación creada desde la página de depuración.",
          type: "info",
          is_active: true,
        },
      ])

      if (error) throw error

      // Recargar los datos
      window.location.reload()
    } catch (err: any) {
      console.error("Error al crear notificación:", err)
      setError(`Error al crear notificación: ${err.message}`)
    }
  }

  const handleClearUserStatus = async () => {
    if (!userId) return

    try {
      const { error } = await supabase.from("user_notification_status").delete().eq("user_id", userId)

      if (error) throw error

      // Recargar los datos
      window.location.reload()
    } catch (err: any) {
      console.error("Error al limpiar estados:", err)
      setError(`Error al limpiar estados: ${err.message}`)
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Depuración de Notificaciones</h1>

      {/* Mostrar el banner de notificaciones para pruebas */}
      <div className="mb-8 border rounded-lg">
        <h2 className="p-4 font-semibold border-b">Vista previa del banner:</h2>
        <SystemNotificationBanner />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mb-6">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Notificaciones del Sistema</CardTitle>
            <CardDescription>Total: {notifications.length} notificación(es)</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Cargando...</p>
            ) : notifications.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">No hay notificaciones</p>
                <Button onClick={handleCreateTestNotification}>Crear Notificación de Prueba</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div key={notification.id} className="border rounded-md p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{notification.title || "Sin título"}</p>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                      </div>
                      <Badge variant={notification.is_active ? "default" : "secondary"}>
                        {notification.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <p>Tipo: {notification.type}</p>
                      <p>Creada: {new Date(notification.created_at).toLocaleString()}</p>
                      {notification.priority !== undefined && <p>Prioridad: {notification.priority}</p>}
                      {notification.is_dismissible !== undefined && (
                        <p>Descartable: {notification.is_dismissible ? "Sí" : "No"}</p>
                      )}
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <Button onClick={handleCreateTestNotification}>Crear Otra Notificación</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado del Usuario</CardTitle>
            <CardDescription>Usuario ID: {userId || "No hay sesión activa"}</CardDescription>
          </CardHeader>
          <CardContent>
            {!userId ? (
              <p className="text-muted-foreground">Inicie sesión para ver su estado de notificaciones</p>
            ) : loading ? (
              <p>Cargando...</p>
            ) : userStatus.length === 0 ? (
              <p className="text-muted-foreground">No hay registros de estado para este usuario</p>
            ) : (
              <div className="space-y-4">
                {userStatus.map((status) => (
                  <div key={status.id} className="border rounded-md p-3">
                    <p className="text-sm">Notificación ID: {status.notification_id}</p>
                    <p className="text-sm">
                      Vista: {status.is_seen ? "Sí" : "No"}
                      {status.seen_at && ` (${new Date(status.seen_at).toLocaleString()})`}
                    </p>
                    <p className="text-sm">
                      Cerrada: {status.is_dismissed ? "Sí" : "No"}
                      {status.dismissed_at && ` (${new Date(status.dismissed_at).toLocaleString()})`}
                    </p>
                  </div>
                ))}
                <div className="pt-2">
                  <Button variant="outline" onClick={handleClearUserStatus}>
                    Limpiar Estados del Usuario
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
