"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientClient, handleAuthError } from "@/lib/supabase-client"

export default function Home() {
  const router = useRouter()
  const supabase = createClientClient()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          throw error
        }

        if (data && data.session) {
          router.push("/dashboard")
        } else {
          router.push("/login")
        }
      } catch (error) {
        console.error("Error al verificar sesión:", error)
        handleAuthError(error)
        router.push("/login")
      }
    }

    checkSession()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Cargando...</h1>
        <p>Redirigiendo a la página apropiada...</p>
      </div>
    </div>
  )
}
