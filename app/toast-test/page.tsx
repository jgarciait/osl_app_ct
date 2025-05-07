import { ToastTest } from "@/components/toast-test"

export default function ToastTestPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Toast Test Page</h1>
      <p className="mb-4">Click the buttons below to test toast notifications</p>
      <ToastTest />
    </div>
  )
}
