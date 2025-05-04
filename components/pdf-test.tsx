"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import jsPDF from "jspdf"
import "jspdf-autotable"

export function PdfTest() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const testPdf = () => {
    try {
      setError(null)
      setSuccess(false)

      // Crear un nuevo documento PDF
      const doc = new jsPDF()

      // Verificar si autoTable está disponible
      if (typeof doc.autoTable !== "function") {
        throw new Error("La función autoTable no está disponible")
      }

      // Intentar usar autoTable
      doc.autoTable({
        head: [["Nombre", "Email", "País"]],
        body: [
          ["David", "david@example.com", "Suecia"],
          ["Castille", "castille@example.com", "España"],
          ["John", "john@example.com", "Estados Unidos"],
        ],
      })

      // Si llegamos aquí, todo funciona correctamente
      doc.save("test.pdf")
      setSuccess(true)
    } catch (error) {
      console.error("Error en la prueba de PDF:", error)
      setError(error.message || "Error desconocido al generar PDF")
    }
  }

  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-medium mb-4">Prueba de generación de PDF</h3>
      <Button onClick={testPdf}>Generar PDF de prueba</Button>

      {error && <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">Error: {error}</div>}

      {success && <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-md">¡PDF generado correctamente!</div>}
    </div>
  )
}
