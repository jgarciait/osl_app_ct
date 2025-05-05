"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Edit, Clock, FileText } from "lucide-react"

export default function VerPeticionPage({ params }) {
  const [peticion, setPeticion] = useState(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()
  const { id } = params

  useEffect(() => {
    const fetchPeticion = async () => {
      const supabase = createClientClient()

      try {
        const { data, error } = await supabase
          .from("peticiones")
          .select(`
            *
          `)
          .eq("id", id)
          .single()

        if (error) throw error

        setPeticion(data)
      } catch (error) {
        console.error("Error fetching peticion:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo cargar la petición solicitada.",
        })
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchPeticion()
    }
  }, [id, toast])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  if (!peticion) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <h2 className="text-2xl font-bold mb-2">Petición no encontrada</h2>
        <p className="text-muted-foreground mb-4">La petición solicitada no existe o no tienes permisos para verla.</p>
        <Button asChild>
          <Link href="/dashboard/peticiones">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Peticiones
          </Link>
        </Button>
      </div>
    )
  }

  const createdAt = new Date(peticion.created_at)
  const updatedAt = peticion.updated_at ? new Date(peticion.updated_at) : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/peticiones">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Petición {peticion.num_peticion || `#${peticion.id.substring(0, 8)}`}</h1>
          <Badge variant={peticion.archivado ? "outline" : "default"}>
            {peticion.archivado ? "Archivado" : "Activo"}
          </Badge>
        </div>
        <Button asChild>
          <Link href={`/dashboard/peticiones/${id}/editar`}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalles de la Petición
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Clasificación</h3>
                <p className="text-lg">{peticion.clasificacion || "No especificada"}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Año / Mes</h3>
                <p className="text-lg">
                  {peticion.year || "-"} / {peticion.mes || "-"}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Asesor</h3>
                <p className="text-lg">{peticion.asesor || "No asignado"}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Estado</h3>
                <p className="text-lg">{peticion.status || "No definido"}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Trámite Despachado</h3>
                <p className="text-lg">{peticion.tramite_despachado ? "Sí" : "No"}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Fecha de recepción</h3>
                <p className="text-lg">
                  {peticion.fecha_recibido
                    ? format(new Date(peticion.fecha_recibido), "dd MMMM yyyy", { locale: es })
                    : "No registrada"}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Fecha de asignación</h3>
                <p className="text-lg">
                  {peticion.fecha_asignacion
                    ? format(new Date(peticion.fecha_asignacion), "dd MMMM yyyy", { locale: es })
                    : "No asignada"}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Creada el</h3>
                <p className="text-lg flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {format(createdAt, "dd MMMM yyyy, HH:mm", { locale: es })}
                </p>
              </div>

              {updatedAt && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Última actualización</h3>
                  <p className="text-lg flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {format(updatedAt, "dd MMMM yyyy, HH:mm", { locale: es })}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Detalles</h3>
            <div className="p-4 rounded-md bg-muted/50 min-h-[100px]">
              {peticion.detalles || "No hay detalles disponibles para esta petición."}
            </div>
          </div>

          {peticion.comentarios && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Comentarios</h3>
              <div className="p-4 rounded-md bg-muted/50 min-h-[100px]">{peticion.comentarios}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
