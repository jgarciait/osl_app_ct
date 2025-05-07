"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus, FileEdit, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/components/ui/use-toast"
import { ConfirmationDialog } from "./ui/confirmation-dialog"

interface Asesor {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono?: string
  departamento?: string
  created_at: string
}

export function AsesoresTable({ asesores = [] }: { asesores: Asesor[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [asesorToDelete, setAsesorToDelete] = useState<Asesor | null>(null)

  const handleEdit = (id: string) => {
    router.push(`/dashboard/asesores/${id}/editar`)
  }

  const handleDelete = async () => {
    if (!asesorToDelete) return

    try {
      const { error } = await supabase.from("asesores").delete().eq("id", asesorToDelete.id)

      if (error) throw error

      toast({
        title: "Asesor eliminado",
        description: "El asesor ha sido eliminado exitosamente.",
      })

      router.refresh()
    } catch (error) {
      console.error("Error al eliminar asesor:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el asesor. Intente nuevamente.",
      })
    } finally {
      setAsesorToDelete(null)
      setDeleteDialogOpen(false)
    }
  }

  const confirmDelete = (asesor: Asesor) => {
    setAsesorToDelete(asesor)
    setDeleteDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Asesores</h2>
        <Button onClick={() => router.push("/dashboard/asesores/nuevo")}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Asesor
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Nombre
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Email
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Teléfono
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Departamento
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {asesores.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No hay asesores registrados
                </td>
              </tr>
            ) : (
              asesores.map((asesor) => (
                <tr key={asesor.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {asesor.nombre} {asesor.apellido}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asesor.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asesor.telefono || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asesor.departamento || "-"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(asesor.id)}>
                          <FileEdit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => confirmDelete(asesor)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Eliminar Asesor"
        description={`¿Está seguro que desea eliminar al asesor ${asesorToDelete?.nombre} ${asesorToDelete?.apellido}?`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
