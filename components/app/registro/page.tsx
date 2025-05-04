"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Image from "next/image"

export default function RegistroPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const { toast } = useToast()
  const supabase = createClientClient()

  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [invitation, setInvitation] = useState(null)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  })

  // Verificar token de invitación - usar useCallback para evitar recreaciones innecesarias
  const verifyInvitation = useCallback(async () => {
    if (!token) {
      setError("No se proporcionó un token de invitación")
      setVerifying(false)
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/invitations?token=${token}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Invitación no válida")
        setVerifying(false)
        setLoading(false)
        return
      }

      // Usar setTimeout para evitar actualizaciones de estado demasiado rápidas
      setTimeout(() => {
        setInvitation(data.invitation)
        setFormData((prev) => ({
          ...prev,
          email: data.invitation.email,
        }))
        setVerifying(false)
        setLoading(false)
      }, 0)
    } catch (error) {
      console.error("Error verifying invitation:", error)
      setError("Error al verificar la invitación")
      setVerifying(false)
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    verifyInvitation()
  }, [verifyInvitation])

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Manejar registro
  const handleRegister = async (e) => {
    e.preventDefault()
    setRegistering(true)
    setError("")

    try {
      // Validar contraseñas
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Las contraseñas no coinciden")
      }

      if (formData.password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres")
      }

      // Registrar usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: formData.password,
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error("No se pudo crear el usuario")
      }

      // Actualizar perfil con datos de la invitación
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: authData.user.id,
        email: invitation.email,
        nombre: invitation.nombre,
        apellido: invitation.apellido || null,
        role: invitation.role || "user",
        updated_at: new Date().toISOString(),
      })

      if (profileError) throw profileError

      // Marcar invitación como utilizada
      const response = await fetch("/api/invitations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token,
          userId: authData.user.id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        console.warn("Error updating invitation status:", data.error)
        // Continuamos aunque haya error, ya que el usuario se creó correctamente
      }

      toast({
        title: "Registro exitoso",
        description: "Su cuenta ha sido creada correctamente. Ahora puede iniciar sesión.",
      })

      // Redirigir al login
      router.push("/login")
    } catch (error) {
      console.error("Error registering user:", error)
      setError(error.message || "Error al registrar usuario")
      setRegistering(false)
    }
  }

  if (loading || verifying) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Verificando invitación...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container flex min-h-screen flex-col items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Invitación no válida</CardTitle>
            <CardDescription className="text-center">
              No se pudo verificar la invitación para registrarse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex justify-center">
              <Button onClick={() => router.push("/login")} className="w-full">
                Volver al inicio de sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container flex min-h-screen flex-col items-center justify-center">
      <div className="flex flex-col items-center mb-8">
        <Image
          src="https://static.wixstatic.com/media/5be21a_ecb3337d08fc4bb4be35f8b2b3cd6780~mv2.png/v1/fill/w_424,h_254,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Logo%20PC%202021-02.png"
          alt="Logo Participación Ciudadana"
          width={212}
          height={127}
          className="mx-auto"
          priority
        />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Crear cuenta</CardTitle>
          <CardDescription className="text-center">Ha sido invitado a crear una cuenta en el sistema.</CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" name="email" type="email" value={formData.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                El correo electrónico no se puede cambiar ya que está asociado a su invitación.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-[#1a365d] hover:bg-[#15294d]" disabled={registering}>
              {registering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                "Crear cuenta"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
