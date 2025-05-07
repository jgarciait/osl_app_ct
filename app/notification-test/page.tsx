"use client"

import { useNotify } from "@/lib/notifications"
import { Button } from "@/components/ui/button"

export default function NotificationTestPage() {
  const notify = useNotify()

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Notification Test</h1>

      <div className="flex flex-col gap-4">
        <Button onClick={() => notify.toast("This is a default toast notification", "Default Toast")} variant="outline">
          Show Default Toast
        </Button>

        <Button
          onClick={() => notify.success("Operation completed successfully", "Success")}
          variant="default"
          className="bg-green-600 hover:bg-green-700"
        >
          Show Success
        </Button>

        <Button onClick={() => notify.error("An error occurred", "Error")} variant="destructive">
          Show Error
        </Button>

        <Button
          onClick={() => notify.warning("This is a warning", "Warning")}
          variant="outline"
          className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
        >
          Show Warning
        </Button>

        <Button
          onClick={() => notify.info("Here's some information", "Info")}
          variant="outline"
          className="border-blue-500 text-blue-700 hover:bg-blue-50"
        >
          Show Info
        </Button>
      </div>
    </div>
  )
}
