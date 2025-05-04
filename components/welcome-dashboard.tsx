import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function WelcomeDashboard({ userName = "" }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-none shadow-none">
        <CardHeader className="pb-2 px-2 sm:px-6">
          <CardTitle className="text-xl sm:text-3xl">
            {userName ? `Bienvenido, ${userName}` : "Bienvenido al Sistema de Expresiones Legislativas"}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Sistema para la gestión de expresiones ciudadanas de la Oficina de Servicios Legislativos
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="w-full my-4 sm:my-6">
            <Image
              src="/images/capitol.jpg"
              alt="Capitolio de Puerto Rico"
              width={1920}
              height={300}
              className="rounded-lg shadow-lg w-full h-[150px] sm:h-[300px] object-cover"
              priority
            />
          </div>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/dashboard/expresiones" className="block">
              <Card className="transition-colors hover:bg-gray-100 cursor-pointer h-[120px] sm:h-[150px] flex flex-col">
                <CardHeader className="pb-1 sm:pb-2 flex-shrink-0">
                  <CardTitle className="text-base sm:text-lg">Expresiones</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Gestione las expresiones ciudadanas, incluyendo su registro, seguimiento y respuesta.
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard/comites" className="block">
              <Card className="transition-colors hover:bg-gray-100 cursor-pointer h-[120px] sm:h-[150px] flex flex-col">
                <CardHeader className="pb-1 sm:pb-2 flex-shrink-0">
                  <CardTitle className="text-base sm:text-lg">Comisiones</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Añada, edite o elimine comisiones del Senado y la Cámara de Representantes.
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/dashboard" className="block">
              <Card className="transition-colors hover:bg-gray-100 cursor-pointer h-[120px] sm:h-[150px] flex flex-col">
                <CardHeader className="pb-1 sm:pb-2 flex-shrink-0">
                  <CardTitle className="text-base sm:text-lg">Documentos</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Adjunte y gestione documentos relacionados con las expresiones ciudadanas.
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
