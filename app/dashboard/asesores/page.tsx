"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { AsesoresTable } from "@/components/asesores-table"
import { AsesoresForm } from "@/components/asesores-form"
import { useToast } from "@/components/ui/use-toast"

export default function AsesoresPage() {
  const [asesores, setAsesores] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientClient()
  const { toast } = useToast()

  // Cargar asesores iniciales
  useEffect(() => {
    const fetchAsesores = async () => {
      try {
        const { data, error } = await supabase.from("asesores").select("*").order("name", { ascending: true })

        if (error) {
          throw error
        }

        setAsesores(data || [])
      } catch (error) {
        console.error("Error al obtener asesores:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los asesores",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAsesores()
  }, [supabase, toast])

  return (
    <>
      <div className="w-full py-6 px-4">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <AsesoresForm />
            <AsesoresTable asesores={asesores} />
          </div>
        </div>
      </div>
    </>
  )
}
