import { useNotification } from "@/contexts/notification-context"

// This is a client component hook
export const useNotify = () => {
  const { addNotification } = useNotification()

  return {
    toast: (message: string, title?: string) => addNotification("default", message, title),
    success: (message: string, title?: string) => addNotification("success", message, title),
    error: (message: string, title?: string) => addNotification("destructive", message, title),
    warning: (message: string, title?: string) => addNotification("warning", message, title),
    info: (message: string, title?: string) => addNotification("info", message, title),
  }
}

// For server components or places where hooks can't be used
export const createServerNotification = () => {
  // This will be used to pass notification data from server to client
  return {
    type: "" as "default" | "success" | "destructive" | "warning" | "info" | "",
    message: "",
    title: "",
    setToast: function (message: string, title?: string) {
      this.type = "default"
      this.message = message
      this.title = title || ""
      return this
    },
    setSuccess: function (message: string, title?: string) {
      this.type = "success"
      this.message = message
      this.title = title || ""
      return this
    },
    setError: function (message: string, title?: string) {
      this.type = "destructive"
      this.message = message
      this.title = title || ""
      return this
    },
    setWarning: function (message: string, title?: string) {
      this.type = "warning"
      this.message = message
      this.title = title || ""
      return this
    },
    setInfo: function (message: string, title?: string) {
      this.type = "info"
      this.message = message
      this.title = title || ""
      return this
    },
    clear: function () {
      this.type = ""
      this.message = ""
      this.title = ""
      return this
    },
  }
}
