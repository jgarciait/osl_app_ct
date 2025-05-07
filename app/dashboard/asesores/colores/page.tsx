"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { AsesoresTable } from "@/components/asesores-table"
import { AsesorForm } from "@/components/asesor-form"
import { useToast } from "@/components/ui/use-toast"

export default function AsesoresPage() {
  const [asesores, setAsesores] = useState([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClientClient()

  // Fetch asesores initially and set up real-time subscription
  useEffect(() => {
    // Initial fetch of asesores
    const fetchAsesores = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase.from("asesores").select("*").order("name", { ascending: true })

        if (error) {
          throw error
        }

        setAsesores(data || [])
      } catch (error) {
        console.error("Error fetching asesores:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los asesores",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAsesores()

    // Set up real-time subscription
    const asesoresSubscription = supabase
      .channel("asesores-changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "asesores",
        },
        (payload) => {
          console.log("Real-time update received:", payload)

          // Handle different types of changes
          if (payload.eventType === "INSERT") {
            setAsesores((prevAsesores) => {
              const newAsesores = [...prevAsesores, payload.new]
              // Sort the asesores
              return newAsesores.sort((a, b) => a.name.localeCompare(b.name))
            })
            toast({
              title: "Nuevo asesor",
              description: `Se ha añadido el asesor: ${payload.new.name}`,
            })
          } else if (payload.eventType === "UPDATE") {
            setAsesores((prevAsesores) =>
              prevAsesores.map((asesor) => (asesor.id === payload.new.id ? payload.new : asesor)),
            )
            toast({
              title: "Asesor actualizado",
              description: `Se ha actualizado el asesor: ${payload.new.name}`,
            })
          } else if (payload.eventType === "DELETE") {
            setAsesores((prevAsesores) => prevAsesores.filter((asesor) => asesor.id !== payload.old.id))
            toast({
              title: "Asesor eliminado",
              description: "Se ha eliminado un asesor",
            })
          }
        },
      )
      .subscribe()

    // Clean up subscription when component unmounts
    return () => {
      supabase.removeChannel(asesoresSubscription)
    }
  }, [supabase, toast])

  return (
    <>
      <div className="w-full py-6 px-4">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <AsesorForm />
            <AsesoresTable asesores={asesores} />
          </div>
        </div>
      </div>
    </>
  )
}
