"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Bug, ExternalLink, Loader2, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Image from "next/image"
import { useGroupPermissions } from "@/hooks/use-group-permissions"

type BugReport = {
  id: string
  title: string
  description: string
  status: string
  priority: string
  screenshot_url: string | null
  created_at: string
  updated_at: string
  user_id: string
  profiles: {
    nombre: string | null
    apellido: string | null
    email: string | null
  } | null
}

export default function BugReportDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [report, setReport] = useState<BugReport | null>(null)
  const [loading, setLoading] = useState(true)
  const { isAdmin } = useGroupPermissions()

  useEffect(() => {
    // Si el ID es "nuevo", redirigir a la página de creación de reportes
    if (params.id === "nuevo") {
      router.push("/dashboard/bugs/nuevo")
      return
    }

    fetchBugReport()
  }, [params.id, router])

  const fetchBugReport = async () => {
    if (!params.id || params.id === "nuevo") return

    setLoading(true)
    try {
      const supabase = createClientClient()

      // Obtener el reporte de bug
      const { data: bugReport, error: reportError } = await supabase
        .from("bug_reports")
        .select("*")
        .eq("id", params.id)
        .single()

      if (reportError) throw reportError

      // Obtener el perfil del usuario que creó el reporte
      if (bugReport) {
        const { data: userProfile, error: profileError } = await supabase
          .from("profiles")
          .select("nombre, apellido, email")
          .eq("id", bugReport.user_id)
          .single()

        if (profileError && profileError.code !== "PGRST116") {
          console.error("Error al cargar el perfil del usuario:", profileError)
        }

        // Combinar los datos
        setReport({
          ...bugReport,
          profiles: userProfile || null,
        })
      }
    } catch (err) {
      console.error("Error al cargar el reporte:", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el reporte solicitado.",
      })
      router.push("/dashboard/bugs")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!isAdmin || !report) {
      toast({
        variant: "destructive",
        title: "Permiso denegado",
        description: "Solo los administradores pueden eliminar reportes.",
      })
      return
    }

    if (!confirm("¿Está seguro que desea eliminar este reporte? Esta acción no se puede deshacer.")) {
      return
    }

    try {
      const supabase = createClientClient()
      const { error } = await supabase.from("bug_reports").delete().eq("id", report.id)

      if (error) throw error

      toast({
        title: "Reporte eliminado",
        description: "El reporte ha sido eliminado exitosamente.",
      })

      router.push("/dashboard/bugs")
    } catch (err) {
      console.error("Error al eliminar el reporte:", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el reporte. Por favor, intente nuevamente.",
      })
    }
  }

  // Mapeo de prioridades a colores de badge
  const priorityVariant = {
    baja: "outline",
    media: "secondary",
    alta: "default",
    critica: "destructive",
  } as const

  // Mapeo de estados a colores de badge
  const statusVariant = {
    abierto: "outline",
    "en progreso": "secondary",
    resuelto: "success",
    cerrado: "default",
  } as const

  // Si el ID es "nuevo", mostrar un mensaje o redirigir
  if (params.id === "nuevo") {
    return null // No renderizar nada mientras se redirige
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold">Reporte no encontrado</h1>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/bugs")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la lista
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <Button variant="outline" className="mb-6" onClick={() => router.push("/dashboard/bugs")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a la lista
      </Button>

      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Bug className="h-6 w-6" />
              {report.title}
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant={statusVariant[report.status as keyof typeof statusVariant] || "default"}>
                {report.status}
              </Badge>
              <Badge variant={priorityVariant[report.priority as keyof typeof priorityVariant] || "default"}>
                Prioridad: {report.priority}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Descripción</h3>
            <div className="whitespace-pre-wrap bg-muted p-4 rounded-md">{report.description}</div>
          </div>

          {report.screenshot_url && (
            <div>
              <h3 className="text-lg font-medium mb-2">Captura de pantalla</h3>
              <div className="relative h-64 w-full border rounded-md overflow-hidden">
                <Image
                  src={report.screenshot_url || "/placeholder.svg"}
                  alt="Captura de pantalla del bug"
                  fill
                  style={{ objectFit: "contain" }}
                />
              </div>
              <div className="mt-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={report.screenshot_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver imagen completa
                  </a>
                </Button>
              </div>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Reportado por</p>
              <p className="font-medium">
                {report.profiles
                  ? `${report.profiles.nombre || ""} ${report.profiles.apellido || ""}`.trim() || "Usuario desconocido"
                  : "Usuario desconocido"}
              </p>
              <p>{report.profiles?.email || ""}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fecha de reporte</p>
              <p className="font-medium">
                {format(new Date(report.created_at), "dd 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
              <p>{format(new Date(report.created_at), "HH:mm:ss", { locale: es })}</p>
            </div>
          </div>
        </CardContent>
        {isAdmin && (
          <CardFooter className="flex justify-end">
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar reporte
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
