"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createClientClient } from "@/lib/supabase-client"

// Definir el contexto de permisos basados en grupos
type GroupPermissionsContextType = {
  userGroups: string[]
  userPermissions: { resource: string; action: string; name: string }[]
  hasPermission: (resource: string, action: string) => boolean
  isInGroup: (groupName: string) => boolean
  loading: boolean
  isAdmin: boolean
}

const GroupPermissionsContext = createContext<GroupPermissionsContextType>({
  userGroups: [],
  userPermissions: [],
  hasPermission: () => false,
  isInGroup: () => false,
  loading: true,
  isAdmin: false,
})

// Proveedor del contexto de permisos basados en grupos
export function GroupPermissionsProvider({ children }: { children: React.ReactNode }) {
  const [userGroups, setUserGroups] = useState<string[]>([])
  const [userPermissions, setUserPermissions] = useState<{ resource: string; action: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const fetchUserGroupsAndPermissions = async () => {
      try {
        const supabase = createClientClient()

        // Obtener la sesión actual
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          setLoading(false)
          return
        }

        // Verificar si el usuario es administrador
        const { data: adminCheck, error: adminError } = await supabase.rpc("is_admin", {
          user_id: session.user.id,
        })

        if (adminError) {
          console.error("Error al verificar si es admin:", adminError)
        } else {
          console.log("Es admin:", !!adminCheck)
          setIsAdmin(!!adminCheck)
        }

        // Obtener los grupos del usuario - CORREGIDO: Pasando el user_id como parámetro
        const { data: userGroupsData, error: groupsError } = await supabase.rpc("get_user_groups", {
          user_id: session.user.id,
        })

        if (groupsError) {
          console.error("Error fetching user groups:", groupsError)
        } else if (userGroupsData) {
          console.log("Grupos del usuario:", userGroupsData)
          const groupNames = userGroupsData.map((group) => group.group_name)
          setUserGroups(groupNames)

          // Obtener los permisos del usuario a través de sus grupos
          const { data: permissionsData, error: permissionsError } = await supabase
            .from("group_permissions")
            .select(`
              permissions (
                id,
                name,
                resource,
                action
              )
            `)
            .in(
              "group_id",
              userGroupsData.map((g) => g.group_id),
            )

          if (permissionsError) {
            console.error("Error al obtener permisos:", permissionsError)
          } else if (permissionsData) {
            // Extraer los permisos únicos
            const uniquePermissions = new Map()

            permissionsData.forEach((item) => {
              if (item.permissions) {
                const key = `${item.permissions.resource}:${item.permissions.action}`
                uniquePermissions.set(key, {
                  resource: item.permissions.resource,
                  action: item.permissions.action,
                  name: item.permissions.name,
                })
              }
            })

            const permissionsList = Array.from(uniquePermissions.values())
            console.log("Lista de permisos:", permissionsList)
            setUserPermissions(permissionsList)
          }
        }
      } catch (error) {
        console.error("Error fetching user groups and permissions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserGroupsAndPermissions()
  }, [])

  // Función para verificar si el usuario tiene un permiso específico
  const hasPermission = (resource: string, action: string): boolean => {
    // Si el usuario es administrador, tiene todos los permisos
    if (isAdmin) {
      console.log(`[Permisos] Usuario es admin, tiene acceso a ${resource}:${action}`)
      return true
    }

    // Verificar si el usuario tiene el permiso específico
    const hasPermiso = userPermissions.some(
      (permission) => permission.resource === resource && permission.action === action,
    )
    console.log(`[Permisos] Verificando ${resource}:${action} - Resultado: ${hasPermiso}`)
    console.log(`[Permisos] Permisos disponibles:`, userPermissions)

    return hasPermiso
  }

  // Función para verificar si el usuario pertenece a un grupo específico
  const isInGroup = (groupName: string): boolean => {
    return userGroups.includes(groupName)
  }

  return (
    <GroupPermissionsContext.Provider
      value={{
        userGroups,
        userPermissions,
        hasPermission,
        isInGroup,
        loading,
        isAdmin,
      }}
    >
      {children}
    </GroupPermissionsContext.Provider>
  )
}

// Hook para usar el contexto de permisos basados en grupos
export function useGroupPermissions() {
  const context = useContext(GroupPermissionsContext)

  // Si el contexto es null, estamos fuera del provider
  if (!context) {
    console.warn("useGroupPermissions usado fuera de GroupPermissionsProvider")
    // Devolver un objeto con valores por defecto
    return {
      userGroups: [],
      userPermissions: [],
      hasPermission: () => false,
      isInGroup: () => false,
      loading: false,
      isAdmin: false,
    }
  }

  return context
}

export { GroupPermissionsContext }
