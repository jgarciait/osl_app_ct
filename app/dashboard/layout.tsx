import type React from "react"
import { AppSidebar, SidebarProvider } from "@/components/app-sidebar"
import { ProtectedRoute } from "@/components/protected-route"
import { GroupPermissionsProvider } from "@/hooks/use-group-permissions"
import { DashboardHeader } from "@/components/dashboard-header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <GroupPermissionsProvider>
      <SidebarProvider>
        <ProtectedRoute>
          <div className="flex h-screen overflow-auto w-full">
            <AppSidebar />
            <div className="flex-1 w-full">
              <DashboardHeader />
              <main className="p-4 md:p-6 w-full h-full">{children}</main>
            </div>
          </div>
        </ProtectedRoute>
      </SidebarProvider>
    </GroupPermissionsProvider>
  )
}
