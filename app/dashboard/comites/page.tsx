"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { ComitesTable } from "@/components/comites-table"
import { ComiteForm } from "@/components/comite-form"
import { useToast } from "@/components/ui/use-toast"

export default function ComitesPage() {
  const [comites, setComites] = useState([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClientClient()

  // Fetch committees initially and set up real-time subscription
  useEffect(() => {
    // Initial fetch of committees
    const fetchComites = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("comites")
          .select("*")
          .order("tipo", { ascending: true })
          .order("nombre", { ascending: true })

        if (error) {
          throw error
        }

        setComites(data || [])
      } catch (error) {
        console.error("Error fetching committees:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las comisiones",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchComites()

    // Set up real-time subscription
    const comitesSubscription = supabase
      .channel("comites-changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "comites",
        },
        (payload) => {
          console.log("Real-time update received:", payload)

          // Handle different types of changes
          if (payload.eventType === "INSERT") {
            setComites((prevComites) => {
              const newComites = [...prevComites, payload.new]
              // Sort the committees
              return newComites.sort((a, b) => {
                if (a.tipo !== b.tipo) {
                  return a.tipo.localeCompare(b.tipo)
                }
                return a.nombre.localeCompare(b.nombre)
              })
            })
            toast({
              title: "Nueva comisión",
              description: `Se ha añadido la comisión: ${payload.new.nombre}`,
            })
          } else if (payload.eventType === "UPDATE") {
            setComites((prevComites) =>
              prevComites.map((comite) => (comite.id === payload.new.id ? payload.new : comite)),
            )
            toast({
              title: "Comisión actualizada",
              description: `Se ha actualizado la comisión: ${payload.new.nombre}`,
            })
          } else if (payload.eventType === "DELETE") {
            setComites((prevComites) => prevComites.filter((comite) => comite.id !== payload.old.id))
            toast({
              title: "Comisión eliminada",
              description: "Se ha eliminado una comisión",
            })
          }
        },
      )
      .subscribe()

    // Clean up subscription when component unmounts
    return () => {
      supabase.removeChannel(comitesSubscription)
    }
  }, [supabase, toast])

  return (
    <>
      <div className="w-full py-6 px-4">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <ComiteForm />
            <ComitesTable comites={comites} />
          </div>
        </div>
      </div>
    </>
  )
}
