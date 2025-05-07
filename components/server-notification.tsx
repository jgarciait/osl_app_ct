"use client"

import { useEffect } from "react"
import { useNotify } from "@/lib/notifications"

interface ServerNotificationProps {
  type: "success" | "error" | "warning" | "info" | ""
  message: string
}

export default function ServerNotification({ type, message }: ServerNotificationProps) {
  const notify = useNotify()

  useEffect(() => {
    if (type && message) {
      switch (type) {
        case "success":
          notify.success(message)
          break
        case "error":
          notify.error(message)
          break
        case "warning":
          notify.warning(message)
          break
        case "info":
          notify.info(message)
          break
      }
    }
  }, [type, message, notify])

  return null
}
