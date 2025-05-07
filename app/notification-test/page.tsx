"use client"

import { useNotification } from "@/contexts/notification-context"
import { Button } from "@/components/ui/button"

export default function NotificationTestPage() {
  const { addNotification } = useNotification()

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Notification Test</h1>

      <div className="flex flex-col gap-4">
        <Button
          onClick={() => addNotification("success", "This is a success notification")}
          className="bg-green-500 hover:bg-green-600"
        >
          Show Success
        </Button>

        <Button
          onClick={() => addNotification("error", "This is an error notification")}
          className="bg-red-500 hover:bg-red-600"
        >
          Show Error
        </Button>

        <Button
          onClick={() => addNotification("warning", "This is a warning notification")}
          className="bg-yellow-500 hover:bg-yellow-600 text-white"
        >
          Show Warning
        </Button>

        <Button
          onClick={() => addNotification("info", "This is an info notification")}
          className="bg-blue-500 hover:bg-blue-600"
        >
          Show Info
        </Button>
      </div>
    </div>
  )
}
