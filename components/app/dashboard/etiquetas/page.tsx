"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { EtiquetasTable } from "@/components/etiquetas-table"
import { EtiquetasForm } from "@/components/etiquetas-form"
import { useToast } from "@/components/ui/use-toast"

export default function EtiquetasPage() {
  const [etiquetas, setEtiquetas] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientClient()
  const { toast } = useToast()

  // Cargar etiquetas iniciales
  useEffect(() => {
    const fetchEtiquetas = async () => {
      try {
        const { data, error } = await supabase.from("etiquetas").select("*").order("nombre", { ascending: true })

        if (error) {
          throw error
        }

        setEtiquetas(data || [])
      } catch (error) {
        console.error("Error al obtener etiquetas:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar las etiquetas",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchEtiquetas()
  }, [supabase, toast])

  return (
    <>
      <div className="w-full py-6 px-4">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <EtiquetasForm />
            <EtiquetasTable etiquetas={etiquetas} />
          </div>
        </div>
      </div>
    </>
  )
}
