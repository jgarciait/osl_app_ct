"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"

export function usePermissions() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userPermissions, setUserPermissions] = useState([])
  const supabase = createClientClient()

  // Función para verificar si el usuario tiene un permiso específico
  const hasPermission = (resource, action) => {
    // Si está cargando, no tiene permisos
    if (loading) return false

    // Si es admin, tiene todos los permisos
    if (isAdmin) return true

    // Verificar si el usuario tiene el permiso específico
    return userPermissions.some((permission) => permission.resource === resource && permission.action === action)
  }

  // Función para recargar los permisos
  const refetch = async () => {
    setLoading(true)
    await fetchPermissions()
    setLoading(false)
  }

  // Función para obtener los permisos del usuario
  const fetchPermissions = async () => {
    try {
      // Verificar si el usuario está autenticado
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setIsAdmin(false)
        setUserPermissions([])
        setLoading(false)
        return
      }

      const userId = session.user.id

      // Verificar si el usuario es administrador
      const { data: adminData, error: adminError } = await supabase.rpc("is_admin")

      if (!adminError && adminData === true) {
        setIsAdmin(true)
        setLoading(false)
        // Los administradores tienen todos los permisos, no necesitamos cargar la lista
        return
      }

      // Primero, obtenemos los grupos a los que pertenece el usuario
      const { data: userGroupsData, error: userGroupsError } = await supabase
        .from("user_groups")
        .select("group_id")
        .eq("user_id", userId)

      if (userGroupsError) {
        console.error("Error al obtener grupos del usuario:", userGroupsError)
        setUserPermissions([])
        setLoading(false)
        return
      }

      // Si el usuario no pertenece a ningún grupo, no tiene permisos
      if (!userGroupsData || userGroupsData.length === 0) {
        setUserPermissions([])
        setLoading(false)
        return
      }

      // Extraemos los IDs de los grupos
      const groupIds = userGroupsData.map((group) => group.group_id)

      // Ahora obtenemos los permisos asociados a esos grupos
      const { data: groupPermissionsData, error: groupPermissionsError } = await supabase
        .from("group_permissions")
        .select("permission_id")
        .in("group_id", groupIds)

      if (groupPermissionsError) {
        console.error("Error al obtener permisos de grupos:", groupPermissionsError)
        setUserPermissions([])
        setLoading(false)
        return
      }

      // Si no hay permisos asociados a los grupos, el usuario no tiene permisos
      if (!groupPermissionsData || groupPermissionsData.length === 0) {
        setUserPermissions([])
        setLoading(false)
        return
      }

      // Extraemos los IDs de los permisos
      const permissionIds = groupPermissionsData.map((perm) => perm.permission_id)

      // Finalmente, obtenemos los detalles de los permisos
      const { data: permissionsData, error: permissionsError } = await supabase
        .from("permissions")
        .select("resource, action")
        .in("id", permissionIds)

      if (permissionsError) {
        console.error("Error al obtener detalles de permisos:", permissionsError)
        setUserPermissions([])
        setLoading(false)
        return
      }

      setUserPermissions(permissionsData || [])
    } catch (error) {
      console.error("Error al verificar permisos:", error)
      setIsAdmin(false)
      setUserPermissions([])
    } finally {
      setLoading(false)
    }
  }

  // Efecto para cargar los permisos al montar el componente
  useEffect(() => {
    fetchPermissions()
  }, [])

  return {
    hasPermission,
    loading,
    isAdmin,
    userPermissions,
    refetch,
  }
}
