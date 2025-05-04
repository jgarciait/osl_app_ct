"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, AlertCircle, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Image from "next/image"

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()

  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState("")
  const [debugInfo, setDebugInfo] = useState(null)
  const [invitationValid, setInvitationValid] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    nombre: "",
    apellido: "",
    invitationCode: "",
  })

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Resetear validación cuando cambia email o código
    if (name === "email" || name === "invitationCode") {
      setInvitationValid(false)
      setError("")
      setDebugInfo(null)
    }
  }

  // Verificar código de invitación
  const verifyInvitationCode = async () => {
    if (!formData.email || !formData.invitationCode) {
      setError("Por favor ingrese email y código de invitación")
      return false
    }

    setVerifying(true)
    setError("")
    setDebugInfo(null)

    try {
      // Usar fetch para verificar la invitación (evita problemas de RLS)
      const response = await fetch("/api/invitations/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          invitationCode: formData.invitationCode.trim(),
        }),
      })

      const result = await response.json()

      if (!result.valid) {
        console.log("Verificación fallida:", result.error, result.debug)
        setError(result.error || "Código de invitación inválido")
        setInvitationValid(false)

        // Guardar información de depuración
        if (result.debug) {
          setDebugInfo(result.debug)
        }

        return false
      }

      // Si la invitación es válida, prellenar nombre y apellido si están disponibles
      if (result.invitation?.nombre) {
        setFormData((prev) => ({
          ...prev,
          nombre: prev.nombre || result.invitation.nombre,
          apellido: prev.apellido || result.invitation.apellido || "",
        }))
      }

      setInvitationValid(true)
      return true
    } catch (error) {
      console.error("Error verificando invitación:", error)
      setError("Error al verificar el código de invitación")
      setInvitationValid(false)
      return false
    } finally {
      setVerifying(false)
    }
  }

  // Manejar registro
  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Verificar invitación primero si aún no se ha validado
      if (!invitationValid) {
        const isValid = await verifyInvitationCode()
        if (!isValid) {
          setLoading(false)
          return
        }
      }

      // Validar contraseñas
      if (formData.password !== formData.confirmPassword) {
        throw new Error("Las contraseñas no coinciden")
      }

      if (formData.password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres")
      }

      // 1. Registrar usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            nombre: formData.nombre,
            apellido: formData.apellido,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) {
        console.error("Error en auth.signUp:", authError)
        throw new Error(authError.message || "Error al registrar usuario")
      }

      if (!authData.user) {
        throw new Error("No se pudo crear el usuario")
      }

      console.log("Usuario creado:", authData.user.id)

      // 2. Eliminar la invitación usando la API
      try {
        console.log("Intentando eliminar invitación:", {
          email: formData.email.toLowerCase().trim(),
          invitationCode: formData.invitationCode.trim(),
          userId: authData.user.id,
        })

        const markResponse = await fetch("/api/invitations/use", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email.toLowerCase().trim(),
            invitationCode: formData.invitationCode.trim(),
            userId: authData.user.id,
          }),
        })

        const responseData = await markResponse.json()
        console.log("Respuesta de API de invitación:", {
          status: markResponse.status,
          ok: markResponse.ok,
          data: responseData,
        })

        if (!markResponse.ok) {
          console.warn("Error al marcar invitación como usada:", responseData)
          // Mostrar el error pero continuar con el registro
          toast({
            variant: "warning",
            title: "Advertencia",
            description:
              "Se creó la cuenta pero hubo un problema al procesar la invitación: " +
              (responseData.error || "Error desconocido"),
          })
        } else {
          console.log("Invitación marcada como utilizada correctamente:", responseData)
        }
      } catch (markError) {
        console.error("Error al llamar a la API de uso de invitación:", markError)
        // No lanzamos error aquí, continuamos con el registro
      }

      toast({
        title: "Registro exitoso",
        description:
          "Su cuenta ha sido creada correctamente. Por favor verifique su correo electrónico para confirmar su cuenta.",
      })

      // Redirigir al login
      router.push("/login")
    } catch (error) {
      console.error("Error registering user:", error)
      setError(error.message || "Error al registrar usuario")
    } finally {
      setLoading(false)
    }
  }

  // Efecto para verificar el código cuando ambos campos están completos
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.email && formData.invitationCode && formData.invitationCode.length === 4) {
        verifyInvitationCode()
      }
    }, 500) // Verificar después de 500ms de inactividad

    return () => clearTimeout(timeoutId)
  }, [formData.email, formData.invitationCode])

  return (
    <div className="container relative flex h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-[#1a365d]" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Image
            src="/images/logo.png"
            alt="Logo Oficina de Servicios Legislativos"
            width={80}
            height={80}
            className="mr-4"
          />
          Sistema de Expresiones Ciudadanas
        </div>
        <div className="relative z-20 w-full pt-[50px] pb-[50px]">
          <Image
            src="/images/capitol.jpg"
            alt="Capitolio de Puerto Rico"
            width={1200}
            height={300}
            className="w-full h-[300px] object-cover rounded-lg shadow-lg"
            priority
          />
        </div>
        <div className="relative z-20 mt-[30px]">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "Este sistema permite gestionar las expresiones ciudadanas y facilitar la integración de los ciudadanos en
              los procesos legislativos."
            </p>
            <footer className="text-sm">Oficina de Participación Ciudadana</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
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

        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Crear cuenta</CardTitle>
            <CardDescription className="text-center">
              Ingrese sus datos y el código de invitación para registrarse
            </CardDescription>
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

              {debugInfo && debugInfo.availableCodes && debugInfo.availableCodes.length > 0 && (
                <Alert className="mb-4 bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-500" />
                  <AlertTitle className="text-blue-700">Códigos disponibles para este email</AlertTitle>
                  <AlertDescription className="text-blue-600">
                    {debugInfo.availableCodes.map((item, index) => (
                      <div key={index} className="mt-1">
                        <code className="bg-blue-100 px-1 py-0.5 rounded">{item.code}</code>
                        {item.status !== "pending" && <span className="ml-2 text-xs">({item.status})</span>}
                      </div>
                    ))}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className={invitationValid ? "border-green-500" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invitationCode">
                  Código de invitación (4 dígitos)
                  {verifying && (
                    <span className="ml-2 inline-block">
                      <Loader2 className="h-4 w-4 animate-spin inline" />
                    </span>
                  )}
                  {invitationValid && <span className="ml-2 text-green-500">✓ Válido</span>}
                </Label>
                <Input
                  id="invitationCode"
                  name="invitationCode"
                  value={formData.invitationCode}
                  onChange={handleInputChange}
                  required
                  maxLength={4}
                  pattern="[0-9]{4}"
                  placeholder="Ej: 1234"
                  className={invitationValid ? "border-green-500" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  Ingrese el código de 4 dígitos que recibió con su invitación
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" name="nombre" value={formData.nombre} onChange={handleInputChange} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input
                    id="apellido"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleInputChange}
                    required
                  />
                </div>
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
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full bg-[#1a365d] hover:bg-[#15294d]"
                disabled={loading || !invitationValid}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  "Crear cuenta"
                )}
              </Button>
              <div className="text-center w-full">
                <a href="/login" className="text-sm text-[#1a365d] hover:underline">
                  ¿Ya tiene una cuenta? Iniciar sesión
                </a>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
