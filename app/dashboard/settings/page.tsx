import { Suspense } from "react"
import { SettingsTabs } from "@/components/settings/settings-tabs"

export default function SettingsPage() {
  return (
    <>
      <div className="w-full py-6 px-4">
        <div className="space-y-6">
          <div>
            <p className="text-muted-foreground">Administre la configuración del sistema</p>
          </div>

          <Suspense fallback={<div>Cargando...</div>}>
            <SettingsTabs />
          </Suspense>
        </div>
      </div>
    </>
  )
}
