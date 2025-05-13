"use client"

import { Badge } from "@/components/ui/badge"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import { Search, MoreHorizontal, Edit, Trash, Loader2 } from "lucide-react"
import { MultiSelect } from "@/components/ui/multi-select"

export function UsersManagement() {
  const { toast } = useToast()
  const supabase = createClientClient()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    nombre: "",
    apellido: "",
    telefono: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [groups, setGroups] = useState([])
  const [selectedGroups, setSelectedGroups] = useState([])

  // Cargar usuarios al montar el componente
  useEffect(() => {
    fetchUsers()
    fetchGroups()
  }, [])

  // Función para obtener usuarios
  const fetchUsers = async () => {
    setLoading(true)
    try {
      console.log("Obteniendo usuarios asociados al departamento 2")

      // 1. Primero obtenemos los IDs de los grupos asociados al departamento 2
      const { data: departmentGroups, error: deptGroupsError } = await supabase
        .from("departments_group")
        .select("group_id")
        .eq("department_id", 2)

      if (deptGroupsError) throw deptGroupsError

      if (!departmentGroups || departmentGroups.length === 0) {
        console.log("No hay grupos asociados al departamento 2")
        setUsers([])
        setLoading(false)
        return
      }

      const departmentGroupIds = departmentGroups.map((dg) => dg.group_id)
      console.log(`Encontrados ${departmentGroupIds.length} grupos asociados al departamento 2:`, departmentGroupIds)

      // 2. Obtenemos los usuarios que pertenecen a esos grupos
      const { data: userGroupsData, error: userGroupsError } = await supabase
        .from("user_groups")
        .select("user_id, group_id")
        .in("group_id", departmentGroupIds)

      if (userGroupsError) throw userGroupsError

      if (!userGroupsData || userGroupsData.length === 0) {
        console.log("No hay usuarios asociados a los grupos del departamento 1")
        setUsers([])
        setLoading(false)
        return
      }

      // Extraer IDs de usuarios únicos
      const userIds = [...new Set(userGroupsData.map((ug) => ug.user_id))]
      console.log(`Encontrados ${userIds.length} usuarios asociados a grupos del departamento 2`)

      // 3. Obtenemos los perfiles de esos usuarios
      const { data: profiles, error: profilesError } = await supabase.from("profiles").select("*").in("id", userIds)

      if (profilesError) throw profilesError

      // 4. Obtenemos todos los grupos para referencia
      const { data: allGroups, error: groupsError } = await supabase.from("groups").select("id, name")

      if (groupsError) throw groupsError

      // Crear un mapa de grupos para búsqueda rápida
      const groupsMap = allGroups.reduce((acc, group) => {
        acc[group.id] = group.name
        return acc
      }, {})

      // Organizar los grupos por usuario (solo grupos del departamento 1)
      const userGroupsMap = {}
      userGroupsData.forEach((ug) => {
        if (departmentGroupIds.includes(ug.group_id)) {
          if (!userGroupsMap[ug.user_id]) {
            userGroupsMap[ug.user_id] = []
          }
          userGroupsMap[ug.user_id].push(ug.group_id)
        }
      })

      // Formatear los datos de usuarios
      const formattedUsers = profiles.map((profile) => ({
        id: profile.id || "",
        email: profile.email || "",
        created_at: profile.created_at || new Date().toISOString(),
        last_sign_in_at: profile.updated_at || new Date().toISOString(),
        nombre: profile.nombre || "",
        apellido: profile.apellido || "",
        telefono: profile.telefono || "",
        // Agregar solo los grupos del departamento 2
        groups: (userGroupsMap[profile.id] || []).map((groupId) => groupsMap[groupId]),
        groupIds: userGroupsMap[profile.id] || [],
      }))

      console.log(`Formateados ${formattedUsers.length} usuarios para mostrar`)
      setUsers(formattedUsers)
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

  // Función para obtener grupos
  const fetchGroups = async () => {
    try {
      // Primero obtenemos los IDs de los grupos asociados al departamento 2
      const { data: departmentGroups, error: deptGroupsError } = await supabase
        .from("departments_group")
        .select("group_id")
        .eq("department_id", 2)

      if (deptGroupsError) throw deptGroupsError

      if (!departmentGroups || departmentGroups.length === 0) {
        console.log("No hay grupos asociados al departamento 2")
        setGroups([])
        return
      }

      const departmentGroupIds = departmentGroups.map((dg) => dg.group_id)

      // Obtenemos los detalles de esos grupos
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .in("id", departmentGroupIds)
        .order("name", { ascending: true })

      if (error) throw error

      setGroups(data)
    } catch (error) {
      console.error("Error fetching groups:", error)
      toast({
        variant: "destructive",
        title: "Error al cargar grupos",
        description: error.message || "No se pudieron cargar los grupos",
      })
    }
  }

  // Función para obtener grupos de un usuario
  const fetchUserGroups = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("user_groups")
        .select(`
        group_id,
        groups (
          id,
          name
        )
      `)
        .eq("user_id", userId)

      if (error) throw error

      // Formatear los datos para el multi-select
      const userGroupIds = data.map((item) => item.group_id)
      setSelectedGroups(userGroupIds)
    } catch (error) {
      console.error("Error fetching user groups:", error)
      toast({
        variant: "destructive",
        title: "Error al cargar grupos del usuario",
        description: error.message || "No se pudieron cargar los grupos del usuario",
      })
    }
  }

  // Filtrar usuarios según la búsqueda
  const filteredUsers = users.filter(
    (user) =>
      (user.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (user.nombre?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (user.apellido?.toLowerCase() || "").includes(searchQuery.toLowerCase()),
  )

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Abrir diálogo de edición
  const handleEditUser = (user) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      password: "", // No mostrar contraseña actual
      nombre: user.nombre || "",
      apellido: user.apellido || "",
      telefono: user.telefono || "",
    })
    setSelectedGroups(user.groupIds || [])
    setIsEditDialogOpen(true)
  }

  // Abrir diálogo de eliminación
  const handleDeleteUser = (user) => {
    setSelectedUser(user)
    setIsDeleteDialogOpen(true)
  }

  // Modificar la función handleUpdateUser para eliminar el campo 'role' que no existe en la tabla
  const handleUpdateUser = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validar datos
      if (!formData.email || !formData.nombre || !formData.apellido) {
        throw new Error("Por favor complete todos los campos requeridos")
      }

      console.log("Actualizando usuario:", selectedUser.id)
      console.log("Datos a actualizar:", {
        nombre: formData.nombre,
        apellido: formData.apellido,
        telefono: formData.telefono,
      })

      // Actualizar perfil en la tabla pública sin incluir el campo 'role'
      const { data, error: profileError } = await supabase
        .from("profiles")
        .update({
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedUser.id)
        .select()

      console.log("Respuesta de actualización:", { data, error: profileError })

      if (profileError) {
        console.error("Error detallado:", profileError)
        throw profileError
      }

      // Actualizar grupos del usuario
      // 1. Eliminar todos los grupos actuales
      const { error: deleteError } = await supabase.from("user_groups").delete().eq("user_id", selectedUser.id)

      if (deleteError) throw deleteError

      // 2. Insertar los nuevos grupos seleccionados
      if (selectedGroups.length > 0) {
        const groupsToInsert = selectedGroups.map((groupId) => ({
          user_id: selectedUser.id,
          group_id: groupId,
        }))

        const { error: insertError } = await supabase.from("user_groups").insert(groupsToInsert)

        if (insertError) throw insertError
      }

      toast({
        title: "Usuario actualizado",
        description: "El usuario ha sido actualizado exitosamente",
      })

      // Cerrar diálogo y recargar usuarios
      setIsEditDialogOpen(false)
      fetchUsers()
    } catch (error) {
      console.error("Error completo al actualizar usuario:", error)
      toast({
        variant: "destructive",
        title: "Error al actualizar usuario",
        description: error.message || "No se pudo actualizar el usuario. Verifique la consola para más detalles.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Eliminar usuario
  const handleConfirmDelete = async () => {
    setIsSubmitting(true)

    try {
      // Usar la API para eliminar el usuario
      const response = await fetch(`/api/admin/users?id=${selectedUser.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al eliminar el usuario")
      }

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado exitosamente",
      })

      // Cerrar diálogo y recargar usuarios
      setIsDeleteDialogOpen(false)
      fetchUsers()
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        variant: "destructive",
        title: "Error al eliminar usuario",
        description: error.message || "No se pudo eliminar el usuario",
      })
    } finally {
      setIsSubmitting(false)
    }
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
        <div className="flex items-center">
          <p className="text-sm text-muted-foreground">
            Los nuevos usuarios deben registrarse a través de la página de registro
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Fixed height container to prevent layout shifts */}
          <div className="h-[500px] w-full" style={{ overflow: "auto" }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  <th className="text-left p-3 border-b">Email</th>
                  <th className="text-left p-3 border-b">Nombre</th>
                  <th className="text-left p-3 border-b">Grupos</th>
                  <th className="text-left p-3 border-b">Fecha Creación</th>
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
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="h-24 text-center">
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{user.email}</td>
                      <td className="p-3">{`${user.nombre} ${user.apellido}`}</td>
                      <td className="p-3">
                        {user.groups && user.groups.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.groups.map((group, index) => (
                              <Badge key={index} variant="outline" className="mr-1">
                                {group}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Sin grupos</span>
                        )}
                      </td>
                      <td className="p-3">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-red-600">
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

      {/* Diálogo de edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Actualice la información del usuario.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Nueva Contraseña
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder="Dejar en blanco para mantener la actual"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nombre" className="text-right">
                  Nombre
                </Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="apellido" className="text-right">
                  Apellido
                </Label>
                <Input
                  id="apellido"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="telefono" className="text-right">
                  Teléfono
                </Label>
                <Input
                  id="telefono"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="groups" className="text-right">
                  Grupos
                </Label>
                <div className="col-span-3">
                  <MultiSelect
                    options={groups.map((group) => ({ label: group.name, value: group.id }))}
                    selected={selectedGroups}
                    onChange={setSelectedGroups}
                    placeholder="Seleccione grupos"
                  />
                </div>
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
                  "Actualizar Usuario"
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el usuario
              {selectedUser && ` ${selectedUser.email}`} y todos sus datos asociados.
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
