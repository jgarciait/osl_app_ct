"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/login-form"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { UserPlus } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  // Remove the Supabase client initialization here
  // const supabase = createClientClient()

  const handleSignUp = () => {
    router.push("/signup")
  }

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
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
            <p className="text-sm text-muted-foreground">Ingrese sus credenciales para acceder al sistema</p>
          </div>
          <LoginForm />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">O</span>
            </div>
          </div>
          <Button variant="outline" type="button" onClick={handleSignUp} className="flex items-center justify-center">
            <UserPlus className="mr-2 h-4 w-4" />
            Crear nueva cuenta
          </Button>
        </div>
      </div>
    </div>
  )
}
