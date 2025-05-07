"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback } from "react"
import { X } from "lucide-react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

type NotificationType = "default" | "success" | "destructive" | "warning" | "info"

interface Notification {
  id: string
  type: NotificationType
  title?: string
  message: string
}

interface NotificationContextType {
  notifications: Notification[]
  addNotification: (type: NotificationType, message: string, title?: string) => void
  removeNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider")
  }
  return context
}

const notificationVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
        success: "border-green-500 bg-green-50 text-green-700",
        warning: "border-yellow-500 bg-yellow-50 text-yellow-700",
        info: "border-blue-500 bg-blue-50 text-blue-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback((type: NotificationType, message: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9)
    setNotifications((prev) => [...prev, { id, type, message, title }])

    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(id)
    }, 5000)
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  )
}

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification()

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={cn(
            notificationVariants({
              variant:
                notification.type === "success"
                  ? "success"
                  : notification.type === "destructive"
                    ? "destructive"
                    : notification.type === "warning"
                      ? "warning"
                      : notification.type === "info"
                        ? "info"
                        : "default",
            }),
          )}
          data-state="open"
        >
          <div className="grid gap-1">
            {notification.title && <div className="text-sm font-semibold">{notification.title}</div>}
            <div className="text-sm opacity-90">{notification.message}</div>
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
