"use client"
import { useState, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useCallback } from "react"
import { Loader2 } from "lucide-react"

// Import components directly instead of lazy loading
import { UsersManagement } from "@/components/settings/users-management"
import { GroupsManagement } from "@/components/settings/groups-management"
import { InvitationsManagement } from "@/components/settings/invitations-management"
import { PermissionsPlaceholder } from "@/components/settings/permissions-placeholder"
import { NotificationsManagement } from "@/components/settings/notifications-management"

// Loading component with fixed height to prevent layout shifts
const TabLoader = () => (
  <div className="flex justify-center items-center h-[600px] w-full">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)

export function SettingsTabs() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab") || "invitations"

  // State to track if component is mounted
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState(tab)

  // Only render content after component is mounted
  useEffect(() => {
    setMounted(true)

    // Cleanup function to handle unmounting properly
    return () => {
      setMounted(false)
    }
  }, [])

  // Update active tab when URL changes
  useEffect(() => {
    setActiveTab(tab)
  }, [tab])

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(name, value)
      return params.toString()
    },
    [searchParams],
  )

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`${pathname}?${createQueryString("tab", value)}`)
  }

  // Render a stable container with fixed dimensions
  return (
    <div className="w-full">
      <div className="grid w-full grid-cols-5 mb-6">
        <button
          onClick={() => handleTabChange("invitations")}
          className={`py-2 px-4 text-center ${activeTab === "invitations" ? "bg-primary text-white" : "bg-muted"}`}
        >
          Invitaciones
        </button>
        <button
          onClick={() => handleTabChange("users")}
          className={`py-2 px-4 text-center ${activeTab === "users" ? "bg-primary text-white" : "bg-muted"}`}
        >
          Usuarios
        </button>
        <button
          onClick={() => handleTabChange("groups")}
          className={`py-2 px-4 text-center ${activeTab === "groups" ? "bg-primary text-white" : "bg-muted"}`}
        >
          Grupos
        </button>
        <button
          onClick={() => handleTabChange("permissions")}
          className={`py-2 px-4 text-center ${activeTab === "permissions" ? "bg-primary text-white" : "bg-muted"}`}
        >
          Permisos
        </button>
        <button
          onClick={() => handleTabChange("notifications")}
          className={`py-2 px-4 text-center ${activeTab === "notifications" ? "bg-primary text-white" : "bg-muted"}`}
        >
          Notificaciones
        </button>
      </div>

      {/* Only render tab content after component is mounted */}
      {mounted ? (
        <div className="mt-6">
          {activeTab === "invitations" && (
            <div className="min-h-[600px] w-full">
              <InvitationsManagement />
            </div>
          )}

          {activeTab === "users" && (
            <div className="min-h-[600px] w-full">
              <UsersManagement />
            </div>
          )}

          {activeTab === "groups" && (
            <div className="min-h-[600px] w-full">
              <GroupsManagement />
            </div>
          )}

          {activeTab === "permissions" && (
            <div className="min-h-[600px] w-full">
              <PermissionsPlaceholder />
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="min-h-[600px] w-full">
              <NotificationsManagement />
            </div>
          )}
        </div>
      ) : (
        <TabLoader />
      )}
    </div>
  )
}
