import { createServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { AuditTrailTabs } from "@/components/audit-trail-tabs"
import { PermissionGuard } from "@/components/permission-guard"

export const dynamic = "force-dynamic"

export default async function AuditTrailPage() {
  const supabase = createServerClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <PermissionGuard
      resource="audit_trail"
      action="view"
      fallback={<div>No tienes permiso para ver esta página</div>}
      title="Auditoría del Sistema"
    >
      <div className="container mx-auto py-10">
        <AuditTrailTabs enableRealtime={true} />
      </div>
    </PermissionGuard>
  )
}
