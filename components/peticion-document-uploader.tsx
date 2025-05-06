"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Loader2, Upload, File, Trash, ExternalLink, FileText } from "lucide-react"
import { normalizeFilename } from "@/lib/normalize-filename"
import { formatFileSize } from "@/lib/format-file-size"
import { Progress } from "@/components/ui/progress"

interface PeticionDocumentUploaderProps {
  peticionId: string
}

interface DocumentFile {
  id: string
  name: string
  originalName: string
  size: number
  type: string
  url: string
  uploadedAt: string
}

export function PeticionDocumentUploader({ peticionId }: PeticionDocumentUploaderProps) {
  const { toast } = useToast()
  const supabase = createClientClient()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<DocumentFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cargar documentos existentes al montar el componente
  useEffect(() => {
    const loadExistingDocuments = async () => {
      if (!peticionId) return

      try {
        setIsLoading(true)
        const { data, error } = await supabase.from("documentos_peticiones").select("*").eq("peticion_id", peticionId)

        if (error) throw error

        if (data && data.length > 0) {
          // Para cada documento, obtener la URL firmada
          const filesWithUrls = await Promise.all(
            data.map(async (doc) => {
              const { data: urlData } = await supabase.storage
                .from("documentos")
                .createSignedUrl(`peticiones/${doc.ruta}`, 60 * 60) // URL válida por 1 hora

              return {
                id: doc.id,
                name: doc.ruta,
                originalName: doc.nombre,
                size: doc.tamano,
                type: doc.tipo,
                url: urlData?.signedUrl || "",
                uploadedAt: doc.created_at,
              }
            }),
          )

          setUploadedFiles(filesWithUrls)
        }
      } catch (error) {
        console.error("Error loading documents:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los documentos existentes.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadExistingDocuments()
  }, [peticionId, supabase, toast])

  // Función para subir archivo con simulación de progreso
  const uploadFileWithProgress = async (file: File, normalizedFilename: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      // Simulamos el progreso de carga
      let progress = 0
      const totalSize = file.size
      const chunkSize = totalSize / 100 // Dividimos en 100 partes para el progreso

      // Función para simular el progreso
      const simulateProgress = () => {
        // Incrementamos el progreso de forma no lineal para simular una carga real
        // Al principio avanza más rápido y luego se ralentiza
        if (progress < 90) {
          progress += Math.random() * 3 + 1 // Incremento aleatorio entre 1 y 4
          if (progress > 90) progress = 90 // No pasamos del 90% hasta que termine
          setUploadProgress(Math.floor(progress))
          setTimeout(simulateProgress, 200) // Actualizamos cada 200ms
        }
      }

      // Iniciamos la simulación de progreso
      simulateProgress()

      // Realizamos la carga real con Supabase
      supabase.storage
        .from("documentos")
        .upload(`peticiones/${normalizedFilename}`, file, {
          cacheControl: "3600",
          upsert: false,
        })
        .then(({ data, error }) => {
          if (error) {
            reject(error)
            return
          }

          // Carga completada, establecemos progreso al 100%
          setUploadProgress(100)
          setTimeout(() => resolve(true), 500) // Pequeña pausa para mostrar el 100%
        })
        .catch(reject)
    })
  }

  const processFiles = async (files: FileList | File[]) => {
    if (!files.length || !peticionId) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const uploadedDocs: DocumentFile[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const originalFilename = file.name
        const normalizedFilename = normalizeFilename(originalFilename)

        // Subir archivo con simulación de progreso
        await uploadFileWithProgress(file, normalizedFilename)

        // Guardar información en la tabla documentos_peticiones
        const { data: docData, error: docError } = await supabase
          .from("documentos_peticiones")
          .insert({
            peticion_id: peticionId,
            nombre: originalFilename, // Nombre original para mostrar al usuario
            ruta: normalizedFilename, // Nombre normalizado usado en el storage
            tipo: file.type,
            tamano: file.size,
          })
          .select()

        if (docError) throw docError

        // Obtener URL firmada para previsualización
        const { data: urlData } = await supabase.storage
          .from("documentos")
          .createSignedUrl(`peticiones/${normalizedFilename}`, 60 * 60) // URL válida por 1 hora

        uploadedDocs.push({
          id: docData[0].id,
          name: normalizedFilename,
          originalName: originalFilename,
          size: file.size,
          type: file.type,
          url: urlData?.signedUrl || "",
          uploadedAt: new Date().toISOString(),
        })
      }

      setUploadedFiles((prev) => [...prev, ...uploadedDocs])

      toast({
        title: "Documentos subidos",
        description: `${files.length} documento(s) subido(s) correctamente.`,
      })
    } catch (error) {
      console.error("Error uploading files:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron subir los documentos. Por favor, intente nuevamente.",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
      // Limpiar el input de archivos
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    processFiles(files)
  }

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        processFiles(files)
      }
    },
    [peticionId],
  )

  const handleRemoveFile = async (fileId: string, fileName: string) => {
    try {
      // Eliminar el registro de la base de datos
      const { error: dbError } = await supabase.from("documentos_peticiones").delete().eq("id", fileId)

      if (dbError) throw dbError

      // Eliminar el archivo del storage
      const { error: storageError } = await supabase.storage.from("documentos").remove([`peticiones/${fileName}`])

      if (storageError) throw storageError

      // Actualizar el estado
      setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId))

      toast({
        title: "Documento eliminado",
        description: "El documento ha sido eliminado correctamente.",
      })
    } catch (error) {
      console.error("Error removing file:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el documento. Por favor, intente nuevamente.",
      })
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) {
      return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-red-500" />
    } else if (fileType.includes("image")) {
      return <File className="h-4 w-4 mr-2 flex-shrink-0 text-green-500" />
    } else if (fileType.includes("word") || fileType.includes("document")) {
      return <File className="h-4 w-4 mr-2 flex-shrink-0 text-blue-500" />
    } else if (fileType.includes("excel") || fileType.includes("sheet")) {
      return <File className="h-4 w-4 mr-2 flex-shrink-0 text-green-600" />
    } else {
      return <File className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
          isDragging
            ? "border-primary bg-primary/5"
            : isUploading
              ? "border-blue-300 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={handleFileUpload}
          disabled={isUploading}
        />
        <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer h-full">
          <Upload className={`h-10 w-10 mb-2 ${isDragging ? "text-primary animate-pulse" : "text-gray-400"}`} />
          <p className="text-sm font-medium">
            {isUploading ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo documentos...
              </span>
            ) : isDragging ? (
              "Suelte los archivos aquí"
            ) : (
              "Arrastre archivos aquí o haga clic para seleccionar"
            )}
          </p>
          <p className="text-xs text-gray-500 mt-1">Soporta PDF, Word, Excel, imágenes y otros formatos</p>
        </label>

        {isUploading && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-1">Subiendo: {uploadProgress}%</p>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : uploadedFiles.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Documentos subidos ({uploadedFiles.length})</h3>
          <ul className="space-y-2">
            {uploadedFiles.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center overflow-hidden">
                  {getFileIcon(file.type)}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate" title={file.originalName}>
                      {file.originalName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-2">
                  <Button variant="ghost" size="sm" asChild title="Ver documento">
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 text-gray-500" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(file.id, file.name)}
                    title="Eliminar documento"
                  >
                    <Trash className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
