"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClientClient } from "@/lib/supabase-client"
import { Loader2 } from "lucide-react"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true)
        const supabase = createClientClient()

        // Verificar la sesión actual
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Error al verificar la sesión:", error)
          throw error
        }

        // Si no hay sesión o el token está expirado, redirigir al login
        if (!session || !session.user) {
          console.log("No hay sesión activa, redirigiendo al login")
          router.replace("/login")
          return
        }

        // Verificar que el token no esté expirado
        const expiresAt = session.expires_at
        const now = Math.floor(Date.now() / 1000)

        if (expiresAt && expiresAt < now) {
          console.log("Sesión expirada, redirigiendo al login")
          await supabase.auth.signOut()
          router.replace("/login")
          return
        }

        // Si llegamos aquí, el usuario está autenticado
        setIsAuthenticated(true)
      } catch (error) {
        console.error("Error en la verificación de autenticación:", error)
        // En caso de error, redirigir al login por seguridad
        router.replace("/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()

    // Configurar un listener para cambios en la autenticación
    const { data: authListener } = createClientClient().auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || event === "USER_DELETED" || !session) {
        router.replace("/login")
      }
    })

    return () => {
      // Limpiar el listener cuando el componente se desmonte
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a365d]" />
        <span className="ml-2">Verificando autenticación...</span>
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : null
}
