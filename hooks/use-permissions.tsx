"use client"

import { useState, useEffect } from "react"

export function usePermissions() {
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(true) // Por defecto es admin
  const [userPermissions, setUserPermissions] = useState([])

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

  return {
    hasPermission,
    loading,
    isAdmin,
    userPermissions,
    refetch,
  }
}
