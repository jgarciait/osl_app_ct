import { createServerClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { AuditTrailTabs } from "@/components/audit-trail-tabs"

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
    <div className="container mx-auto py-10">
      <AuditTrailTabs enableRealtime={true} />
    </div>
  )
}
