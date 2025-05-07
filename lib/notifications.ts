import { useNotification } from "@/contexts/notification-context"

// This is a client component hook
export const useNotify = () => {
  const { addNotification } = useNotification()

  return {
    success: (message: string) => addNotification("success", message),
    error: (message: string) => addNotification("error", message),
    warning: (message: string) => addNotification("warning", message),
    info: (message: string) => addNotification("info", message),
  }
}

// For server components or places where hooks can't be used
export const createServerNotification = () => {
  // This will be used to pass notification data from server to client
  return {
    type: "" as "success" | "error" | "warning" | "info" | "",
    message: "",
    setSuccess: function (message: string) {
      this.type = "success"
      this.message = message
      return this
    },
    setError: function (message: string) {
      this.type = "error"
      this.message = message
      return this
    },
    setWarning: function (message: string) {
      this.type = "warning"
      this.message = message
      return this
    },
    setInfo: function (message: string) {
      this.type = "info"
      this.message = message
      return this
    },
    clear: function () {
      this.type = ""
      this.message = ""
      return this
    },
  }
}
