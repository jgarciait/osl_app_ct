"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { TemasTable } from "@/components/temas-table"
import { TemaForm } from "@/components/tema-form"
import { useGroupPermissions } from "@/hooks/use-group-permissions"
import { useToast } from "@/components/ui/use-toast"

export default function TemasPage() {
  const { hasPermission } = useGroupPermissions()
  const canManageTemas = hasPermission("topics", "manage")
  const [temas, setTemas] = useState([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const supabase = createClientClient()
    let subscription

    const fetchTemas = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from("temasPeticiones").select("*").order("nombre", { ascending: true })

        if (error) {
          console.error("Error fetching temas:", error)
        }

        setTemas(data || [])
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchTemas()

    // Set up real-time subscription
    const setupSubscription = async () => {
      subscription = supabase
        .channel("temasPeticiones-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "temasPeticiones",
          },
          (payload) => {
            const { eventType, new: newRecord, old: oldRecord } = payload

            if (eventType === "INSERT") {
              setTemas((prevTemas) => [...prevTemas, newRecord].sort((a, b) => a.nombre.localeCompare(b.nombre)))
              toast({
                title: "Nuevo tema añadido",
                description: `El tema "${newRecord.nombre}" ha sido añadido`,
              })
            } else if (eventType === "UPDATE") {
              setTemas((prevTemas) =>
                prevTemas
                  .map((tema) => (tema.id === newRecord.id ? newRecord : tema))
                  .sort((a, b) => a.nombre.localeCompare(b.nombre)),
              )
              toast({
                title: "Tema actualizado",
                description: `El tema "${newRecord.nombre}" ha sido actualizado`,
              })
            } else if (eventType === "DELETE") {
              setTemas((prevTemas) => prevTemas.filter((tema) => tema.id !== oldRecord.id))
              toast({
                title: "Tema eliminado",
                description: `El tema ha sido eliminado`,
              })
            }
          },
        )
        .subscribe()
    }

    setupSubscription()

    // Clean up subscription when component unmounts
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [])

  return (
    <div className="w-full py-6 px-4">
      <div className="space-y-6">
        {canManageTemas && (
          <div>
            <p className="text-muted-foreground">Administre los temas para clasificar las peticiones</p>
          </div>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          {canManageTemas && <TemaForm />}
          <TemasTable temas={temas} />
        </div>
      </div>
    </div>
  )
}
