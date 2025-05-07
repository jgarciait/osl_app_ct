"use client"

import { useState, useEffect, createContext, useContext } from "react"

// Crear un contexto para los permisos
const GroupPermissionsContext = createContext(null)

// Hook personalizado para usar el contexto
export function useGroupPermissions() {
  const context = useContext(GroupPermissionsContext)
  if (!context) {
    // Si no estamos dentro del proveedor, devolvemos valores por defecto que permiten todo
    return {
      hasPermission: () => true,
      loading: false,
      isAdmin: true,
      userPermissions: [],
      userGroups: [],
      refetch: () => Promise.resolve(),
    }
  }
  return context
}

// Proveedor de permisos
export function GroupPermissionsProvider({ children }) {
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(true) // Por defecto es admin
  const [userPermissions, setUserPermissions] = useState([])
  const [userGroups, setUserGroups] = useState([])

  // Función para verificar si el usuario tiene un permiso específico
  const hasPermission = (resource, action) => {
    // Siempre devuelve true para permitir todas las acciones
    return true
  }

  // Función para recargar los permisos
  const refetch = async () => {
    // No hacemos nada, siempre permitimos todo
    return Promise.resolve()
  }

  // Efecto para cargar los permisos al montar el componente
  useEffect(() => {
    // No hacemos nada, siempre permitimos todo
  }, [])

  // Valor del contexto
  const value = {
    hasPermission,
    loading,
    isAdmin,
    userPermissions,
    userGroups,
    refetch,
  }

  return <GroupPermissionsContext.Provider value={value}>{children}</GroupPermissionsContext.Provider>
}
