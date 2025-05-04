"use client"

import { useState, useEffect } from "react"
import { useSearchParams, usePathname } from "next/navigation"
import { createClientClient } from "@/lib/supabase-client"
import { ExpresionForm } from "@/components/expresion-form"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

export default function NuevaExpresionPage() {
  const [comites, setComites] = useState([])
  const [temas, setTemas] = useState([])
  const [clasificaciones, setClasificaciones] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [nextSequence, setNextSequence] = useState(1)
  const supabase = createClientClient()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // Parámetros para usar un número disponible
  const useAvailableNumber = searchParams.get("useAvailableNumber") === "true"
  const availableYear = searchParams.get("year")
  const availableTema = searchParams.get("tema")
  const availableSequence = searchParams.get("sequence")
  const availableNumero = searchParams.get("numero")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

        // Obtener comités
        const { data: comitesData, error: comitesError } = await supabase
          .from("comites")
          .select("*")
          .order("nombre", { ascending: true })

        if (comitesError) throw comitesError
        setComites(comitesData || [])

        // Obtener temas
        const { data: temasData, error: temasError } = await supabase
          .from("temas")
          .select("*")
          .order("nombre", { ascending: true })

        if (temasError) throw temasError
        setTemas(temasData || [])

        // Obtener clasificaciones
        const { data: clasificacionesData, error: clasificacionesError } = await supabase
          .from("clasificaciones")
          .select("*")
          .order("nombre", { ascending: true })

        if (clasificacionesError) throw clasificacionesError
        setClasificaciones(clasificacionesData || [])

        // Obtener el próximo número de secuencia
        const { data: secuenciaData, error: secuenciaError } = await supabase
          .from("secuencia")
          .select("valor")
          .eq("id", "next_sequence")
          .single()

        if (secuenciaError) {
          console.error("Error al obtener secuencia:", secuenciaError)
          // Si hay error, usar 1 como valor predeterminado
          setNextSequence(1)
        } else {
          setNextSequence(Number.parseInt(secuenciaData.valor, 10))
        }
      } catch (error) {
        console.error("Error al cargar datos:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los datos necesarios. Intente nuevamente.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [supabase, toast])

  // Crear un objeto de expresión con los datos del número disponible si es necesario
  const createExpressionWithAvailableNumber = () => {
    if (!useAvailableNumber || !availableYear || !availableTema || !availableSequence || !availableNumero) {
      return null
    }

    // Convertir los valores a los tipos correctos
    const year = Number.parseInt(availableYear, 10)
    const sequence = Number.parseInt(availableSequence, 10)
    const tema = availableTema

    // Crear un objeto de expresión con los datos del número disponible
    return {
      ano: year,
      tema: tema,
      sequence: sequence,
      numero: availableNumero,
      mes: new Date().getMonth() + 1, // Mes actual
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <ExpresionForm
        comites={comites}
        temas={temas}
        clasificaciones={clasificaciones}
        nextSequence={nextSequence}
        expresion={createExpressionWithAvailableNumber()}
        useAvailableNumber={useAvailableNumber}
        pathname={pathname}
      />
    </div>
  )
}
