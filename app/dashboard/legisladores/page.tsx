"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { LegisladoresTable } from "@/components/legisladores-table"
import { LegisladorForm } from "@/components/legislador-form"
import { useToast } from "@/components/ui/use-toast"

export default function LegisladoresPage() {
  const [legisladores, setLegisladores] = useState([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClientClient()

  // Fetch legisladores initially and set up real-time subscription
  useEffect(() => {
    // Initial fetch of legisladores
    const fetchLegisladores = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("legisladoresPeticion")
          .select("*")
          .order("nombre", { ascending: true })

        if (error) {
          throw error
        }

        setLegisladores(data || [])
      } catch (error) {
        console.error("Error fetching legisladores:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los legisladores",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchLegisladores()

    // Set up real-time subscription
    const legisladoresSubscription = supabase
      .channel("legisladoresPeticion-changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "legisladoresPeticion",
        },
        (payload) => {
          console.log("Real-time update received:", payload)

          // Handle different types of changes
          if (payload.eventType === "INSERT") {
            setLegisladores((prevLegisladores) => {
              const newLegisladores = [...prevLegisladores, payload.new]
              // Sort the legisladores
              return newLegisladores.sort((a, b) => a.nombre.localeCompare(b.nombre))
            })
            toast({
              title: "Nuevo legislador",
              description: `Se ha añadido el legislador: ${payload.new.nombre}`,
            })
          } else if (payload.eventType === "UPDATE") {
            setLegisladores((prevLegisladores) =>
              prevLegisladores.map((legislador) => (legislador.id === payload.new.id ? payload.new : legislador)),
            )
            toast({
              title: "Legislador actualizado",
              description: `Se ha actualizado el legislador: ${payload.new.nombre}`,
            })
          } else if (payload.eventType === "DELETE") {
            setLegisladores((prevLegisladores) =>
              prevLegisladores.filter((legislador) => legislador.id !== payload.old.id),
            )
            toast({
              title: "Legislador eliminado",
              description: "Se ha eliminado un legislador",
            })
          }
        },
      )
      .subscribe()

    // Clean up subscription when component unmounts
    return () => {
      supabase.removeChannel(legisladoresSubscription)
    }
  }, [supabase, toast])

  return (
    <>
      <div className="w-full py-6 px-4">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <LegisladorForm />
            <LegisladoresTable legisladores={legisladores} />
          </div>
        </div>
      </div>
    </>
  )
}
