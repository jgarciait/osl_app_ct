"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClientClient } from "@/lib/supabase-client"
import { FadeIn, AnimatedButton } from "@/components/ui/animated-components"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export function LoginForm({ isLoggedIn = false }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const [supabase] = useState(() => createClientClient())

  // Si el usuario ya está autenticado, redirigir al dashboard
  useEffect(() => {
    if (isLoggedIn) {
      router.push("/dashboard")
    }
  }, [isLoggedIn, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return
      }

      router.push("/dashboard")
    } catch (err) {
      setError("Ocurrió un error al iniciar sesión. Por favor, inténtelo de nuevo.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FadeIn delay={0.1}>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              placeholder="nombre@ejemplo.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <Link href="/forgot-password" className="text-sm text-muted-foreground hover:underline">
                ¿Olvidó su contraseña?
              </Link>
            </div>
            <Input
              id="password"
              placeholder="********"
              type="password"
              autoComplete="current-password"
              disabled={isLoading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <AnimatedButton type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando sesión...
              </div>
            ) : (
              "Iniciar sesión"
            )}
          </AnimatedButton>
        </FadeIn>
      </form>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
