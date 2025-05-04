"use client"

import { useEffect, useState, useRef, useLayoutEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClientClient } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Loader2, ZoomIn, ZoomOut, RefreshCw } from "lucide-react"
import ForceGraph2D from "react-force-graph-2d"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/* ---------- tipos ---------- */
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

/* ---------- componente ---------- */
export function InteractiveGraph() {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const { toast } = useToast()
  const graphRef = useRef<any>(null)

  /* ---------- colores ---------- */
  const nodeColors = {
    expresion: "#1a365d",
    persona: "#2563eb",
    tema: "#10b981",
    comite: "#f59e0b",
    etiqueta: "#8b5cf6",
  }

  /* ---------- medidor de tamaño ---------- */
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  // mide SOLO cuando wrapper cambia de tamaño
  useLayoutEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ---------- carga de datos ---------- */
  useEffect(() => {
    fetchGraphData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const fetchGraphData = async () => {
    try {
      setLoading(true)
      const supabase = createClientClient()

      // 1. Obtener expresiones básicas con las columnas correctas
      const { data: expresiones, error: expresionesError } = await supabase
        .from("expresiones")
        .select("id, nombre, email, propuesta, numero")

      if (expresionesError) throw expresionesError

      // 2. Obtener relaciones entre expresiones y temas
      const { data: expresionTemas, error: temasError } = await supabase.from("expresion_temas").select(`
          expresion_id,
          tema:tema_id (
            id, 
            nombre
          )
        `)

      if (temasError) throw temasError

      // 3. Obtener relaciones entre expresiones y comités
      const { data: expresionComites, error: comitesError } = await supabase.from("expresion_comites").select(`
          expresion_id,
          comite:comite_id (
            id, 
            nombre
          )
        `)

      if (comitesError) throw comitesError

      // 4. Obtener etiquetas (si existe una relación con etiquetas)
      const { data: etiquetas, error: etiquetasError } = await supabase.from("documento_etiquetas").select(`
          documento_id,
          etiqueta:etiqueta_id (
            id,
            nombre
          )
        `)

      if (etiquetasError && etiquetasError.code !== "PGRST116") {
        // PGRST116 significa que la tabla no existe, lo cual es aceptable
        throw etiquetasError
      }

      // Preparar nodos y enlaces
      const nodes: GraphNode[] = []
      const links: GraphLink[] = []
      const nodeMap = new Map<string, boolean>()

      // Función para añadir nodo si no existe
      const addNodeIfNotExists = (id: string, name: string, type: string) => {
        const nodeId = `${type}-${id}`
        if (!nodeMap.has(nodeId)) {
          nodeMap.set(nodeId, true)
          nodes.push({
            id: nodeId,
            name: name,
            type: type,
            val: type === "expresion" ? 3 : 2,
            color: nodeColors[type as keyof typeof nodeColors] || "#999",
          })
        }
        return nodeId
      }

      // Procesar expresiones
      expresiones.forEach((expresion) => {
        // Añadir nodo de expresión - Usar número o ID como identificador
        const expresionNodeId = addNodeIfNotExists(
          expresion.id,
          expresion.numero ? `Expresión #${expresion.numero}` : `Expresión ${expresion.id.substring(0, 8)}`,
          "expresion",
        )

        // Añadir nodo de autor y enlace
        if (expresion.nombre && expresion.email) {
          const autorNodeId = addNodeIfNotExists(expresion.email, expresion.nombre, "persona")
          links.push({ source: autorNodeId, target: expresionNodeId, value: 1 })
        }
      })

      // Procesar relaciones con temas
      expresionTemas?.forEach((relacion) => {
        if (relacion.tema && relacion.expresion_id) {
          const expresionNodeId = `expresion-${relacion.expresion_id}`
          const temaNodeId = addNodeIfNotExists(relacion.tema.id, relacion.tema.nombre, "tema")

          if (nodeMap.has(expresionNodeId)) {
            links.push({ source: temaNodeId, target: expresionNodeId, value: 1 })
          }
        }
      })

      // Procesar relaciones con comités
      expresionComites?.forEach((relacion) => {
        if (relacion.comite && relacion.expresion_id) {
          const expresionNodeId = `expresion-${relacion.expresion_id}`
          const comiteNodeId = addNodeIfNotExists(relacion.comite.id, relacion.comite.nombre, "comite")

          if (nodeMap.has(expresionNodeId)) {
            links.push({ source: comiteNodeId, target: expresionNodeId, value: 1 })
          }
        }
      })

      // Procesar etiquetas (si existen)
      etiquetas?.forEach((relacion) => {
        if (relacion.etiqueta && relacion.documento_id) {
          const expresionNodeId = `expresion-${relacion.documento_id}`
          const etiquetaNodeId = addNodeIfNotExists(relacion.etiqueta.id, relacion.etiqueta.nombre, "etiqueta")

          if (nodeMap.has(expresionNodeId)) {
            links.push({ source: etiquetaNodeId, target: expresionNodeId, value: 1 })
          }
        }
      })

      // Filtrar nodos y enlaces según el filtro seleccionado
      let filteredNodes = nodes
      let filteredLinks = links

      if (filter !== "all") {
        filteredNodes = nodes.filter((node) => node.type === filter || node.type === "expresion")

        const filteredNodeIds = new Set(filteredNodes.map((node) => node.id))

        filteredLinks = links.filter(
          (link) => filteredNodeIds.has(link.source as string) && filteredNodeIds.has(link.target as string),
        )
      }

      setData({
        nodes: filteredNodes,
        links: filteredLinks,
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

  /* ---------- controles de zoom ---------- */
  const handleZoomIn = () => {
    if (graphRef.current) {
      const z = graphRef.current.zoom()
      graphRef.current.zoom(z * 1.2, 400)
    }
  }
  const handleZoomOut = () => {
    if (graphRef.current) {
      const z = graphRef.current.zoom()
      graphRef.current.zoom(z / 1.2, 400)
    }
  }
  const handleRefresh = () => {
    graphRef.current?.d3ReheatSimulation()
  }

  /* ---------- skeleton ---------- */
  if (loading && data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando grafo interactivo…</span>
      </div>
    )
  }

  /* ---------- render ---------- */
  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Vista de Grafo Interactivo</CardTitle>
            <CardDescription>Explora las conexiones entre expresiones, personas, temas y comités</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los nodos</SelectItem>
                <SelectItem value="persona">Personas</SelectItem>
                <SelectItem value="comite">Comités</SelectItem>
              </SelectContent>
            </Select>

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

      <CardContent className="flex-1 min-h-0 p-0">
        <div ref={wrapperRef} className="h-full w-full bg-gray-50 dark:bg-gray-900">
          {data.nodes.length > 0 && size.w && size.h ? (
            <ForceGraph2D
              ref={graphRef}
              width={size.w}
              height={size.h}
              graphData={data}
              nodeLabel={(n: any) => `${n.name} (${n.type})`}
              nodeColor={(n: any) => n.color}
              nodeRelSize={6}
              linkWidth={1}
              linkColor={() => "#999"}
              cooldownTicks={100}
              onNodeClick={(n: any) =>
                toast({
                  title: n.name,
                  description: `Tipo: ${n.type}`,
                })
              }
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              {loading ? "Cargando grafo interactivo…" : "No hay suficientes datos para generar el grafo"}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/* ---------------  IMPORTANTE  --------------- */
/* Asegúrate de que tu raíz pueda crecer:       */
/* (en globals.css)                             */
/* html, body, #__next { height: 100%; }        */
