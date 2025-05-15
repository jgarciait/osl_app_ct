"use client"

import { useState, useEffect, useRef } from "react"
import { createClientClient } from "@/lib/supabase/client"
import { AlertCircle, X, Info, AlertTriangle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { RealtimeChannel } from "@supabase/supabase-js"

export function SystemNotificationBanner() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClientClient()

  // Cargar notificaciones y configurar suscripción en tiempo real
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from("system_notifications")
          .select("*")
          .eq("is_active", true)
          .order("priority", { ascending: false })
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error al cargar notificaciones:", error)
          return
        }

        if (data && data.length > 0) {
          setNotifications(data)
        } else {
          setNotifications([])
        }
      } catch (error) {
        console.error("Error en el sistema de notificaciones:", error)
      }
    }

    // Cargar notificaciones iniciales
    fetchNotifications()

    // Configurar canal de tiempo real
    const channel = supabase
      .channel("system-notifications")
      .on(
        "postgres_changes",
        {
          event: "*", // Escuchar todos los eventos (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "system_notifications",
        },
        () => {
          // Simplemente recargamos todas las notificaciones cuando hay cambios
          fetchNotifications()
        },
      )
      .subscribe()

    channelRef.current = channel

    // Limpiar suscripción al desmontar
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [supabase])

  // Actualizar el índice actual cuando cambia la lista de notificaciones
  useEffect(() => {
    if (currentIndex >= notifications.length && notifications.length > 0) {
      setCurrentIndex(0)
    }
  }, [notifications, currentIndex])

  // Si no hay notificaciones, no mostrar nada
  if (!notifications.length) {
    return null
  }

  const currentNotification = notifications[currentIndex]
  if (!currentNotification) {
    return null
  }

  // Función para manejar el cierre de notificaciones
  const handleDismiss = async () => {
    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session?.user) return

      // Verificar si la notificación es descartable
      if (currentNotification.is_dismissible === false) {
        // Si no es descartable, solo registrar que se ha visto
        await supabase.from("user_notification_status").upsert({
          user_id: session.session.user.id,
          notification_id: currentNotification.id,
          is_seen: true,
          seen_at: new Date().toISOString(),
        })

        // Pasar a la siguiente notificación si hay más
        if (notifications.length > 1) {
          setCurrentIndex((prev) => (prev + 1) % notifications.length)
        }
        return
      }

      // Registrar que el usuario ha visto y descartado esta notificación
      await supabase.from("user_notification_status").upsert({
        user_id: session.session.user.id,
        notification_id: currentNotification.id,
        is_seen: true,
        seen_at: new Date().toISOString(),
        is_dismissed: true,
        dismissed_at: new Date().toISOString(),
      })

      // Eliminar de la lista local
      setNotifications((prev) => prev.filter((n) => n.id !== currentNotification.id))
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
