import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PermissionsManagement } from "@/components/settings/permissions-management"
import { UserGroupsManagement } from "@/components/settings/user-groups-management"

export function PermissionsPlaceholder() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="permissions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="permissions">Permisos</TabsTrigger>
          <TabsTrigger value="user-groups">Asignación de Usuarios</TabsTrigger>
        </TabsList>
        <TabsContent value="permissions" className="mt-4">
          <PermissionsManagement />
        </TabsContent>
        <TabsContent value="user-groups" className="mt-4">
          <UserGroupsManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
