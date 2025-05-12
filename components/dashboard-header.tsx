"use client"

import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, PanelLeft, ListFilter, ArrowLeft } from "lucide-react"
import { useSidebarContext } from "@/components/app-sidebar"
import { useGroupPermissions } from "@/hooks/use-group-permissions"
import { useEffect, useState } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { AvailableNumbersDialog } from "@/components/available-numbers-dialog"

export function DashboardHeader() {
  const pathname = usePathname()
  const params = useParams()
  const { toggleSidebar } = useSidebarContext()
  const { hasPermission } = useGroupPermissions()
  const canManageExpressions = hasPermission("expressions", "manage")
  const showNewButton = pathname === "/dashboard/expresiones" && canManageExpressions

  // Estado para almacenar el número de expresión
  const [expresionNumero, setExpresionNumero] = useState<string | null>(null)
  const [isAvailableNumbersDialogOpen, setIsAvailableNumbersDialogOpen] = useState(false)

  // Estado para almacenar la información de la petición
  const [peticion, setPeticion] = useState<any>(null)

  // Verificar si estamos en la página de edición de expresión
  const isEditingExpresion = pathname.includes("/dashboard/expresiones") && pathname.includes("/editar")
  const isViewingExpresion = pathname.includes("/dashboard/expresiones") && pathname.includes("/ver")

  // Verificar si estamos en la página de ver petición
  const isViewingPeticion = pathname.includes("/dashboard/peticiones") && pathname.includes("/ver")

  // Obtener el número de expresión cuando estamos en modo edición
  useEffect(() => {
    if ((isEditingExpresion || isViewingExpresion) && params.id) {
      const fetchExpresionNumero = async () => {
        const supabase = createClientClient()
        const { data, error } = await supabase.from("expresiones").select("numero").eq("id", params.id).single()

        if (!error && data) {
          setExpresionNumero(data.numero)
        }
      }

      fetchExpresionNumero()
    }

    // Obtener información de la petición cuando estamos viendo una petición
    if (isViewingPeticion && params.id) {
      const fetchPeticion = async () => {
        const supabase = createClientClient()
        const { data, error } = await supabase.from("peticiones").select("*").eq("id", params.id).single()

        if (!error && data) {
          setPeticion(data)
        }
      }

      fetchPeticion()
    } else {
      setPeticion(null)
    }
  }, [isEditingExpresion, isViewingExpresion, isViewingPeticion, params.id])

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
        {isViewingPeticion && (
          <Button variant="outline" size="sm" asChild className="mr-2">
            <Link href="/dashboard/peticiones">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Ver Peticiones
            </Link>
          </Button>
        )}
        <h1 className="text-xl font-semibold">
          {pathname === "/dashboard" && "Dashboard"}
          {pathname === "/dashboard/expresiones" && "Expresiones"}
          {pathname.includes("/dashboard/expresiones/nueva") && "Nueva Expresión"}
          {isEditingExpresion && (
            <span className="flex items-center">
              Editar Expresión
              {expresionNumero && <span className="ml-2 text-black font-bold">{expresionNumero}</span>}
            </span>
          )}
          {isViewingExpresion && (
            <span className="flex items-center">
              Ver Expresión
              {expresionNumero && <span className="ml-2 text-black font-bold">{expresionNumero}</span>}
            </span>
          )}
          {isViewingPeticion && peticion && (
            <span className="flex items-center gap-2">
              Petición {peticion.num_peticion || `#${peticion.id.substring(0, 8)}`}
              <Badge variant={peticion.archivado ? "outline" : "default"}>
                {peticion.archivado ? "Archivado" : "Activo"}
              </Badge>
            </span>
          )}
          {pathname === "/dashboard/peticiones" && "Peticiones"}
          {pathname === "/dashboard/documentos" && "Documentos del Sistema"}
          {pathname === "/dashboard/comites" && "Comisiones, Senadores y Representantes"}
          {pathname === "/dashboard/temas" && "Temas"}
          {pathname === "/dashboard/etiquetas" && "Etiquetas"}
          {pathname === "/dashboard/reportes" && "Reportes"}
          {pathname === "/dashboard/settings" && "Configuración"}
          {pathname === "/dashboard/perfil" && "Perfil"}
          {pathname === "/dashboard/audit_trail" && "Auditoría del Sistema"}
        </h1>
      </div>
      {showNewButton && (
        <div className="flex gap-2">
          <Link href="/dashboard/expresiones/nueva">
            <Button className="bg-[#1a365d] hover:bg-[#15294d]">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Expresión
            </Button>
          </Link>
          <Button
            onClick={() => setIsAvailableNumbersDialogOpen(true)}
            variant="outline"
            className="border-[#1a365d] text-[#1a365d] hover:bg-[#1a365d] hover:text-white"
          >
            <ListFilter className="mr-2 h-4 w-4" />
            Usar Número Disponible
          </Button>
          <AvailableNumbersDialog open={isAvailableNumbersDialogOpen} onOpenChange={setIsAvailableNumbersDialogOpen} />
        </div>
      )}
    </header>
  )
}
