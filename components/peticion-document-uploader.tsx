"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Loader2, Upload, File, Trash, ExternalLink, FileText, AlertCircle } from "lucide-react"
import { normalizeFilename } from "@/lib/normalize-filename"
import { formatFileSize } from "@/lib/format-file-size"
import { Progress } from "@/components/ui/progress"
import { useNotify } from "@/lib/notifications"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  const notify = useNotify()
  const supabase = createClientClient()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<DocumentFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState("")
  const [loadAttempts, setLoadAttempts] = useState(0)

  // Cargar documentos existentes al montar el componente
  useEffect(() => {
    let isMounted = true
    let timeoutId: NodeJS.Timeout

    const loadExistingDocuments = async () => {
      if (!peticionId || !isMounted) return

      try {
        setIsLoading(true)
        setError("")
        console.log(`Intentando cargar documentos para petición ID: ${peticionId} (intento ${loadAttempts + 1})`)

        // Verificar que el cliente de Supabase esté disponible
        if (!supabase) {
          throw new Error("Cliente Supabase no inicializado")
        }

        // Obtener documentos de la base de datos
        const { data, error: fetchError } = await supabase
          .from("documentos_peticiones")
          .select("*")
          .eq("peticion_id", peticionId)

        if (fetchError) throw fetchError

        console.log(`Documentos encontrados: ${data?.length || 0}`)

        if (data && data.length > 0 && isMounted) {
          // Para cada documento, obtener la URL firmada
          const filesPromises = data.map(async (doc) => {
            try {
              const { data: urlData, error: urlError } = await supabase.storage
                .from("documentos")
                .createSignedUrl(`peticiones/${doc.ruta}`, 60 * 60) // URL válida por 1 hora

              if (urlError) {
                console.warn(`Error al obtener URL para documento ${doc.id}:`, urlError)
                return {
                  id: doc.id,
                  name: doc.ruta,
                  originalName: doc.nombre,
                  size: doc.tamano,
                  type: doc.tipo,
                  url: "", // URL vacía si hay error
                  uploadedAt: doc.created_at,
                }
              }

              return {
                id: doc.id,
                name: doc.ruta,
                originalName: doc.nombre,
                size: doc.tamano,
                type: doc.tipo,
                url: urlData?.signedUrl || "",
                uploadedAt: doc.created_at,
              }
            } catch (err) {
              console.error(`Error procesando documento ${doc.id}:`, err)
              return null
            }
          })

          // Usar Promise.allSettled para manejar errores individuales
          const results = await Promise.allSettled(filesPromises)

          if (isMounted) {
            const filesWithUrls = results
              .filter(
                (result): result is PromiseFulfilledResult<DocumentFile> =>
                  result.status === "fulfilled" && result.value !== null,
              )
              .map((result) => result.value)

            setUploadedFiles(filesWithUrls)
          }
        } else if (isMounted) {
          setUploadedFiles([])
        }
      } catch (error) {
        console.error("Error loading documents:", error)
        if (isMounted) {
          setError(`No se pudieron cargar los documentos: ${error.message || "Error desconocido"}`)

          // Si es el primer intento, programar un reintento automático
          if (loadAttempts === 0) {
            timeoutId = setTimeout(() => {
              if (isMounted) {
                setLoadAttempts((prev) => prev + 1)
              }
            }, 3000)
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadExistingDocuments()

    // Limpieza al desmontar
    return () => {
      isMounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [peticionId, supabase, loadAttempts])

  // Función para subir archivo con simulación de progreso
  const uploadFileWithProgress = async (file: File, normalizedFilename: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      // Simulamos el progreso de carga
      let progress = 0
      let progressInterval: NodeJS.Timeout

      // Función para simular el progreso
      const simulateProgress = () => {
        // Incrementamos el progreso de forma no lineal para simular una carga real
        if (progress < 90) {
          progress += Math.random() * 3 + 1 // Incremento aleatorio entre 1 y 4
          if (progress > 90) progress = 90 // No pasamos del 90% hasta que termine
          setUploadProgress(Math.floor(progress))
        }
      }

      // Iniciamos la simulación de progreso
      progressInterval = setInterval(simulateProgress, 200)

      // Realizamos la carga real con Supabase
      supabase.storage
        .from("documentos")
        .upload(`peticiones/${normalizedFilename}`, file, {
          cacheControl: "3600",
          upsert: true, // Cambiado a true para sobrescribir si existe
        })
        .then(({ data, error }) => {
          clearInterval(progressInterval)

          if (error) {
            reject(error)
            return
          }

          // Carga completada, establecemos progreso al 100%
          setUploadProgress(100)
          setTimeout(() => resolve(true), 500) // Pequeña pausa para mostrar el 100%
        })
        .catch((err) => {
          clearInterval(progressInterval)
          reject(err)
        })
    })
  }

  const processFiles = async (files: FileList | File[]) => {
    if (!files.length || !peticionId) return

    setIsUploading(true)
    setUploadProgress(0)
    setError("")

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

      notify.success(`${files.length} documento(s) subido(s) correctamente.`, "Documentos subidos")
    } catch (error) {
      console.error("Error uploading files:", error)
      setError(`Error al subir documentos: ${error.message || "Error desconocido"}`)
      notify.error("No se pudieron subir los documentos. Por favor, intente nuevamente.", "Error")
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

      notify.success("El documento ha sido eliminado correctamente.", "Documento eliminado")
    } catch (error) {
      console.error("Error removing file:", error)
      notify.error("No se pudo eliminar el documento. Por favor, intente nuevamente.", "Error")
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
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => setLoadAttempts((prev) => prev + 1)} className="ml-2">
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
        <div className="flex flex-col items-center justify-center p-8">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Cargando documentos...</p>
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
                  {file.url ? (
                    <Button variant="ghost" size="sm" asChild title="Ver documento">
                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 text-gray-500" />
                      </a>
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" disabled title="URL no disponible">
                      <ExternalLink className="h-4 w-4 text-gray-300" />
                    </Button>
                  )}
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
      ) : !error ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-sm text-muted-foreground">No hay documentos adjuntos a esta petición.</p>
        </div>
      ) : null}
    </div>
  )
}
