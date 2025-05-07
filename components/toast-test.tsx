"use client"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export function ToastTest() {
  const { toast } = useToast()

  const showToast = () => {
    toast({
      title: "Toast Test",
      description: "This is a test toast notification",
    })
  }

  const showErrorToast = () => {
    toast({
      variant: "destructive",
      title: "Error Toast",
      description: "This is an error toast notification",
    })
  }

  return (
    <div className="flex gap-4">
      <Button onClick={showToast}>Show Toast</Button>
      <Button variant="destructive" onClick={showErrorToast}>
        Show Error Toast
      </Button>
    </div>
  )
}
