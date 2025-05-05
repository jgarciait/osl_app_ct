"use client"

import { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDownIcon, SearchIcon, MoreVerticalIcon, EyeIcon, EditIcon } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"

export function PeticionesTable({ peticiones, years, tagMap }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  // Opciones para el filtro de status
  const statusOptions = [
    { label: "Todos", value: "all" },
    { label: "Activas", value: "active" },
    { label: "Archivadas", value: "archived" },
  ]

  const filteredData = useMemo(() => {
    return peticiones.filter((peticion) => {
      // Filtrar por año
      if (selectedYear !== "all" && peticion.year !== Number.parseInt(selectedYear)) {
        return false
      }

      // Filtrar por estado
      if (selectedStatus === "active" && peticion.archivado) {
        return false
      }
      if (selectedStatus === "archived" && !peticion.archivado) {
        return false
      }

      // Filtrar por término de búsqueda (num_peticion, clasificacion, detalles o asesor)
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase()
        return (
          (peticion.num_peticion && peticion.num_peticion.toLowerCase().includes(searchTermLower)) ||
          (peticion.clasificacion && peticion.clasificacion.toLowerCase().includes(searchTermLower)) ||
          (peticion.detalles && peticion.detalles.toLowerCase().includes(searchTermLower)) ||
          (peticion.asesor && peticion.asesor.toLowerCase().includes(searchTermLower))
        )
      }

      return true
    })
  }, [peticiones, selectedYear, selectedStatus, searchTerm])

  // Ordenar los datos por fecha de creación (más recientes primero)
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [filteredData])

  // Función para ver una petición
  const handleViewPeticion = (id) => {
    router.push(`/dashboard/peticiones/${id}/ver`)
  }

  // Función para editar una petición
  const handleEditPeticion = (id) => {
    router.push(`/dashboard/peticiones/${id}/editar`)
  }

  // Renderizar fila de datos
  const renderTableRow = (peticion) => {
    const fechaAsignacion = peticion.fecha_asignacion ? new Date(peticion.fecha_asignacion) : null
    const fechaLimite = peticion.fecha_limite ? new Date(peticion.fecha_limite) : null

    return (
      <TableRow key={peticion.id} className="hover:bg-muted/50">
        <TableCell>{peticion.asesor || "-"}</TableCell>
        <TableCell className="font-medium">{peticion.num_peticion || "-"}</TableCell>
        <TableCell>{peticion.legislador || "-"}</TableCell>
        <TableCell>{peticion.tema || "-"}</TableCell>
        <TableCell>{fechaAsignacion ? format(fechaAsignacion, "dd MMMM yyyy", { locale: es }) : "-"}</TableCell>
        <TableCell>{fechaLimite ? format(fechaLimite, "dd MMMM yyyy", { locale: es }) : "-"}</TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewPeticion(peticion.id)}>
                <EyeIcon className="mr-2 h-4 w-4" />
                <span>Ver</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditPeticion(peticion.id)}>
                <EditIcon className="mr-2 h-4 w-4" />
                <span>Editar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Filtro de año */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[200px]">
                {selectedYear === "all" ? "Todos los años" : `Año ${selectedYear}`}
                <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px]">
              <DropdownMenuItem onClick={() => setSelectedYear("all")}>Todos los años</DropdownMenuItem>
              {years.map((year) => (
                <DropdownMenuItem key={year} onClick={() => setSelectedYear(year.toString())}>
                  Año {year}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filtro de status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[200px]">
                {statusOptions.find((option) => option.value === selectedStatus)?.label}
                <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px]">
              {statusOptions.map((option) => (
                <DropdownMenuItem key={option.value} onClick={() => setSelectedStatus(option.value)}>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Búsqueda */}
        <div className="relative w-full sm:w-[300px]">
          <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar peticiones..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Botón para crear nueva petición */}
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/dashboard/peticiones/nueva">Nueva Petición</Link>
        </Button>
      </div>

      {/* Tabla de peticiones */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asesor</TableHead>
              <TableHead>Trabajo Asignado</TableHead>
              <TableHead>Legislador</TableHead>
              <TableHead>Tema</TableHead>
              <TableHead>Fecha Asignación</TableHead>
              <TableHead>Fecha Límite</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No se encontraron resultados.
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map(renderTableRow)
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {sortedData.length} de {peticiones.length} peticiones
        </p>
      </div>
    </div>
  )
}
