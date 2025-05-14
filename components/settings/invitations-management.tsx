"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Search, MoreHorizontal, Plus, Trash, Loader2, RefreshCw, Copy, Check, Mail } from "lucide-react"

function generateInvitationCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

export function InvitationsManagement() {
  const { toast } = useToast()
  const supabase = createClientClient()

  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedInvitation, setSelectedInvitation] = useState(null)
  const [formData, setFormData] = useState({
    email: "",
    nombre: "",
    apellido: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Añadir esta línea al inicio del componente para obtener la sesión del usuario
  const [currentUser, setCurrentUser] = useState(null)

  // Nuevos estados para el diálogo de código de invitación
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false)
  const [invitationCode, setInvitationCode] = useState("")
  const [invitationEmail, setInvitationEmail] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const [dialogTitle, setDialogTitle] = useState("Código de Invitación")

  // Cargar invitaciones al montar el componente
  useEffect(() => {
    fetchInvitations()
  }, [])

  // Añadir este useEffect después del useEffect existente
  useEffect(() => {
    // Obtener el usuario actual
    const getCurrentUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        setCurrentUser(session.user)
      }
    }

    getCurrentUser()
  }, [supabase.auth])

  // Función para obtener invitaciones
  const fetchInvitations = async () => {
    setLoading(true)
    try {
      console.log("Iniciando carga de invitaciones...")

      // Primero verificar si hay registros en la tabla
      const { count, error: countError } = await supabase
        .from("invitations")
        .select("*", { count: "exact", head: true })

      console.log("Total de registros en la tabla invitations:", count)

      if (countError) {
        console.error("Error al contar invitaciones:", countError)
      }

      // Luego hacer la consulta completa
      const { data, error } = await supabase.from("invitations").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("Error en la consulta:", error)
        throw error
      }

      console.log("Invitaciones cargadas:", data ? data.length : 0)
      if (data && data.length > 0) {
        console.log("Primera invitación:", data[0])
      } else {
        console.log("No se encontraron invitaciones en la respuesta")
      }

      setInvitations(data || [])
    } catch (error) {
      console.error("Error fetching invitations:", error)
      toast({
        variant: "destructive",
        title: "Error al cargar invitaciones",
        description: error.message || "No se pudieron cargar las invitaciones",
      })
    } finally {
      setLoading(false)
    }
  }

  // Función para copiar al portapapeles
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)

      // Mostrar toast de confirmación
      toast({
        title: "Código copiado",
        description: "El código de invitación ha sido copiado al portapapeles",
      })

      // Resetear el estado después de 2 segundos
      setTimeout(() => {
        setIsCopied(false)
      }, 2000)
    } catch (err) {
      console.error("Error al copiar al portapapeles:", err)
      toast({
        variant: "destructive",
        title: "Error al copiar",
        description: "No se pudo copiar el código al portapapeles",
      })
    }
  }

  // Filtrar invitaciones según la búsqueda
  const filteredInvitations = invitations.filter(
    (invitation) =>
      invitation.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invitation.nombre.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Abrir diálogo de eliminación
  const handleDeleteInvitation = (invitation) => {
    setSelectedInvitation(invitation)
    setIsDeleteDialogOpen(true)
  }

  // Modificar la función handleCreateInvitation para incluir el created_by y mostrar el código
  const handleCreateInvitation = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validar datos
      if (!formData.email || !formData.nombre) {
        throw new Error("Por favor ingrese un email y nombre")
      }

      // Verificar que tenemos el usuario actual
      if (!currentUser) {
        throw new Error("No se pudo determinar el usuario actual. Por favor, recargue la página.")
      }

      // Generar código de invitación
      const invitationCode = generateInvitationCode()

      // Crear invitación en la base de datos
      const { data: invitation, error: invitationError } = await supabase
        .from("invitations")
        .insert({
          email: formData.email,
          nombre: formData.nombre,
          apellido: formData.apellido,
          invitation_code: invitationCode,
          created_by: currentUser.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "pending",
          department_id: 2,
        })
        .select()
        .single()

      if (invitationError) throw invitationError

      toast({
        title: "Invitación creada",
        description: "La invitación ha sido creada exitosamente",
      })

      // Cerrar diálogo de creación
      setIsAddDialogOpen(false)

      // Preparar y mostrar el diálogo con el código
      setInvitationCode(invitationCode)
      setInvitationEmail(formData.email)
      setDialogTitle("Nueva Invitación Creada")
      setIsCodeDialogOpen(true)

      // Recargar invitaciones
      fetchInvitations()

      // Limpiar formulario
      setFormData({
        email: "",
        nombre: "",
        apellido: "",
      })
    } catch (error) {
      console.error("Error creating invitation:", error)
      toast({
        variant: "destructive",
        title: "Error al crear invitación",
        description: error.message || "No se pudo crear la invitación",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Modificar la función handleRefreshInvitationCode para mostrar el nuevo código
  const handleRefreshInvitationCode = async (invitation) => {
    setIsSubmitting(true)

    try {
      // Verificar que tenemos el usuario actual
      if (!currentUser) {
        throw new Error("No se pudo determinar el usuario actual. Por favor, recargue la página.")
      }

      // Generar nuevo código de invitación
      const newCode = generateInvitationCode()

      // Actualizar la invitación con el nuevo código - sin updated_at ni updated_by
      const { error } = await supabase
        .from("invitations")
        .update({
          invitation_code: newCode,
        })
        .eq("id", invitation.id)

      if (error) throw error

      toast({
        title: "Código actualizado",
        description: "El código de invitación ha sido actualizado exitosamente",
      })

      // Preparar y mostrar el diálogo con el código
      setInvitationCode(newCode)
      setInvitationEmail(invitation.email)
      setDialogTitle("Código de Invitación Actualizado")
      setIsCodeDialogOpen(true)

      // Recargar invitaciones
      fetchInvitations()
    } catch (error) {
      console.error("Error refreshing invitation code:", error)
      toast({
        variant: "destructive",
        title: "Error al actualizar código",
        description: error.message || "No se pudo actualizar el código de invitación",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Modificar la función handleConfirmDelete para mejorar el manejo de errores
  const handleConfirmDelete = async () => {
    setIsSubmitting(true)

    try {
      // Verificar si la invitación existe
      const { data: checkData, error: checkError } = await supabase
        .from("invitations")
        .select("id")
        .eq("id", selectedInvitation.id)
        .single()

      if (checkError) {
        console.error("Error verificando invitación:", checkError)
        throw new Error("No se pudo verificar la invitación")
      }

      if (!checkData) {
        throw new Error("La invitación no existe o ya fue eliminada")
      }

      // Eliminar invitación
      const { error } = await supabase.from("invitations").delete().eq("id", selectedInvitation.id)

      if (error) {
        console.error("Error detallado al eliminar:", error)

        // Si es un error de permisos, mostrar mensaje específico
        if (error.code === "42501" || error.message?.includes("permission")) {
          throw new Error("No tienes permisos para eliminar esta invitación")
        }

        throw error
      }

      toast({
        title: "Invitación eliminada",
        description: "La invitación ha sido eliminada exitosamente",
      })

      // Cerrar diálogo y recargar invitaciones
      setIsDeleteDialogOpen(false)
      fetchInvitations()
    } catch (error) {
      console.error("Error deleting invitation:", error)
      toast({
        variant: "destructive",
        title: "Error al eliminar invitación",
        description: error.message || "No se pudo eliminar la invitación",
      })
    } finally {
      setIsSubmitting(false)
      setIsDeleteDialogOpen(false) // Cerrar el diálogo incluso si hay error
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-[350px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar invitaciones..."
            className="w-full pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1a365d] hover:bg-[#15294d]">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Invitación
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Crear Nueva Invitación</DialogTitle>
              <DialogDescription>
                Complete el formulario para enviar una invitación a un nuevo usuario.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateInvitation}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nombre" className="text-right">
                    Nombre
                  </Label>
                  <Input
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="apellido" className="text-right">
                    Apellido
                  </Label>
                  <Input
                    id="apellido"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-[#1a365d] hover:bg-[#15294d]">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Crear Invitación"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Fixed height container to prevent layout shifts */}
          <div className="h-[500px] w-full" style={{ overflow: "auto" }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  <th className="text-left p-3 border-b">Email</th>
                  <th className="text-left p-3 border-b">Nombre</th>
                  <th className="text-left p-3 border-b">Estado</th>
                  <th className="text-left p-3 border-b w-[80px]"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredInvitations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <p>No se encontraron invitaciones</p>
                        <p className="text-sm text-muted-foreground">
                          {invitations.length > 0
                            ? "No hay coincidencias con el filtro de búsqueda"
                            : "No hay invitaciones registradas en el sistema"}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            fetchInvitations()
                            toast({
                              title: "Actualizando",
                              description: "Actualizando lista de invitaciones",
                            })
                          }}
                        >
                          Actualizar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInvitations.map((invitation) => (
                    <tr key={invitation.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{invitation.email}</td>
                      <td className="p-3">{`${invitation.nombre} ${invitation.apellido || ""}`}</td>
                      <td className="p-3">{invitation.status}</td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleRefreshInvitationCode(invitation)}
                              disabled={invitation.status === "used"}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Refrescar código
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteInvitation(invitation)}
                              className="text-red-600"
                            >
                              <Trash className="mr-2 h-4 w-4" />
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
        </CardContent>
      </Card>

      {/* Diálogo para mostrar el código de invitación */}
      <Dialog open={isCodeDialogOpen} onOpenChange={setIsCodeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>Comparta este código con el usuario para que pueda registrarse.</DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="mb-4">
              <Label className="text-sm text-muted-foreground mb-1 block">Email del usuario</Label>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{invitationEmail}</span>
              </div>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">Código de invitación</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 p-4 bg-gray-50 rounded-md text-center">
                  <span className="text-2xl font-bold tracking-widest">{invitationCode}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(invitationCode)}
                  className="h-12 w-12"
                >
                  {isCopied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                </Button>
              </div>
            </div>

            <div className="mt-6 p-3 bg-blue-50 border border-blue-100 rounded-md">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Instrucciones:</span> Envíe este código al usuario junto con el enlace de
                registro. El usuario deberá ingresar este código y su correo electrónico para completar el registro.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => copyToClipboard(invitationCode)} className="bg-[#1a365d] hover:bg-[#15294d]">
              {isCopied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Código
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setIsCodeDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la invitación para
              {selectedInvitation && ` ${selectedInvitation.email}`}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
