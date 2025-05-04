"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Search, Loader2 } from "lucide-react"

type AuditTrailRecord = {
  id: number
  created_at: string
  user_id: string
  action: string
  user_email?: string
}

type AuditTrailTableProps = {
  enableRealtime?: boolean
}

export function AuditTrailTable({ enableRealtime = false }: AuditTrailTableProps) {
  const [records, setRecords] = useState<AuditTrailRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const recordsPerPage = 10

  useEffect(() => {
    fetchAuditTrail()

    // Configurar Realtime subscription si está habilitado
    let subscription: any = null

    if (enableRealtime) {
      const supabase = createClientClient()

      subscription = supabase
        .channel("audit-trail-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "audit_trail_expresiones",
          },
          (payload) => {
            console.log("Cambio en tiempo real recibido:", payload)

            // Si es un nuevo registro, actualizar la lista
            if (payload.eventType === "INSERT") {
              // Obtener el email del usuario para el nuevo registro
              const fetchUserEmail = async () => {
                try {
                  const { data, error } = await supabase
                    .from("profiles")
                    .select("email")
                    .eq("id", payload.new.user_id)
                    .single()

                  const newRecord = {
                    id: payload.new.id,
                    created_at: payload.new.created_at,
                    user_id: payload.new.user_id,
                    action: payload.new.action,
                    user_email: data?.email || "Usuario desconocido",
                  }

                  // Añadir el nuevo registro al principio y mantener el límite
                  setRecords((prevRecords) => {
                    const updatedRecords = [newRecord, ...prevRecords]
                    // Mantener solo los primeros recordsPerPage registros
                    return updatedRecords.slice(0, recordsPerPage)
                  })

                  // Actualizar el total de registros
                  setTotalRecords((prev) => prev + 1)
                  setTotalPages(Math.ceil((totalRecords + 1) / recordsPerPage))
                } catch (error) {
                  console.error("Error al obtener email del usuario:", error)
                }
              }

              fetchUserEmail()
            }
          },
        )
        .subscribe()

      console.log("Suscripción Realtime activada para audit_trail_expresiones")
    }

    // Limpiar suscripción al desmontar
    return () => {
      if (subscription) {
        const supabase = createClientClient()
        supabase.removeChannel(subscription)
        console.log("Suscripción Realtime desactivada")
      }
    }
  }, [currentPage, searchTerm, enableRealtime])

  const fetchAuditTrail = async () => {
    setLoading(true)
    try {
      const supabase = createClientClient()

      // Primero, obtener el total de registros para la paginación
      let countQuery = supabase.from("audit_trail_expresiones").select("id", { count: "exact" })

      if (searchTerm) {
        countQuery = countQuery.or(`action.ilike.%${searchTerm}%,user_id.ilike.%${searchTerm}%`)
      }

      const { count, error: countError } = await countQuery

      if (countError) throw countError

      setTotalRecords(count || 0)
      setTotalPages(Math.ceil((count || 0) / recordsPerPage))

      // Luego, obtener los registros para la página actual
      let query = supabase
        .from("audit_trail_expresiones")
        .select(`
          id,
          created_at,
          user_id,
          action,
          profiles:user_id (
            email
          )
        `)
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage - 1)

      if (searchTerm) {
        query = query.or(`action.ilike.%${searchTerm}%,user_id.ilike.%${searchTerm}%`)
      }

      const { data, error } = await query

      if (error) throw error

      // Transformar los datos para incluir el email del usuario
      const formattedData = data.map((record) => ({
        id: record.id,
        created_at: record.created_at,
        user_id: record.user_id,
        action: record.action,
        user_email: record.profiles?.email || "Usuario desconocido",
      }))

      setRecords(formattedData)
    } catch (error) {
      console.error("Error al obtener los registros de auditoría:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      // Mostrar la hora en UTC sin ajustes de zona horaria
      return format(date, "dd/MM/yyyy hh:mm:ss aa", { locale: es })
    } catch (error) {
      console.error("Error al formatear la fecha:", error)
      return dateString
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1) // Resetear a la primera página al buscar
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Buscar por acción o usuario..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button type="submit">
          <Search className="h-4 w-4 mr-2" />
          Buscar
        </Button>
      </form>

      {enableRealtime && (
        <div className="flex items-center text-sm text-green-600">
          <span className="relative flex h-3 w-3 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          Actualizaciones en tiempo real activadas
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-[#1a365d]" />
          <span className="ml-2">Cargando registros de auditoría...</span>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Fecha y Hora (UTC)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length > 0 ? (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.user_email}</TableCell>
                      <TableCell>{record.action}</TableCell>
                      <TableCell>{formatDateTime(record.created_at)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      No se encontraron registros de auditoría
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Mostrando {records.length} de {totalRecords} registros
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="text-sm">
                Página {currentPage} de {totalPages}
              </div>
              <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
