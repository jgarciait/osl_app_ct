"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Search, Plus, Trash, Loader2 } from "lucide-react"

export function UserGroupsManagement() {
  const { toast } = useToast()
  const supabase = createClientClient()

  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [department2Groups, setDepartment2Groups] = useState([]) // Solo grupos del departamento 2
  const [userGroups, setUserGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [debugInfo, setDebugInfo] = useState("") // Para depuración

  // Cargar usuarios y grupos al montar el componente
  useEffect(() => {
    fetchUsers()
    fetchDepartment2Groups()
  }, [])

  // Función para obtener usuarios
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from("profiles").select("*").order("email", { ascending: true })

      if (error) throw error

      setUsers(data)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        variant: "destructive",
        title: "Error al cargar usuarios",
        description: error.message || "No se pudieron cargar los usuarios",
      })
    } finally {
      setLoading(false)
    }
  }

  // Función para obtener SOLO los grupos del departamento 2
  const fetchDepartment2Groups = async () => {
    try {
      // Paso 1: Obtener los IDs de grupos del departamento 2
      const { data: deptGroups, error: deptError } = await supabase
        .from("departments_group")
        .select("group_id")
        .eq("department_id", 2)

      if (deptError) {
        throw deptError
      }

      if (!deptGroups || deptGroups.length === 0) {
        setDepartment2Groups([])
        return
      }

      // Extraer los IDs de grupos
      const groupIds = deptGroups.map((item) => item.group_id)

      // Paso 2: Obtener los detalles de esos grupos
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds)
        .order("name", { ascending: true })

      if (groupsError) {
        throw groupsError
      }

      setDepartment2Groups(groupsData || [])
    } catch (error) {
      console.error("Error fetching department 2 groups:", error)
      toast({
        variant: "destructive",
        title: "Error al cargar grupos del departamento 2",
        description: error.message || "No se pudieron cargar los grupos",
      })
    }
  }

  // Función para obtener grupos de un usuario
  const fetchUserGroups = async (userId) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("user_groups")
        .select(
          `
         id,
         group_id,
         groups (
           id,
           name,
           description
         )
       `,
        )
        .eq("user_id", userId)

      if (error) throw error

      // Formatear los datos para mostrar, preservando el ID original
      const formattedData = data.map((item) => ({
        id: item.id, // Mantener el ID original de user_groups
        group_id: item.group_id,
        name: item.groups.name,
        description: item.groups.description,
      }))

      setUserGroups(formattedData)
    } catch (error) {
      console.error("Error fetching user groups:", error)
      toast({
        variant: "destructive",
        title: "Error al cargar grupos del usuario",
        description: error.message || "No se pudieron cargar los grupos del usuario",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filtrar usuarios según la búsqueda
  const filteredUsers = users.filter(
    (user) =>
      (user.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (user.nombre?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (user.apellido?.toLowerCase() || "").includes(searchQuery.toLowerCase()),
  )

  // Seleccionar usuario y cargar sus grupos
  const handleSelectUser = (user) => {
    setSelectedUser(user)
    fetchUserGroups(user.id)
  }

  // Añadir grupo a usuario
  const handleAddGroupToUser = async () => {
    if (!selectedUser || !selectedGroupId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor seleccione un grupo",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Verificar si el usuario ya está asignado al grupo
      const { data: existingGroup, error: checkError } = await supabase
        .from("user_groups")
        .select("id")
        .eq("user_id", selectedUser.id)
        .eq("group_id", selectedGroupId)
        .limit(1)

      if (checkError) throw checkError

      if (existingGroup && existingGroup.length > 0) {
        throw new Error("Este usuario ya está asignado a este grupo")
      }

      // Asignar usuario al grupo
      const { error } = await supabase.from("user_groups").insert({
        user_id: selectedUser.id,
        group_id: selectedGroupId,
      })

      if (error) throw error

      toast({
        title: "Grupo asignado",
        description: "El grupo ha sido asignado al usuario exitosamente",
      })

      // Cerrar diálogo y recargar grupos del usuario
      setIsAddDialogOpen(false)
      fetchUserGroups(selectedUser.id)
      setSelectedGroupId("")
    } catch (error) {
      console.error("Error assigning group:", error)
      toast({
        variant: "destructive",
        title: "Error al asignar grupo",
        description: error.message || "No se pudo asignar el grupo al usuario",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Eliminar grupo de usuario
  const handleRemoveGroupFromUser = async (userGroupId) => {
    setIsSubmitting(true)
    try {
      // Eliminar asignación de grupo
      const { data, error } = await supabase.from("user_groups").delete().eq("id", userGroupId).select()

      if (error) {
        throw new Error(error.message || "Failed to remove group from user")
      }

      toast({
        title: "Grupo removido",
        description: "El grupo ha sido removido del usuario exitosamente",
      })

      // Recargar grupos del usuario
      fetchUserGroups(selectedUser.id)
    } catch (error) {
      console.error("Error removing group:", error)
      toast({
        variant: "destructive",
        title: "Error al remover grupo",
        description: error.message || "No se pudo remover el grupo del usuario",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Obtener grupos disponibles para asignar al usuario (SOLO del departamento 2)
  const getAvailableGroups = () => {
    if (!selectedUser) return []

    // Filtrar grupos que no están asignados al usuario Y que pertenecen al departamento 2
    const assignedGroupIds = userGroups.map((group) => group.group_id)
    return department2Groups.filter((group) => !assignedGroupIds.includes(group.id))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-[350px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar usuarios..."
            className="w-full pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-medium mb-4">Todos los usuarios de OSL</h3>
              <div className="space-y-2 h-[500px]" style={{ overflow: "auto" }}>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">No hay usuarios disponibles</p>
                ) : (
                  filteredUsers.map((user) => (
                    <Button
                      key={user.id}
                      variant={selectedUser?.id === user.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="truncate text-left">
                        <div>{user.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {user.nombre} {user.apellido}
                        </div>
                      </div>
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
                  {selectedUser ? `Grupos de ${selectedUser.nombre} ${selectedUser.apellido}` : "Seleccione un usuario"}
                </h3>
                {selectedUser && (
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-[#1a365d] hover:bg-[#15294d]" disabled={!selectedUser}>
                        <Plus className="mr-2 h-4 w-4" />
                        Añadir Grupo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Añadir Grupo al Usuario</DialogTitle>
                        <DialogDescription>
                          Seleccione un grupo para añadir al usuario {selectedUser?.nombre} {selectedUser?.apellido}.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un grupo" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableGroups().length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                No hay grupos disponibles del departamento 2
                              </div>
                            ) : (
                              getAvailableGroups().map((group) => (
                                <SelectItem key={group.id} value={group.id}>
                                  {group.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
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
                        <Button
                          onClick={handleAddGroupToUser}
                          disabled={isSubmitting || !selectedGroupId}
                          className="bg-[#1a365d] hover:bg-[#15294d]"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Añadiendo...
                            </>
                          ) : (
                            "Añadir Grupo"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              {selectedUser ? (
                <div className="h-[400px]" style={{ overflow: "auto" }}>
                  {loading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : userGroups.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">Este usuario no tiene grupos asignados</div>
                  ) : (
                    <div className="space-y-2">
                      {userGroups.map((group) => (
                        <div
                          key={group.id}
                          className="flex justify-between items-center p-3 border rounded-md hover:bg-gray-50"
                        >
                          <div>
                            <div className="font-medium">{group.name}</div>
                            <div className="text-sm text-muted-foreground">{group.description}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveGroupFromUser(group.id)}
                            disabled={isSubmitting}
                          >
                            <Trash className="h-4 w-4 text-red-600" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center">
                  <p className="text-muted-foreground">Seleccione un usuario para ver sus grupos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
