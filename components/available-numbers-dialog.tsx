"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AvailableNumbersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AvailableNumbersDialog({ open, onOpenChange }: AvailableNumbersDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientClient()

  const [isLoading, setIsLoading] = useState(false)
  const [years, setYears] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<string>("")
  const [availableNumbers, setAvailableNumbers] = useState<{ sequence: number; numero: string }[]>([])
  const [selectedNumber, setSelectedNumber] = useState<string>("")
  const [temas, setTemas] = useState<any[]>([])
  const [selectedTema, setSelectedTema] = useState<string>("")
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar años y temas al abrir el diálogo
  useEffect(() => {
    if (open) {
      loadYearsAndTemas()
    }
  }, [open])

  // Función para cargar años y temas
  const loadYearsAndTemas = async () => {
    setIsLoading(true)
    try {
      // Obtener años únicos de expresiones existentes
      const { data: expresionesData, error: expresionesError } = await supabase
        .from("expresiones")
        .select("ano")
        .order("ano", { ascending: false })

      if (expresionesError) throw expresionesError

      const uniqueYears = [...new Set(expresionesData.map((item) => item.ano))]
      setYears(uniqueYears)

      // Establecer el año actual como predeterminado
      const currentYear = new Date().getFullYear()
      if (uniqueYears.includes(currentYear)) {
        setSelectedYear(currentYear.toString())
      } else if (uniqueYears.length > 0) {
        setSelectedYear(uniqueYears[0].toString())
      }

      // Obtener temas
      const { data: temasData, error: temasError } = await supabase
        .from("temas")
        .select("id, nombre, abreviatura")
        .order("nombre")

      if (temasError) throw temasError

      setTemas(temasData || [])
    } catch (error) {
      console.error("Error al cargar datos iniciales:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos iniciales. Intente nuevamente.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Función para buscar números disponibles
  const searchAvailableNumbers = async () => {
    if (!selectedYear || !selectedTema) {
      setError("Por favor seleccione un año y un tema para buscar números disponibles.")
      return
    }

    setError(null)
    setIsSearching(true)
    setAvailableNumbers([])
    setSelectedNumber("")

    try {
      // Obtener el tema seleccionado para su abreviatura
      const tema = temas.find((t) => t.id === selectedTema)
      if (!tema) {
        throw new Error("Tema no encontrado")
      }

      const abreviatura = tema.abreviatura || "RNAR"
      const year = Number.parseInt(selectedYear, 10)

      // Obtener todas las expresiones para el año seleccionado
      const { data: expresiones, error: expresionesError } = await supabase
        .from("expresiones")
        .select("sequence, numero")
        .eq("ano", year)
        .order("sequence", { ascending: true })

      if (expresionesError) throw expresionesError

      // Si no hay expresiones para este año, no hay huecos
      if (!expresiones || expresiones.length === 0) {
        setError(`No hay expresiones para el año ${year}. No se pueden encontrar huecos.`)
        return
      }

      // Encontrar huecos en la secuencia
      const gaps = []
      let maxSequence = 0

      // Ordenar expresiones por sequence
      const sortedExpresiones = [...expresiones].sort((a, b) => a.sequence - b.sequence)

      // Encontrar el número máximo de secuencia
      if (sortedExpresiones.length > 0) {
        maxSequence = sortedExpresiones[sortedExpresiones.length - 1].sequence
      }

      // Crear un conjunto de secuencias existentes para búsqueda rápida
      const existingSequences = new Set(sortedExpresiones.map((exp) => exp.sequence))

      // Buscar huecos desde 1 hasta maxSequence
      for (let i = 1; i < maxSequence; i++) {
        if (!existingSequences.has(i)) {
          // Generar el número de expresión para este hueco
          const sequenceStr = i.toString().padStart(4, "0")
          const numeroExpresion = `${year}-${sequenceStr}-${abreviatura}`

          gaps.push({
            sequence: i,
            numero: numeroExpresion,
          })
        }
      }

      if (gaps.length === 0) {
        setError(`No se encontraron números disponibles para el año ${year} y tema ${tema.nombre}.`)
      } else {
        setAvailableNumbers(gaps)
      }
    } catch (error) {
      console.error("Error al buscar números disponibles:", error)
      setError("Ocurrió un error al buscar números disponibles. Intente nuevamente.")
    } finally {
      setIsSearching(false)
    }
  }

  // Función para crear una nueva expresión con el número seleccionado
  const createExpressionWithNumber = async () => {
    if (!selectedNumber || !selectedYear || !selectedTema) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor seleccione un número disponible, año y tema.",
      })
      return
    }

    // Encontrar el objeto de número seleccionado
    const selectedNumberObj = availableNumbers.find((num) => num.numero === selectedNumber)
    if (!selectedNumberObj) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Número seleccionado no válido.",
      })
      return
    }

    try {
      // Mostrar indicador de carga
      setIsLoading(true)

      // Crear la expresión directamente
      const year = Number.parseInt(selectedYear, 10)
      const sequence = selectedNumberObj.sequence

      // Obtener el tema seleccionado
      const tema = temas.find((t) => t.id === selectedTema)
      if (!tema) {
        throw new Error("Tema no encontrado")
      }

      // Crear la expresión en la base de datos
      const { data, error } = await supabase
        .from("expresiones")
        .insert({
          ano: year,
          tema: selectedTema,
          sequence: sequence,
          numero: selectedNumberObj.numero,
          mes: new Date().getMonth() + 1, // Mes actual
          fecha_recibido: new Date().toISOString(),
          nombre: `Nueva expresión ${selectedNumberObj.numero}`, // Nombre temporal
          propuesta: "", // Propuesta vacía
        })
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        throw new Error("No se pudo crear la expresión")
      }

      const expresionId = data[0].id

      // Cerrar el diálogo
      onOpenChange(false)

      // Mostrar mensaje de éxito
      toast({
        title: "Expresión creada",
        description: `Se ha creado la expresión con número ${selectedNumberObj.numero}`,
      })

      // Redirigir a la página de edición
      router.push(`/dashboard/expresiones/${expresionId}/editar`)
    } catch (error) {
      console.error("Error al crear expresión:", error)
      toast({
        variant: "destructive",
        title: "Error al crear expresión",
        description: error.message || "Ocurrió un error al crear la expresión. Intente nuevamente.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Usar Número Disponible</DialogTitle>
          <DialogDescription>
            Seleccione un año y tema para buscar números disponibles (huecos) en la secuencia.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Año</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear} disabled={isLoading}>
                <SelectTrigger id="year">
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tema">Tema</Label>
              <Select value={selectedTema} onValueChange={setSelectedTema} disabled={isLoading}>
                <SelectTrigger id="tema">
                  <SelectValue placeholder="Seleccionar tema" />
                </SelectTrigger>
                <SelectContent>
                  {temas.map((tema) => (
                    <SelectItem key={tema.id} value={tema.id}>
                      {tema.nombre} ({tema.abreviatura || "Sin abreviatura"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={searchAvailableNumbers}
            disabled={isSearching || !selectedYear || !selectedTema}
            className="w-full"
          >
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
              </>
            ) : (
              "Buscar Números Disponibles"
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {availableNumbers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="availableNumber">Números Disponibles</Label>
              <Select value={selectedNumber} onValueChange={setSelectedNumber}>
                <SelectTrigger id="availableNumber">
                  <SelectValue placeholder="Seleccionar número disponible" />
                </SelectTrigger>
                <SelectContent>
                  {availableNumbers.map((num) => (
                    <SelectItem key={num.sequence} value={num.numero}>
                      {num.numero} (Secuencia: {num.sequence})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={createExpressionWithNumber}
            disabled={!selectedNumber || isLoading}
            className="bg-[#1a365d] hover:bg-[#15294d]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear Expresión"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
