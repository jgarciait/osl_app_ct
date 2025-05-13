"use client"

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
  DialogTrigger,
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
import { Search, MoreHorizontal, Plus, Edit, Trash, Loader2, ChevronRight } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

export function GroupsManagement() {
  const { toast } = useToast()
  const supabase = createClientClient()

  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    parent_id: null,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cargar grupos al montar el componente
  useEffect(() => {
    fetchGroups()
  }, [])

  // Función para obtener grupos usando JOIN
  const fetchGroups = async () => {
    setLoading(true)
    try {
      console.log("Fetching groups for department 2")

      // Enfoque directo: primero obtener los IDs de los grupos
      const { data: groupRelations, error: relationsError } = await supabase
        .from("departments_group")
        .select("group_id")
        .eq("department_id", 2)

      if (relationsError) {
        console.error("Error fetching group relations:", relationsError)
        throw relationsError
      }

      console.log("Group relations found:", groupRelations?.length || 0)

      if (!groupRelations || groupRelations.length === 0) {
        console.log("No groups associated with department 2")
        setGroups([])
        setLoading(false)
        return
      }

      // Extraer los IDs de los grupos
      const groupIds = groupRelations.map((item) => item.group_id)
      console.log("Group IDs:", groupIds)

      // Obtener los detalles de los grupos con información del padre
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select(`
          id,
          name,
          description,
          parent_id,
          created_at,
          updated_at,
          parent:parent_id(id, name)
        `)
        .in("id", groupIds)
        .order("name")

      if (groupsError) {
        console.error("Error fetching groups details:", groupsError)
        throw groupsError
      }

      console.log("Groups found:", groupsData?.length || 0)
      setGroups(groupsData || [])
    } catch (error) {
      console.error("Error fetching groups:", error)
      toast({
        variant: "destructive",
        title: "Error al cargar grupos",
        description: error.message || "No se pudieron cargar los grupos",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filtrar grupos según la búsqueda
  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (group.description && group.description.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Abrir diálogo de edición
  const handleEditGroup = (group) => {
    setSelectedGroup(group)
    setFormData({
      name: group.name,
      description: group.description || "",
      parent_id: group.parent_id || null,
    })
    setIsEditDialogOpen(true)
  }

  // Abrir diálogo de eliminación
  const handleDeleteGroup = (group) => {
    setSelectedGroup(group)
    setIsDeleteDialogOpen(true)
  }

  // Crear nuevo grupo
  const handleCreateGroup = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validar datos
      if (!formData.name) {
        throw new Error("Por favor ingrese un nombre para el grupo")
      }

      // Crear grupo en la base de datos
      const { data, error } = await supabase
        .from("groups")
        .insert({
          name: formData.name,
          description: formData.description,
          parent_id: formData.parent_id === "none" ? null : formData.parent_id || null,
        })
        .select()

      if (error) throw error

      // Asociar el grupo con el departamento 2
      const { error: relationError } = await supabase.from("departments_group").insert({
        department_id: 2,
        group_id: data[0].id,
      })

      if (relationError) throw relationError

      toast({
        title: "Grupo creado",
        description: "El grupo ha sido creado exitosamente",
      })

      // Cerrar diálogo y recargar grupos
      setIsAddDialogOpen(false)
      fetchGroups()

      // Limpiar formulario
      setFormData({
        name: "",
        description: "",
        parent_id: null,
      })
    } catch (error) {
      console.error("Error creating group:", error)
      toast({
        variant: "destructive",
        title: "Error al crear grupo",
        description: error.message || "No se pudo crear el grupo",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Actualizar grupo existente
  const handleUpdateGroup = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validar datos
      if (!formData.name) {
        throw new Error("Por favor ingrese un nombre para el grupo")
      }

      // Verificar que no se esté asignando a sí mismo como padre
      if (formData.parent_id === selectedGroup.id) {
        throw new Error("Un grupo no puede ser su propio padre")
      }

      // Verificar que no se esté creando un ciclo en la jerarquía
      if (formData.parent_id) {
        const isChildOfSelected = await checkIfChildOf(formData.parent_id, selectedGroup.id)
        if (isChildOfSelected) {
          throw new Error("No se puede asignar un grupo hijo como padre")
        }
      }

      // Actualizar grupo en la base de datos
      const { error } = await supabase
        .from("groups")
        .update({
          name: formData.name,
          description: formData.description,
          parent_id: formData.parent_id === "none" ? null : formData.parent_id || null,
          updated_at: new Date(),
        })
        .eq("id", selectedGroup.id)

      if (error) throw error

      toast({
        title: "Grupo actualizado",
        description: "El grupo ha sido actualizado exitosamente",
      })

      // Cerrar diálogo y recargar grupos
      setIsEditDialogOpen(false)
      fetchGroups()
    } catch (error) {
      console.error("Error updating group:", error)
      toast({
        variant: "destructive",
        title: "Error al actualizar grupo",
        description: error.message || "No se pudo actualizar el grupo",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Verificar si un grupo es hijo de otro
  const checkIfChildOf = async (potentialParentId, childId) => {
    // Obtener todos los ancestros del grupo potencial padre
    let currentId = potentialParentId
    const visited = new Set()

    while (currentId) {
      // Evitar ciclos infinitos
      if (visited.has(currentId)) {
        return false
      }
      visited.add(currentId)

      // Si encontramos el ID del hijo, hay un ciclo
      if (currentId === childId) {
        return true
      }

      // Obtener el padre del grupo actual
      const { data, error } = await supabase.from("groups").select("parent_id").eq("id", currentId).single()

      if (error || !data) {
        break
      }

      currentId = data.parent_id
    }

    return false
  }

  // Eliminar grupo
  const handleConfirmDelete = async () => {
    setIsSubmitting(true)

    try {
      // Verificar si el grupo tiene subgrupos
      const { data: subgroups, error: subgroupsError } = await supabase
        .from("groups")
        .select("id")
        .eq("parent_id", selectedGroup.id)
        .limit(1)

      if (subgroupsError) throw subgroupsError

      if (subgroups && subgroups.length > 0) {
        throw new Error("No se puede eliminar un grupo que tiene subgrupos")
      }

      // Verificar si el grupo tiene usuarios asignados
      const { data: userGroups, error: userGroupsError } = await supabase
        .from("user_groups")
        .select("user_id")
        .eq("group_id", selectedGroup.id)
        .limit(1)

      if (userGroupsError) throw userGroupsError

      if (userGroups && userGroups.length > 0) {
        throw new Error("No se puede eliminar un grupo que tiene usuarios asignados")
      }

      // Primero eliminar la relación con el departamento
      const { error: relationDeleteError } = await supabase
        .from("departments_group")
        .delete()
        .eq("group_id", selectedGroup.id)
        .eq("department_id", 2)

      if (relationDeleteError) throw relationDeleteError

      // Eliminar grupo
      const { error } = await supabase.from("groups").delete().eq("id", selectedGroup.id)

      if (error) throw error

      toast({
        title: "Grupo eliminado",
        description: "El grupo ha sido eliminado exitosamente",
      })

      // Cerrar diálogo y recargar grupos
      setIsDeleteDialogOpen(false)
      fetchGroups()
    } catch (error) {
      console.error("Error deleting group:", error)
      toast({
        variant: "destructive",
        title: "Error al eliminar grupo",
        description: error.message || "No se pudo eliminar el grupo",
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
            placeholder="Buscar grupos..."
            className="w-full pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1a365d] hover:bg-[#15294d]">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Grupo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Grupo</DialogTitle>
              <DialogDescription>Complete el formulario para crear un nuevo grupo en el sistema.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGroup}>
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
                  <Label htmlFor="parent_id" className="text-right">
                    Grupo Padre
                  </Label>
                  <Select
                    name="parent_id"
                    value={formData.parent_id || ""}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, parent_id: value }))}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Ninguno (grupo raíz)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguno (grupo raíz)</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
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
                    "Crear Grupo"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Fixed height container to prevent layout shifts */}
          <div className="h-[500px] w-full" style={{ overflow: "auto" }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  <th className="text-left p-3 border-b">Nombre</th>
                  <th className="text-left p-3 border-b">Descripción</th>
                  <th className="text-left p-3 border-b">Grupo Padre</th>
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
                ) : filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="h-24 text-center">
                      No se encontraron grupos asociados al departamento 2
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((group) => (
                    <tr key={group.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{group.name}</td>
                      <td className="p-3">{group.description || "-"}</td>
                      <td className="p-3">
                        {group.parent ? (
                          <div className="flex items-center">
                            <ChevronRight className="h-4 w-4 mr-1 text-muted-foreground" />
                            {group.parent.name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Grupo raíz</span>
                        )}
                      </td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditGroup(group)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteGroup(group)} className="text-red-600">
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
            <DialogTitle>Editar Grupo</DialogTitle>
            <DialogDescription>Actualice la información del grupo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateGroup}>
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
                <Label htmlFor="parent_id" className="text-right">
                  Grupo Padre
                </Label>
                <Select
                  name="parent_id"
                  value={formData.parent_id || ""}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, parent_id: value }))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Ninguno (grupo raíz)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno (grupo raíz)</SelectItem>
                    {groups
                      .filter((g) => g.id !== selectedGroup?.id) // Excluir el grupo actual
                      .map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
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
                  "Actualizar Grupo"
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
              Esta acción no se puede deshacer. Esto eliminará permanentemente el grupo
              {selectedGroup && ` "${selectedGroup.name}"`}.
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
