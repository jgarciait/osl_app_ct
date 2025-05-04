"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, Info } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function DocumentosSyncTool() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const supabase = createClientClient()
  const { toast } = useToast()

  // Ejecutar análisis inicial al cargar el componente
  useEffect(() => {
    sincronizarDocumentos()
  }, [])

  const sincronizarDocumentos = async () => {
    try {
      setIsLoading(true)
      setIsAnalyzing(true)
      setResults(null)

      let dbDocs = []
      let storageFiles = []
      let sqlStorageCount = 0

      // 1. Obtener todos los documentos de la base de datos
      const { data: dbDocsData, error: dbError } = await supabase.from("documentos").select("id, nombre, ruta")

      if (dbError) throw dbError
      dbDocs = dbDocsData || []

      // 2. Obtener conteo directo de SQL para comparar
      const { data: sqlCountData, error: sqlCountError } = await supabase.rpc("get_storage_object_count", {
        bucket_name: "documentos",
      })

      if (!sqlCountError && sqlCountData && sqlCountData.length > 0) {
        sqlStorageCount = sqlCountData[0].total_archivos || 0
      }

      // 3. Usar la función RPC para obtener los archivos
      // Nota: Corregido para usar RPC en lugar de consulta directa a storage.objects
      const { data: sqlStorageData, error: sqlStorageError } = await supabase.rpc("list_storage_objects", {
        bucket_name: "documentos",
      })

      if (sqlStorageError) throw sqlStorageError
      storageFiles = sqlStorageData || []

      // 4. Identificar archivos huérfanos (en storage pero no en DB)
      const dbPaths = dbDocs.map((doc) => doc.ruta)
      const storagePaths = storageFiles.map((file) => file.name)

      const orphanedFiles = storagePaths.filter((path) => !dbPaths.includes(path))

      // 5. Identificar registros huérfanos (en DB pero no en storage)
      const orphanedRecords = dbDocs.filter((doc) => !storagePaths.includes(doc.ruta))

      // Guardar resultados
      setResults({
        totalDbRecords: dbDocs.length,
        totalStorageFiles: storageFiles.length,
        sqlStorageCount,
        orphanedFiles,
        orphanedRecords,
      })

      toast({
        title: "Análisis completado",
        description: `Se encontraron ${orphanedFiles.length} archivos huérfanos y ${orphanedRecords.length} registros huérfanos.`,
      })
    } catch (error) {
      console.error("Error al sincronizar documentos:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: `No se pudo completar la sincronización: ${error.message}`,
      })
    } finally {
      setIsLoading(false)
      setIsAnalyzing(false)
    }
  }

  const repararDiscrepancias = async () => {
    if (!results) return

    try {
      setIsLoading(true)

      // 1. Crear registros para archivos huérfanos
      const nuevosRegistros = []
      for (const filePath of results.orphanedFiles) {
        // Obtener metadatos del archivo
        const { data: fileData, error: fileError } = await supabase.storage.from("documentos").getPublicUrl(filePath)

        if (fileError) {
          console.error(`Error al obtener metadatos para ${filePath}:`, fileError)
          continue
        }

        // Crear un nuevo registro en la base de datos
        const { data, error } = await supabase
          .from("documentos")
          .insert({
            nombre: filePath.split("/").pop(),
            ruta: filePath,
            tipo: "application/octet-stream", // Tipo genérico
            tamano: 0, // No podemos obtener el tamaño fácilmente
            created_at: new Date().toISOString(),
          })
          .select()

        if (error) {
          console.error(`Error al crear registro para ${filePath}:`, error)
        } else {
          nuevosRegistros.push(data[0])
        }
      }

      // 2. Eliminar registros huérfanos
      const eliminados = []
      for (const record of results.orphanedRecords) {
        const { error } = await supabase.from("documentos").delete().eq("id", record.id)

        if (error) {
          console.error(`Error al eliminar registro ${record.id}:`, error)
        } else {
          eliminados.push(record.id)
        }
      }

      toast({
        title: "Reparación completada",
        description: `Se crearon ${nuevosRegistros.length} registros y se eliminaron ${eliminados.length} registros huérfanos.`,
      })

      // Actualizar resultados
      sincronizarDocumentos()
    } catch (error) {
      console.error("Error al reparar discrepancias:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron reparar las discrepancias. Por favor, intente nuevamente.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Herramienta de Sincronización</CardTitle>
        <CardDescription>
          Detecta y repara discrepancias entre los archivos almacenados y los registros en la base de datos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAnalyzing ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
            <p>Analizando documentos y almacenamiento...</p>
          </div>
        ) : results ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="font-medium">Registros en base de datos</p>
                <p className="text-2xl font-bold">{results.totalDbRecords}</p>
              </div>
              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="font-medium">Archivos en almacenamiento</p>
                <p className="text-2xl font-bold">{results.totalStorageFiles}</p>
                <p className="text-xs text-gray-600 mt-1">Método: Consulta SQL vía RPC</p>
              </div>
            </div>

            {results.orphanedFiles.length > 0 && (
              <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <h3 className="font-medium">Archivos sin registro ({results.orphanedFiles.length})</h3>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Estos archivos existen en el almacenamiento pero no tienen un registro correspondiente en la base de
                  datos:
                </p>
                <div className="max-h-32 overflow-y-auto text-xs bg-white p-2 rounded border">
                  {results.orphanedFiles.map((file, index) => (
                    <div key={index} className="mb-1">
                      {file}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.orphanedRecords.length > 0 && (
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h3 className="font-medium">Registros sin archivo ({results.orphanedRecords.length})</h3>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Estos registros existen en la base de datos pero no tienen un archivo correspondiente en el
                  almacenamiento:
                </p>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="orphaned-records">
                    <AccordionTrigger className="text-sm">Ver lista completa</AccordionTrigger>
                    <AccordionContent>
                      <div className="max-h-64 overflow-y-auto text-xs bg-white p-2 rounded border">
                        {results.orphanedRecords.map((record, index) => (
                          <div key={index} className="mb-1 pb-1 border-b">
                            ID: {record.id}, Ruta: {record.ruta}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}

            {results.orphanedFiles.length === 0 && results.orphanedRecords.length === 0 && (
              <div className="p-4 border border-green-200 bg-green-50 rounded-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <p>¡Todo está sincronizado! No se encontraron discrepancias.</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="h-5 w-5 text-blue-500" />
                <h3 className="font-medium">Información de diagnóstico</h3>
              </div>
              <ul className="text-sm space-y-1">
                <li>• Método de consulta: Función RPC personalizada</li>
                <li>• Conteo total de archivos: {results.totalStorageFiles} archivos</li>
                <li>• Conteo base de datos: {results.totalDbRecords} registros</li>
                <li className="text-xs text-gray-500 mt-2">
                  Estructura de archivos: documentos/expresiones/[id-carpeta]/[nombre-archivo].pdf
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center py-8">
            <p>Haga clic en "Analizar Discrepancias" para comenzar</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={sincronizarDocumentos} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Analizar Discrepancias
            </>
          )}
        </Button>

        {results && (results.orphanedFiles.length > 0 || results.orphanedRecords.length > 0) && (
          <Button onClick={repararDiscrepancias} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reparando...
              </>
            ) : (
              "Reparar Discrepancias"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
