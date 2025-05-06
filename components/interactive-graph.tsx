"use client"

import { useEffect, useState, useRef, useLayoutEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, RefreshCw } from "lucide-react"
import ForceGraph2D from "react-force-graph-2d"

// Definir tipos para los nodos y enlaces
interface GraphNode {
  id: string
  name: string
  type: string
  val: number
  color: string
}

interface GraphLink {
  source: string
  target: string
  value: number
}

interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

interface InteractiveGraphProps {
  relationshipType?: "asesores" | "legisladores" | "temas" | "clasificaciones"
}

export function InteractiveGraph({ relationshipType = "asesores" }: InteractiveGraphProps) {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const graphRef = useRef<any>(null)

  // Colores para diferentes tipos de nodos
  const nodeColors = {
    peticion: "#1a365d",
    asesor: "#2563eb",
    legislador: "#10b981",
    tema: "#f59e0b",
    clasificacion: "#8b5cf6",
  }

  useEffect(() => {
    fetchGraphData()
  }, [relationshipType])

  const fetchGraphData = async () => {
    try {
      setLoading(true)
      const supabase = createClientClient()
      const nodes: GraphNode[] = []
      const links: GraphLink[] = []
      const nodeMap = new Map<string, boolean>()

      // Función para añadir nodo si no existe
      const addNodeIfNotExists = (id: string, name: string, type: string) => {
        if (!id) return null // Evitar nodos con ID nulo
        const nodeId = `${type}-${id}`
        if (!nodeMap.has(nodeId)) {
          nodeMap.set(nodeId, true)
          nodes.push({
            id: nodeId,
            name: name || `${type} ${id.substring(0, 8)}`,
            type: type,
            val: type === "peticion" ? 3 : 5,
            color: nodeColors[type as keyof typeof nodeColors] || "#999",
          })
        }
        return nodeId
      }

      // 1. Obtener todas las peticiones
      const { data: peticiones, error: peticionesError } = await supabase.from("peticiones").select("id, num_peticion")

      if (peticionesError) throw peticionesError

      // Añadir nodos de peticiones
      peticiones.forEach((peticion) => {
        addNodeIfNotExists(
          peticion.id,
          peticion.num_peticion ? `Petición #${peticion.num_peticion}` : `Petición ${peticion.id.substring(0, 8)}`,
          "peticion",
        )
      })

      // 2. Obtener relaciones según el tipo seleccionado
      if (relationshipType === "asesores") {
        // Obtener relaciones peticiones-asesores
        const { data: peticionesAsesores, error: asesoresError } = await supabase.from("peticiones_asesores").select(`
            peticiones_id,
            asesores_id,
            asesores:asesores_id (id, name)
          `)

        if (asesoresError) throw asesoresError

        // Procesar relaciones peticiones-asesores
        peticionesAsesores?.forEach((relacion) => {
          if (relacion.asesores && relacion.peticiones_id) {
            const peticionNodeId = `peticion-${relacion.peticiones_id}`
            const asesorNodeId = addNodeIfNotExists(
              relacion.asesores_id,
              relacion.asesores.name || `Asesor ${relacion.asesores_id.substring(0, 8)}`,
              "asesor",
            )

            if (asesorNodeId && nodeMap.has(peticionNodeId)) {
              links.push({ source: asesorNodeId, target: peticionNodeId, value: 1 })
            }
          }
        })
      } else if (relationshipType === "legisladores") {
        // Obtener relaciones peticiones-legisladores
        const { data: peticionesLegisladores, error: legisladoresError } = await supabase
          .from("peticiones_legisladores")
          .select(`
            peticiones_id,
            legisladoresPeticion_id,
            legisladores:legisladoresPeticion_id (id, nombre)
          `)

        if (legisladoresError) throw legisladoresError

        // Procesar relaciones peticiones-legisladores
        peticionesLegisladores?.forEach((relacion) => {
          if (relacion.legisladores && relacion.peticiones_id) {
            const peticionNodeId = `peticion-${relacion.peticiones_id}`
            const legisladorNodeId = addNodeIfNotExists(
              relacion.legisladoresPeticion_id,
              relacion.legisladores.nombre || `Legislador ${relacion.legisladoresPeticion_id.substring(0, 8)}`,
              "legislador",
            )

            if (legisladorNodeId && nodeMap.has(peticionNodeId)) {
              links.push({ source: legisladorNodeId, target: peticionNodeId, value: 1 })
            }
          }
        })
      } else if (relationshipType === "temas") {
        // Obtener relaciones peticiones-temas
        // Corregido para usar la estructura correcta de la base de datos
        const { data: peticionesTemas, error: temasError } = await supabase.from("peticiones_temas").select(`
            peticiones_id,
            temasPeticiones_id,
            temas:temasPeticiones_id (id, nombre)
          `)

        if (temasError) throw temasError

        // Procesar relaciones peticiones-temas
        peticionesTemas?.forEach((relacion) => {
          if (relacion.temas && relacion.peticiones_id) {
            const peticionNodeId = `peticion-${relacion.peticiones_id}`
            const temaNodeId = addNodeIfNotExists(
              relacion.temasPeticiones_id,
              relacion.temas.nombre || `Tema ${relacion.temasPeticiones_id.substring(0, 8)}`,
              "tema",
            )

            if (temaNodeId && nodeMap.has(peticionNodeId)) {
              links.push({ source: temaNodeId, target: peticionNodeId, value: 1 })
            }
          }
        })
      } else if (relationshipType === "clasificaciones") {
        // Obtener relaciones peticiones-clasificaciones
        const { data: peticionesClasificaciones, error: clasificacionesError } = await supabase
          .from("peticiones_clasificacion")
          .select(`
            peticiones_id,
            clasificaciones_id,
            clasificaciones:clasificaciones_id (id, nombre)
          `)

        if (clasificacionesError) throw clasificacionesError

        // Procesar relaciones peticiones-clasificaciones
        peticionesClasificaciones?.forEach((relacion) => {
          if (relacion.clasificaciones && relacion.peticiones_id) {
            const peticionNodeId = `peticion-${relacion.peticiones_id}`
            const clasificacionNodeId = addNodeIfNotExists(
              relacion.clasificaciones_id,
              relacion.clasificaciones.nombre || `Clasificación ${relacion.clasificaciones_id.substring(0, 8)}`,
              "clasificacion",
            )

            if (clasificacionNodeId && nodeMap.has(peticionNodeId)) {
              links.push({ source: clasificacionNodeId, target: peticionNodeId, value: 1 })
            }
          }
        })
      }

      // Filtrar enlaces para asegurarse de que ambos nodos existen
      const validLinks = links.filter(
        (link) =>
          typeof link.source === "string" &&
          typeof link.target === "string" &&
          nodeMap.has(link.source) &&
          nodeMap.has(link.target),
      )

      setData({
        nodes: nodes,
        links: validLinks,
      })
    } catch (error) {
      console.error("Error al cargar datos del grafo:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los datos para el grafo interactivo: " + (error as Error).message,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleZoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom()
      graphRef.current.zoom(currentZoom * 1.2, 400)
    }
  }

  const handleZoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom()
      graphRef.current.zoom(currentZoom / 1.2, 400)
    }
  }

  const handleRefresh = () => {
    if (graphRef.current) {
      graphRef.current.d3ReheatSimulation()
    }
  }

  const wrapperRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const measure = () => {
      if (wrapperRef.current) {
        setSize({
          w: wrapperRef.current.clientWidth,
          h: wrapperRef.current.clientHeight,
        })
      }
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  // Determinar el título según el tipo de relación
  const getTitle = () => {
    switch (relationshipType) {
      case "asesores":
        return "Peticiones por Asesor"
      case "legisladores":
        return "Peticiones por Legislador"
      case "temas":
        return "Peticiones por Tema"
      case "clasificaciones":
        return "Peticiones por Clasificación"
      default:
        return "Vista de Grafo Interactivo"
    }
  }

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{getTitle()}</CardTitle>
            <CardDescription>
              Explora las conexiones entre peticiones y{" "}
              {relationshipType === "asesores"
                ? "asesores"
                : relationshipType === "legisladores"
                  ? "legisladores"
                  : relationshipType === "temas"
                    ? "temas"
                    : "clasificaciones"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col min-h-0">
        <div
          ref={wrapperRef}
          className="flex-1 w-full h-full bg-gray-50 dark:bg-gray-900"
          style={{ minHeight: "500px" }}
        >
          {data.nodes.length > 0 && size.w > 0 && size.h > 0 ? (
            <ForceGraph2D
              ref={graphRef}
              width={size.w}
              height={size.h}
              graphData={data}
              nodeLabel={(node: any) => `${node.name} (${node.type})`}
              nodeColor={(node: any) => node.color}
              nodeRelSize={6}
              linkWidth={1}
              linkColor={() => "#999"}
              cooldownTicks={100}
              onNodeClick={(node: any) => {
                toast({
                  title: node.name,
                  description: `Tipo: ${node.type}`,
                })
              }}
            />
          ) : (
            <div className="flex justify-center items-center h-full">
              {loading ? "Cargando grafo interactivo..." : "No hay suficientes datos para generar el grafo"}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
