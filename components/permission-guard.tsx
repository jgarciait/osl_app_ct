"use client"

import type { ReactNode } from "react"
import { useGroupPermissions } from "@/hooks/use-group-permissions"

interface PermissionGuardProps {
  resource: string
  action: string
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGuard({ resource, action, children, fallback = null }: PermissionGuardProps) {
  const { hasPermission, loading, isAdmin, userPermissions } = useGroupPermissions()

  // Si está cargando, no mostrar nada
  if (loading) {
    console.log(`[PermissionGuard] Cargando permisos para ${resource}:${action}...`)
    return null
  }

  // Logs para depuración
  console.log(`[PermissionGuard] Verificando permiso ${resource}:${action}`)
  console.log(`[PermissionGuard] Es admin: ${isAdmin}`)
  console.log(`[PermissionGuard] Tiene permiso: ${hasPermission(resource, action)}`)
  console.log(`[PermissionGuard] Permisos disponibles:`, userPermissions)

  // Si el usuario es administrador o tiene el permiso, mostrar los hijos
  if (isAdmin || hasPermission(resource, action)) {
    console.log(`[PermissionGuard] Acceso permitido a ${resource}:${action}`)
    return <>{children}</>
  }

  // Si no tiene el permiso, mostrar el fallback
  console.log(`[PermissionGuard] Acceso denegado a ${resource}:${action}`)
  return <>{fallback}</>
}
