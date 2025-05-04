"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import { createClientClient } from "@/lib/supabase-client"

// Definir el contexto de permisos
type PermissionsContextType = {
  checkPermission: (resource: string, action: string) => Promise<boolean>
  userGroups: string[]
  userPermissions: { resource: string; action: string }[]
  loading: boolean
}

const PermissionsContext = createContext<PermissionsContextType>({
  checkPermission: async () => false,
  userGroups: [],
  userPermissions: [],
  loading: true,
})

// Proveedor del contexto de permisos
export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [userGroups, setUserGroups] = useState<string[]>([])
  const [userPermissions, setUserPermissions] = useState<{ resource: string; action: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserPermissions = async () => {
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

        // Obtener los grupos del usuario
        const { data: userGroupsData, error: userGroupsError } = await supabase
          .from("user_groups")
          .select(
            `
    id,
    group_id,
    user_id,
    groups (
      id,
      name
    )
  `,
          )
          .eq("user_id", session.user.id)

        if (userGroupsError) {
          console.error("Error fetching user groups:", userGroupsError)
          setLoading(false)
          return
        }

        // Extraer los IDs de los grupos
        const groupIds = userGroupsData.map((item) => item.group_id)
        const groupNames = userGroupsData.map((item) => item.groups.name)
        setUserGroups(groupNames)

        if (groupIds.length === 0) {
          setLoading(false)
          return
        }

        // Obtener los permisos de los grupos
        const { data: permissionsData, error: permissionsError } = await supabase
          .from("group_permissions")
          .select(
            `
            permissions (
              id,
              name,
              resource,
              action
            )
          `,
          )
          .in("group_id", groupIds)

        if (permissionsError) {
          console.error("Error fetching permissions:", permissionsError)
          setLoading(false)
          return
        }

        // Extraer los permisos únicos
        const uniquePermissions = new Map()
        permissionsData.forEach((item) => {
          const key = `${item.permissions.resource}:${item.permissions.action}`
          uniquePermissions.set(key, {
            resource: item.permissions.resource,
            action: item.permissions.action,
          })
        })

        setUserPermissions(Array.from(uniquePermissions.values()))
      } catch (error) {
        console.error("Error in fetchUserPermissions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserPermissions()
  }, [])

  // Función para verificar si el usuario tiene un permiso específico
  const checkPermission = async (resource: string, action: string): Promise<boolean> => {
    // Si está cargando, esperar
    if (loading) {
      return false
    }

    // Verificar si el usuario tiene el permiso
    return userPermissions.some((permission) => permission.resource === resource && permission.action === action)
  }

  return (
    <PermissionsContext.Provider value={{ checkPermission, userGroups, userPermissions, loading }}>
      {children}
    </PermissionsContext.Provider>
  )
}

// Hook para usar el contexto de permisos
export function usePermissions() {
  return useContext(PermissionsContext)
}
