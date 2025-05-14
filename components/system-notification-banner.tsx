"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase/client"
import { AlertCircle, X, Info, AlertTriangle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export function SystemNotificationBanner() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const supabase = createClientClient()

  // Cargar notificaciones activas
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        console.log("Intentando cargar notificaciones...")

        // 1. Obtener todas las notificaciones activas sin filtros complejos
        const { data, error } = await supabase.from("system_notifications").select("*").eq("is_active", true)

        if (error) {
          console.error("Error al cargar notificaciones:", error)
          return
        }

        console.log("Notificaciones cargadas:", data)

        if (data && data.length > 0) {
          setNotifications(data)
        }
      } catch (error) {
        console.error("Error en el sistema de notificaciones:", error)
      }
    }

    fetchNotifications()

    // Actualizar cada 30 segundos
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [supabase])

  // Si no hay notificaciones, no mostrar nada
  if (!notifications.length) {
    return null
  }

  const currentNotification = notifications[currentIndex]

  // Función para manejar el cierre de notificaciones
  const handleDismiss = async () => {
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session?.user) return

      // Registrar que el usuario ha visto esta notificación
      await supabase.from("user_notification_status").upsert({
        user_id: session.session.user.id,
        notification_id: currentNotification.id,
        is_seen: true,
        seen_at: new Date().toISOString(),
        is_dismissed: true,
        dismissed_at: new Date().toISOString(),
      })

      // Eliminar de la lista local
      setNotifications((prev) => prev.filter((_, idx) => idx !== currentIndex))
      if (currentIndex >= notifications.length - 1) {
        setCurrentIndex(Math.max(0, notifications.length - 2))
      }
    } catch (error) {
      console.error("Error al cerrar la notificación:", error)
    }
  }

  // Iconos según el tipo de notificación
  const getIcon = () => {
    switch (currentNotification.type) {
      case "info":
        return <Info className="h-5 w-5" />
      case "warning":
        return <AlertTriangle className="h-5 w-5" />
      case "error":
        return <AlertCircle className="h-5 w-5" />
      case "success":
        return <CheckCircle className="h-5 w-5" />
      default:
        return <Info className="h-5 w-5" />
    }
  }

  // Estilos según el tipo de notificación
  const getStyles = () => {
    switch (currentNotification.type) {
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800"
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800"
      case "error":
        return "bg-red-50 border-red-200 text-red-800"
      case "success":
        return "bg-green-50 border-green-200 text-green-800"
      default:
        return "bg-blue-50 border-blue-200 text-blue-800"
    }
  }

  return (
    <div className="w-full px-4 py-2 border-b border-gray-200">
      <Alert className={`relative ${getStyles()}`} variant="default">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{getIcon()}</div>
          <div className="flex-1">
            {currentNotification.title && <AlertTitle className="font-medium">{currentNotification.title}</AlertTitle>}
            <AlertDescription className="mt-1 text-sm">{currentNotification.message}</AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 -my-2 -mr-2 h-8 w-8 opacity-70 hover:opacity-100"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
          </Button>
        </div>

        {notifications.length > 1 && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex space-x-1 mt-1">
            {notifications.map((_, index) => (
              <button
                key={index}
                className={`h-1.5 rounded-full ${
                  index === currentIndex ? "w-4 bg-current opacity-70" : "w-1.5 bg-current opacity-30"
                }`}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        )}
      </Alert>
    </div>
  )
}
