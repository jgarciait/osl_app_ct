"use client"

import { useEffect } from "react"
import { useNotify } from "@/lib/notifications"

interface ServerNotificationProps {
  type: "default" | "success" | "destructive" | "warning" | "info" | ""
  message: string
  title?: string
}

export default function ServerNotification({ type, message, title }: ServerNotificationProps) {
  const notify = useNotify()

  useEffect(() => {
    if (type && message) {
      switch (type) {
        case "default":
          notify.toast(message, title)
          break
        case "success":
          notify.success(message, title)
          break
        case "destructive":
          notify.error(message, title)
          break
        case "warning":
          notify.warning(message, title)
          break
        case "info":
          notify.info(message, title)
          break
      }
    }
  }, [type, message, title, notify])

  return null
}
