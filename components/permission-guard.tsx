"use client"

import type { ReactNode } from "react"

interface PermissionGuardProps {
  resource: string
  action: string
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGuard({ resource, action, children, fallback = null }: PermissionGuardProps) {
  // Siempre permitir acceso, ignorando verificaciones de permisos
  return <>{children}</>
}
