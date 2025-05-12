"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Search, MoreHorizontal, Plus, Edit, Trash, Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Recursos disponibles en el sistema
const RESOURCES = [
  { value: "petitions", label: "Peticiones" },
  { value: "legislators", label: "Legisladores" },
  { value: "topics", label: "Temas" },
  { value: "classifications", label: "Clasificación" },
  { value: "petition_status", label: "Estatus de Peticiones" },
  { value: "advisors", label: "Asesores" },
  { value: "settings", label: "Configuración" },
  { value: "documents", label: "Documentos" },
]

// Acciones disponibles en el sistema
const ACTIONS = [
  { value: "view", label: "Ver" },
  { value: "manage", label: "Gestionar" },
]

export function PermissionsManagement() {
  const { toast } = useToast()
  const supabase = createClientClient()

  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedPermission, setSelectedPermission] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    resource: "",
    action: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("permissions")
  const [groupPermissions, setGroupPermissions] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [availablePermissions, setAvailablePermissions] = useState([])
  const [selectedPermissionId, setSelectedPermissionId] = useState("")
  const [isAddGroupPermissionDialogOpen, setIsAddGroupPermissionDialogOpen] = useState(false)
  const [permissionSearchQuery, setPermissionSearchQuery] = useState("")

  // Cargar permisos al montar el componente
  useEffect(() => {
    if (activeTab === "permissions") {
      fetchPermissions()
    } else if (activeTab === "group-permissions") {
      fetchGroups()
    }
  }, [activeTab])

  useEffect(() => {
    // Load permissions when component mounts
    fetchPermissions()
  }, [])

  // Función para obtener permisos
  const fetchPermissions = async () => {
    setLoading(true)
    try {
      // Obtener permisos directamente filtrando por deparment_id = 2
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .eq("deparment_id", 2)
        .order("resource", { ascending: true })

      if (error) throw error

      setPermissions(data || [])
    } catch (error) {
      console.error("Error fetching permissions:", error)
      toast({
        variant: "destructive",
        title: "Error al cargar permisos",
        description: error.message || "No se pudieron cargar los permisos",
      })
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener grupos
  const fetchGroups = async () => {
    setLoading(true)
    try {
      console.log("Obteniendo grupos del departamento 2...")

      // Paso 1: Obtener los IDs de los grupos asociados al departamento 2
      const { data: departmentGroups, error: deptError } = await supabase
        .from("departments_group")
        .select("group_id")
        .eq("department_id", 2)

      if (deptError) {
        console.error("Error obteniendo grupos del departamento:", deptError)
        throw deptError
      }

      if (!departmentGroups || departmentGroups.length === 0) {
        console.log("No se encontraron grupos asociados al departamento 2")
        setGroups([])
        setLoading(false)
        return
      }

      // Extraer los IDs de los grupos
      const groupIds = departmentGroups.map((dg) => dg.group_id)
      console.log(`Se encontraron ${groupIds.length} grupos asociados al departamento 2:`, groupIds)

      // Paso 2: Obtener los detalles de los grupos
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds)
        .order("name", { ascending: true })

      if (groupsError) {
        console.error("Error obteniendo detalles de los grupos:", groupsError)
        throw groupsError
      }

      console.log(`Se obtuvieron ${groupsData?.length || 0} grupos del departamento 2`)
      setGroups(groupsData || [])
    } catch (error) {
      console.error("Error fetching groups:", error)
      toast({
        variant: "destructive",
        title: "Error al cargar grupos",
        description: error.message || "No se pudieron cargar los grupos del departamento 2",
      })
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener permisos de un grupo
  const fetchGroupPermissions = async (groupId) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("group_permissions")
        .select(
          `
    id,
    permission_id,
    group_id,
    permissions (
      id,
      name,
      description,
      resource,
      action
    )
  `,
        )
        .eq("group_id", groupId)

      if (error) throw error

      // Formatear los datos para mostrar
      const formattedData = data.map((item) => ({
        id: item.id,
        permission_id: item.permission_id,
        name: item.permissions.name,
        description: item.permissions.description,
        resource: item.permissions.resource,
        action: item.permissions.action,
      }))

      setGroupPermissions(formattedData)

      // Obtener permisos disponibles (que no están asignados al grupo)
      // Solo permisos del departamento 2
      const { data: allPermissions, error: permissionsError } = await supabase
        .from("permissions")
        .select("*")
        .eq("deparment_id", 2)
        .order("resource", { ascending: true })

      if (permissionsError) throw permissionsError

      console.log("All Permissions:", allPermissions) // Add this line to log all permissions

      // Filtrar permisos que ya están asignados al grupo
      const assignedPermissionIds = formattedData.map((item) => item.permission_id)
      const available = allPermissions.filter((permission) => !assignedPermissionIds.includes(permission.id))

      console.log("Available Permissions:", available) // Add this line to log available permissions

      setAvailablePermissions(available)
    } catch (error) {
      console.error("Error fetching group permissions:", error)
      toast({
        variant: "destructive",
        title: "Error al cargar permisos del grupo",
        description: error.message || "No se pudieron cargar los permisos del grupo",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filtrar permisos según la búsqueda
  const filteredPermissions = permissions.filter(
    (permission) =>
      permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.action.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Filtrar permisos disponibles según la búsqueda
  const filteredAvailablePermissions = availablePermissions.filter(
    (permission) =>
      permission.name.toLowerCase().includes(permissionSearchQuery.toLowerCase()) ||
      permission.description?.toLowerCase().includes(permissionSearchQuery.toLowerCase()) ||
      permission.resource.toLowerCase().includes(permissionSearchQuery.toLowerCase()) ||
      permission.action.toLowerCase().includes(permissionSearchQuery.toLowerCase()) ||
      RESOURCES.find((r) => r.value === permission.resource)
        ?.label.toLowerCase()
        .includes(permissionSearchQuery.toLowerCase()) ||
      ACTIONS.find((a) => a.value === permission.action)
        ?.label.toLowerCase()
        .includes(permissionSearchQuery.toLowerCase()),
  )

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Manejar cambios en selects
  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Abrir diálogo de edición
  const handleEditPermission = (permission) => {
    setSelectedPermission(permission)
    setFormData({
      name: permission.name,
      description: permission.description || "",
      resource: permission.resource,
      action: permission.action,
    })
    setIsEditDialogOpen(true)
  }

  // Abrir diálogo de eliminación
  const handleDeletePermission = (permission) => {
    setSelectedPermission(permission)
    setIsDeleteDialogOpen(true)
  }

  // Crear nuevo permiso
  const handleCreatePermission = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validar datos
      if (!formData.name || !formData.resource || !formData.action) {
        throw new Error("Por favor complete todos los campos requeridos")
      }

      // Crear permiso en la base de datos
      const { data, error } = await supabase
        .from("permissions")
        .insert({
          name: formData.name,
          description: formData.description,
          resource: formData.resource,
          action: formData.action,
          deparment_id: 2, // Asignar al departamento 2
        })
        .select()

      if (error) throw error

      toast({
        title: "Permiso creado",
        description: "El permiso ha sido creado exitosamente",
      })

      // Cerrar diálogo y recargar permisos
      setIsAddDialogOpen(false)
      fetchPermissions()

      // Limpiar formulario
      setFormData({
        name: "",
        description: "",
        resource: "",
        action: "",
      })
    } catch (error) {
      console.error("Error creating permission:", error)
      toast({
        variant: "destructive",
        title: "Error al crear permiso",
        description: error.message || "No se pudo crear el permiso",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Actualizar permiso existente
  const handleUpdatePermission = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validar datos
      if (!formData.name || !formData.resource || !formData.action) {
        throw new Error("Por favor complete todos los campos requeridos")
      }

      // Actualizar permiso en la base de datos
      const { error } = await supabase
        .from("permissions")
        .update({
          name: formData.name,
          description: formData.description,
          resource: formData.resource,
          action: formData.action,
          updated_at: new Date(),
          // No actualizamos deparment_id para mantener la asignación al departamento 2
        })
        .eq("id", selectedPermission.id)

      if (error) throw error

      toast({
        title: "Permiso actualizado",
        description: "El permiso ha sido actualizado exitosamente",
      })

      // Cerrar diálogo y recargar permisos
      setIsEditDialogOpen(false)
      fetchPermissions()
    } catch (error) {
      console.error("Error updating permission:", error)
      toast({
        variant: "destructive",
        title: "Error al actualizar permiso",
        description: error.message || "No se pudo actualizar el permiso",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Eliminar permiso
  const handleConfirmDelete = async () => {
    setIsSubmitting(true)

    try {
      // Verificar si el permiso está asignado a algún grupo
      const { data: groupPermissions, error: groupPermissionsError } = await supabase
        .from("group_permissions")
        .select("id")
        .eq("permission_id", selectedPermission.id)
        .limit(1)

      if (groupPermissionsError) throw groupPermissionsError

      if (groupPermissions && groupPermissions.length > 0) {
        throw new Error("No se puede eliminar un permiso que está asignado a grupos")
      }

      // Eliminar permiso
      const { error } = await supabase.from("permissions").delete().eq("id", selectedPermission.id)

      if (error) throw error

      toast({
        title: "Permiso eliminado",
        description: "El permiso ha sido eliminado exitosamente",
      })

      // Cerrar diálogo y recargar permisos
      setIsDeleteDialogOpen(false)
      fetchPermissions()
    } catch (error) {
      console.error("Error deleting permission:", error)
      toast({
        variant: "destructive",
        title: "Error al eliminar permiso",
        description: error.message || "No se pudo eliminar el permiso",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Seleccionar grupo y cargar sus permisos
  const handleSelectGroup = (groupId) => {
    const group = groups.find((g) => g.id === groupId)
    setSelectedGroup(group)
    fetchGroupPermissions(groupId)
  }

  // Añadir permiso a grupo
  const handleAddPermissionToGroup = async () => {
    if (!selectedGroup || !selectedPermissionId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor seleccione un permiso",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Verificar si el permiso ya está asignado al grupo
      const { data: existingPermission, error: checkError } = await supabase
        .from("group_permissions")
        .select("id")
        .eq("group_id", selectedGroup.id)
        .eq("permission_id", selectedPermissionId)
        .limit(1)

      if (checkError) throw checkError

      if (existingPermission && existingPermission.length > 0) {
        throw new Error("Este permiso ya está asignado al grupo")
      }

      // Asignar permiso al grupo
      const { error } = await supabase.from("group_permissions").insert({
        group_id: selectedGroup.id,
        permission_id: selectedPermissionId,
      })

      if (error) throw error

      toast({
        title: "Permiso asignado",
        description: "El permiso ha sido asignado al grupo exitosamente",
      })

      // Cerrar diálogo y recargar permisos del grupo
      setIsAddGroupPermissionDialogOpen(false)
      fetchGroupPermissions(selectedGroup.id)
      setSelectedPermissionId("")
      setPermissionSearchQuery("")
    } catch (error) {
      console.error("Error assigning permission:", error)
      toast({
        variant: "destructive",
        title: "Error al asignar permiso",
        description: error.message || "No se pudo asignar el permiso al grupo",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Eliminar permiso de grupo
  const handleRemovePermissionFromGroup = async (groupPermissionId) => {
    setIsSubmitting(true)

    try {
      // Eliminar asignación de permiso
      const { error } = await supabase.from("group_permissions").delete().eq("id", groupPermissionId)

      if (error) throw error

      toast({
        title: "Permiso removido",
        description: "El permiso ha sido removido del grupo exitosamente",
      })

      // Recargar permisos del grupo
      fetchGroupPermissions(selectedGroup.id)
    } catch (error) {
      console.error("Error removing permission:", error)
      toast({
        variant: "destructive",
        title: "Error al remover permiso",
        description: error.message || "No se pudo remover el permiso del grupo",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="permissions">Permisos</TabsTrigger>
          <TabsTrigger value="group-permissions">Asignación de Permisos</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="mt-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full sm:w-[350px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar permisos..."
                className="w-full pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#1a365d] hover:bg-[#15294d]">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Permiso
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Permiso</DialogTitle>
                  <DialogDescription>
                    Complete el formulario para crear un nuevo permiso en el sistema.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreatePermission}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Nombre
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="description" className="text-right">
                        Descripción
                      </Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="col-span-3"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="resource" className="text-right">
                        Recurso
                      </Label>
                      <Select
                        name="resource"
                        value={formData.resource}
                        onValueChange={(value) => handleSelectChange("resource", value)}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Seleccione un recurso" />
                        </SelectTrigger>
                        <SelectContent>
                          {RESOURCES.map((resource) => (
                            <SelectItem key={resource.value} value={resource.value}>
                              {resource.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="action" className="text-right">
                        Acción
                      </Label>
                      <Select
                        name="action"
                        value={formData.action}
                        onValueChange={(value) => handleSelectChange("action", value)}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Seleccione una acción" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTIONS.map((action) => (
                            <SelectItem key={action.value} value={action.value}>
                              {action.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-[#1a365d] hover:bg-[#15294d]">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creando...
                        </>
                      ) : (
                        "Crear Permiso"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="mt-4">
            <CardContent className="p-0">
              {/* Fixed height container to prevent layout shifts */}
              <div className="h-[500px] w-full" style={{ overflow: "auto" }}>
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr>
                      <th className="text-left p-3 border-b">Nombre</th>
                      <th className="text-left p-3 border-b">Recurso</th>
                      <th className="text-left p-3 border-b">Acción</th>
                      <th className="text-left p-3 border-b">Descripción</th>
                      <th className="text-left p-3 border-b w-[80px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="h-24 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : filteredPermissions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="h-24 text-center">
                          No se encontraron permisos
                        </td>
                      </tr>
                    ) : (
                      filteredPermissions.map((permission) => (
                        <tr key={permission.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-medium">{permission.name}</td>
                          <td className="p-3">
                            {RESOURCES.find((r) => r.value === permission.resource)?.label || permission.resource}
                          </td>
                          <td className="p-3">
                            {ACTIONS.find((a) => a.value === permission.action)?.label || permission.action}
                          </td>
                          <td className="p-3">{permission.description || "-"}</td>
                          <td className="p-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Acciones</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditPermission(permission)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeletePermission(permission)}
                                  className="text-red-600"
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="group-permissions" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-4">Grupos</h3>
                  <div className="space-y-2">
                    {loading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : groups.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground">
                        No hay grupos asociados al departamento 2
                      </p>
                    ) : (
                      groups.map((group) => (
                        <Button
                          key={group.id}
                          variant={selectedGroup?.id === group.id ? "default" : "outline"}
                          className="w-full justify-start"
                          onClick={() => handleSelectGroup(group.id)}
                        >
                          {group.name}
                        </Button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">
                      {selectedGroup ? `Permisos de ${selectedGroup.name}` : "Seleccione un grupo"}
                    </h3>
                    {selectedGroup && (
                      <Dialog open={isAddGroupPermissionDialogOpen} onOpenChange={setIsAddGroupPermissionDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-[#1a365d] hover:bg-[#15294d]" disabled={!selectedGroup}>
                            <Plus className="mr-2 h-4 w-4" />
                            Añadir Permiso
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Añadir Permiso al Grupo</DialogTitle>
                            <DialogDescription>
                              Seleccione un permiso para añadir al grupo {selectedGroup?.name}.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <Label htmlFor="permission-search" className="mb-2 block">
                              Buscar permiso
                            </Label>
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="permission-search"
                                type="search"
                                placeholder="Buscar por nombre, recurso o acción..."
                                className="pl-8 mb-2"
                                value={permissionSearchQuery}
                                onChange={(e) => setPermissionSearchQuery(e.target.value)}
                              />
                            </div>
                            <Select value={selectedPermissionId} onValueChange={setSelectedPermissionId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione un permiso" />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredAvailablePermissions.map((permission) => (
                                  <SelectItem key={permission.id} value={permission.id}>
                                    {permission.name} (
                                    {RESOURCES.find((r) => r.value === permission.resource)?.label ||
                                      permission.resource}{" "}
                                    - {ACTIONS.find((a) => a.value === permission.action)?.label || permission.action})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsAddGroupPermissionDialogOpen(false)}
                              disabled={isSubmitting}
                            >
                              Cancelar
                            </Button>
                            <Button
                              onClick={handleAddPermissionToGroup}
                              disabled={isSubmitting || !selectedPermissionId}
                              className="bg-[#1a365d] hover:bg-[#15294d]"
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Añadiendo...
                                </>
                              ) : (
                                "Añadir Permiso"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  {selectedGroup ? (
                    <div className="h-[400px]" style={{ overflow: "auto" }}>
                      <table className="w-full border-collapse">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr>
                            <th className="text-left p-3 border-b">Nombre</th>
                            <th className="text-left p-3 border-b">Recurso</th>
                            <th className="text-left p-3 border-b">Acción</th>
                            <th className="text-left p-3 border-b w-[80px]"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr>
                              <td colSpan={4} className="h-24 text-center">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                              </td>
                            </tr>
                          ) : groupPermissions.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="h-24 text-center">
                                Este grupo no tiene permisos asignados
                              </td>
                            </tr>
                          ) : (
                            groupPermissions.map((permission) => (
                              <tr key={permission.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium">{permission.name}</td>
                                <td className="p-3">
                                  {RESOURCES.find((r) => r.value === permission.resource)?.label || permission.resource}
                                </td>
                                <td className="p-3">
                                  {ACTIONS.find((a) => a.value === permission.action)?.label || permission.action}
                                </td>
                                <td className="p-3">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemovePermissionFromGroup(permission.id)}
                                    disabled={isSubmitting}
                                  >
                                    <Trash className="h-4 w-4 text-red-600" />
                                    <span className="sr-only">Eliminar</span>
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center">
                      <p className="text-muted-foreground">Seleccione un grupo para ver sus permisos</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Diálogo de edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Permiso</DialogTitle>
            <DialogDescription>Actualice la información del permiso.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePermission}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nombre
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Descripción
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="resource" className="text-right">
                  Recurso
                </Label>
                <Select
                  name="resource"
                  value={formData.resource}
                  onValueChange={(value) => handleSelectChange("resource", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccione un recurso" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOURCES.map((resource) => (
                      <SelectItem key={resource.value} value={resource.value}>
                        {resource.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="action" className="text-right">
                  Acción
                </Label>
                <Select
                  name="action"
                  value={formData.action}
                  onValueChange={(value) => handleSelectChange("action", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccione una acción" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#1a365d] hover:bg-[#15294d]">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Actualizar Permiso"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el permiso
              {selectedPermission && ` "${selectedPermission.name}"`}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
