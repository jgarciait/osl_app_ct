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
          <Image src="https://static.wixstatic.com/media/5be21a_136547e15b304e479c7c1d026166d5e9~mv2.png/v1/fill/w_182,h_182,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Logo%20OSL%20copy-01.png" alt="OSL Logo" width={60} height={60} className="mr-4" />
          Sistema de Consultoría Técnica
        </div>
        <div className="relative z-20 w-full pt-[50px] pb-[50px]">
          <Image
            src="https://static.wixstatic.com/media/5be21a_3f47063a0cd84787b87628518e8fcc53~mv2.jpg/v1/fill/w_762,h_571,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/5be21a_3f47063a0cd84787b87628518e8fcc53~mv2.jpg"
            alt="Imagen de Participación Ciudadana"
            width={1200}
            height={300}
            className="w-full h-[300px] object-cover rounded-lg shadow-lg"
            priority
          />
        </div>
        <div className="relative z-20 mt-[30px]">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "Sistema de gestión documental de opiniones legales, proyectos, informes, investigaciones, resoluciones,
            mociones y otros productos técnicos."
            </p>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
          <div className="text-center mb-6">
            <h1 className="text-[#14294b] font-bold text-xl mb-1">Oficina de Estudios Legislativos</h1>
            <h1 className="text-[#14294b] font-bold text-xl mb-4">y Consultoría Técnica</h1>
            <div className="w-16 h-1 bg-[#14294b] mx-auto rounded-full"></div>
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
