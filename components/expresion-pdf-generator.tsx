import jsPDF from "jspdf"
import "jspdf-autotable"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { createClient } from "@supabase/supabase-js"

// Función para eliminar etiquetas HTML del texto
const stripHtml = (html) => {
  if (!html) return ""

  // Primero reemplazamos <br> y <p> con saltos de línea para preservar el formato
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<p>/gi, "")

  // Luego eliminamos todas las demás etiquetas HTML
  text = text.replace(/<[^>]*>/g, "")

  // Decodificamos entidades HTML comunes
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Eliminamos espacios en blanco múltiples
  text = text.replace(/\s+/g, " ").trim()

  return text
}

// Función para generar el PDF
export const generateExpresionPDF = async (expresion, documentos = [], comites = []) => {
  try {
    // Crear cliente de Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    )

    // Obtener el logo desde Supabase
    const { data: logoData, error: logoError } = await supabase.storage.from("src").download("logo-expresion.png")

    if (logoError) {
      console.error("Error al obtener el logo:", logoError)
    }

    // Crear un nuevo documento PDF
    const doc = new jsPDF()

    // Configuración de la fuente
    doc.setFont("helvetica", "normal")

    // Márgenes y dimensiones
    const margin = 20
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    const contentWidth = pageWidth - margin * 2
    const footerHeight = 40 // Altura reservada para el pie de página
    const headerHeight = 15 // Altura reservada para el encabezado en páginas adicionales

    // Variable para almacenar la imagen del logo en base64
    let logoBase64 = null

    // Función para añadir el logo
    const addLogo = async (y) => {
      if (!logoData) return y

      try {
        if (!logoBase64) {
          // Convertir el blob a base64 solo la primera vez
          const reader = new FileReader()
          reader.readAsDataURL(logoData)

          await new Promise((resolve) => {
            reader.onloadend = () => {
              logoBase64 = reader.result
              resolve()
            }
          })
        }

        // Añadir la imagen al PDF
        const imgWidth = 60 // Ancho de la imagen en mm
        const imgHeight = 30 // Alto de la imagen en mm
        const xPos = (pageWidth - imgWidth) / 2 // Centrar horizontalmente

        doc.addImage(logoBase64, "PNG", xPos, y, imgWidth, imgHeight)
        return y + imgHeight + 15 // Espacio después del logo
      } catch (err) {
        console.error("Error al procesar el logo:", err)
        return y
      }
    }

    // Función para añadir el pie de página
    const addFooter = () => {
      const footerY = pageHeight - 30
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.text(
        "Tel. 787-721-5200 Exts. 305 • 331 Email: participacion@oslpr.org Web: www.oslpr.org/participacion-ciudadana",
        pageWidth / 2,
        footerY,
        { align: "center" },
      )
      doc.text("PO BOX 9023986, San Juan, Puerto Rico 00902-3986", pageWidth / 2, footerY + 5, { align: "center" })
      doc.text("Autorizado por la Oficina del Contralor Electoral OCE-SA-2024-01144", pageWidth / 2, footerY + 10, {
        align: "center",
      })
    }

    // Función para verificar si hay suficiente espacio en la página
    const checkPageBreak = async (currentY, neededSpace) => {
      if (currentY + neededSpace > pageHeight - footerHeight) {
        addFooter() // Añadir pie de página a la página actual
        doc.addPage() // Añadir nueva página
        return await addLogo(margin) // Añadir logo en la nueva página y devolver la nueva posición Y
      }
      return currentY
    }

    // Iniciar con el logo en la primera página
    let currentY = await addLogo(margin)

    // PRIMERA LÍNEA: NOMBRE Y FECHA
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("NOMBRE:", margin, currentY)

    doc.setFont("helvetica", "normal")
    doc.text(expresion?.nombre || "N/A", margin + 20, currentY)

    doc.setFont("helvetica", "bold")
    doc.text("FECHA:", pageWidth - margin - 47, currentY)

    doc.setFont("helvetica", "normal")
    const fechaText = expresion?.fecha_recibido
      ? format(new Date(expresion.fecha_recibido), "dd 'de' MMMM 'de' yyyy", { locale: es })
      : "N/A"
    doc.text(fechaText, pageWidth - margin - 30, currentY)

    currentY += 8

    // SEGUNDA LÍNEA: TEMA
    doc.setFont("helvetica", "bold")
    doc.text("TEMA:", margin, currentY)

    doc.setFont("helvetica", "normal")
    doc.text(expresion?.tema_nombre || "N/A", margin + 15, currentY)

    currentY += 8

    // TERCERA LÍNEA: REFERIDO A
    doc.setFont("helvetica", "bold")
    doc.text("REFERIDO A:", margin, currentY)

    doc.setFont("helvetica", "normal")
    // Construir la lista de comités referidos
    let comitesText = "N/A"
    if (comites && comites.length > 0) {
      comitesText = comites.map((comite) => `${comite.nombre} (${comite.tipo})`).join(", ")
    }
    doc.text(comitesText, margin + 27, currentY)

    currentY += 8

    // CUARTA LÍNEA: TRÁMITES Y FECHA DE RESPUESTA
    doc.setFont("helvetica", "bold")
    doc.text("TRÁMITES:", margin, currentY)

    doc.setFont("helvetica", "normal")
    doc.text(expresion?.tramite || "N/A", margin + 23, currentY)

    doc.setFont("helvetica", "bold")
    doc.text("FECHA DE RESPUESTA:", pageWidth - margin - 75, currentY)

    doc.setFont("helvetica", "normal")
    const fechaRespuestaText = expresion?.fecha_respuesta
      ? format(new Date(expresion.fecha_respuesta), "dd 'de' MMMM 'de' yyyy", { locale: es })
      : expresion?.respuesta
        ? format(new Date(expresion.respuesta), "dd 'de' MMMM 'de' yyyy", { locale: es })
        : "N/A"
    doc.text(fechaRespuestaText, pageWidth - margin - 30, currentY)

    currentY += 8

    // QUINTA LÍNEA: NÚMERO
    doc.setFont("helvetica", "bold")
    doc.text("NÚMERO:", margin, currentY)

    doc.setFont("helvetica", "normal")
    doc.text(expresion?.numero || "N/A", margin + 20, currentY)

    currentY += 10

    // SECCIÓN: PROPUESTA O RESUMEN
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("PROPUESTA O RESUMEN:", margin, currentY)
    currentY += 6

    // Normalizar el contenido HTML antes de añadirlo al PDF
    const normalizedContent = stripHtml(expresion?.propuesta || "N/A")

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    const contentText = doc.splitTextToSize(normalizedContent, contentWidth)

    // Añadir el contenido línea por línea, verificando si hay suficiente espacio
    for (let i = 0; i < contentText.length; i++) {
      currentY = await checkPageBreak(currentY, 5) // Verificar si hay espacio para esta línea
      doc.text(contentText[i], margin, currentY)
      currentY += 5
    }

    currentY += 5
    currentY = await checkPageBreak(currentY, 15) // Verificar si hay espacio para la siguiente sección

    // SECCIÓN: DOCUMENTOS ADJUNTOS
    if (documentos && documentos.length > 0) {
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text("DOCUMENTOS ADJUNTOS:", margin, currentY)
      currentY += 6

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")

      // Añadir documentos línea por línea, verificando si hay suficiente espacio
      for (let i = 0; i < documentos.length; i++) {
        currentY = await checkPageBreak(currentY, 5) // Verificar si hay espacio para este documento
        doc.text(`• ${documentos[i].nombre}`, margin + 5, currentY)
        currentY += 5
      }

      currentY += 5
      currentY = await checkPageBreak(currentY, 15) // Verificar si hay espacio para la siguiente sección
    }

    // SECCIÓN: ANOTACIONES
    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("ANOTACIONES:", margin, currentY)
    currentY += 6

    // Normalizar las notas HTML antes de añadirlas al PDF
    const normalizedNotes = stripHtml(expresion?.notas || "N/A")

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    const notesText = doc.splitTextToSize(normalizedNotes, contentWidth)

    // Añadir las notas línea por línea, verificando si hay suficiente espacio
    for (let i = 0; i < notesText.length; i++) {
      currentY = await checkPageBreak(currentY, 5) // Verificar si hay espacio para esta línea
      doc.text(notesText[i], margin, currentY)
      currentY += 5
    }

    // Añadir el pie de página a la última página
    addFooter()

    // Guardar el PDF
    doc.save(`expresion_${expresion?.numero || "N/A"}.pdf`)
  } catch (error) {
    console.error("Error al generar PDF:", error)
    throw error
  }
}
