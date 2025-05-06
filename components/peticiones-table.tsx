"use client"

import React, { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ChevronDownIcon,
  SearchIcon,
  MoreVerticalIcon,
  EyeIcon,
  EditIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function PeticionesTable({ peticiones, years, tagMap }) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedAsesor, setSelectedAsesor] = useState("all")
  const [sortColumn, setSortColumn] = useState("created_at")
  const [sortDirection, setSortDirection] = useState("desc")
  const [groupByAsesor, setGroupByAsesor] = useState(false)

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Opciones para el filtro de status
  const statusOptions = [
    { label: "Todos", value: "all" },
    { label: "Activas", value: "active" },
    { label: "Archivadas", value: "archived" },
  ]

  // Obtener lista única de asesores para el filtro
  const asesoresOptions = useMemo(() => {
    const asesores = new Set()
    peticiones.forEach((peticion) => {
      if (peticion.asesorNombre && peticion.asesorNombre !== "-") {
        asesores.add(peticion.asesorNombre)
      }
    })
    return [
      { label: "Todos los asesores", value: "all" },
      ...Array.from(asesores).map((asesor) => ({
        label: asesor,
        value: asesor,
      })),
    ]
  }, [peticiones])

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

      // Filtrar por asesor
      if (selectedAsesor !== "all" && peticion.asesorNombre !== selectedAsesor) {
        return false
      }

      // Filtrar por término de búsqueda (num_peticion, clasificacion, detalles o asesor)
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase()
        return (
          (peticion.num_peticion && peticion.num_peticion.toLowerCase().includes(searchTermLower)) ||
          (peticion.clasificacion && peticion.clasificacion.toLowerCase().includes(searchTermLower)) ||
          (peticion.detalles && peticion.detalles.toLowerCase().includes(searchTermLower)) ||
          (peticion.asesorNombre && peticion.asesorNombre.toLowerCase().includes(searchTermLower))
        )
      }

      return true
    })
  }, [peticiones, selectedYear, selectedStatus, selectedAsesor, searchTerm])

  // Ordenar los datos según la columna seleccionada
  const sortedData = useMemo(() => {
    const sorted = [...filteredData]

    // Ordenar por la columna seleccionada
    sorted.sort((a, b) => {
      if (sortColumn === "created_at") {
        return sortDirection === "desc"
          ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }

      if (sortColumn === "num_peticion") {
        // Ordenar por número de petición
        if (!a.num_peticion) return sortDirection === "desc" ? -1 : 1
        if (!b.num_peticion) return sortDirection === "desc" ? 1 : -1
        return sortDirection === "desc"
          ? b.num_peticion.localeCompare(a.num_peticion)
          : a.num_peticion.localeCompare(b.num_peticion)
      }

      // Ordenamiento por defecto (fecha de creación)
      return sortDirection === "desc"
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

    return sorted
  }, [filteredData, sortColumn, sortDirection])

  // Agrupar por asesor si está activada la opción
  const groupedData = useMemo(() => {
    if (!groupByAsesor) return { ungrouped: sortedData }

    const groups = {}
    sortedData.forEach((peticion) => {
      const asesorKey = peticion.asesorNombre || "Sin asesor"
      if (!groups[asesorKey]) {
        groups[asesorKey] = []
      }
      groups[asesorKey].push(peticion)
    })

    return groups
  }, [sortedData, groupByAsesor])

  // Paginación
  const totalPages = useMemo(() => {
    if (groupByAsesor) {
      // Si está agrupado, no aplicamos paginación
      return 1
    }
    return Math.ceil(sortedData.length / pageSize)
  }, [sortedData.length, pageSize, groupByAsesor])

  // Datos paginados
  const paginatedData = useMemo(() => {
    if (groupByAsesor) {
      // Si está agrupado, no aplicamos paginación
      return groupedData
    }

    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return { ungrouped: sortedData.slice(startIndex, endIndex) }
  }, [sortedData, currentPage, pageSize, groupByAsesor, groupedData])

  // Función para ver una petición
  const handleViewPeticion = (id) => {
    router.push(`/dashboard/peticiones/${id}/ver`)
  }

  // Función para editar una petición
  const handleEditPeticion = (id) => {
    router.push(`/dashboard/peticiones/${id}/editar`)
  }

  // Función para cambiar el ordenamiento
  const handleSort = (column) => {
    if (sortColumn === column) {
      // Si ya estamos ordenando por esta columna, cambiar la dirección
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      // Si es una nueva columna, establecerla como columna de ordenamiento
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  // Cambiar de página
  const goToPage = (page) => {
    setCurrentPage(page)
  }

  // Renderizar fila de datos
  const renderTableRow = (peticion) => {
    const fechaAsignacion = peticion.fecha_asignacion ? new Date(peticion.fecha_asignacion) : null
    const fechaLimite = peticion.fecha_limite ? new Date(peticion.fecha_limite) : null

    return (
      <TableRow
        key={peticion.id}
        className="hover:bg-muted/50"
        style={{ backgroundColor: peticion.asesorColor || "transparent" }}
      >
        <TableCell>{peticion.asesorNombre || "-"}</TableCell>
        <TableCell className="font-medium">{peticion.num_peticion || "-"}</TableCell>
        <TableCell>{peticion.clasificacionNombre || "-"}</TableCell>
        <TableCell>{peticion.legislador || "-"}</TableCell>
        <TableCell>{peticion.temaNombre || "-"}</TableCell>
        <TableCell>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              peticion.status === "Completado"
                ? "bg-green-100 text-green-800"
                : peticion.status === "En progreso"
                  ? "bg-blue-100 text-blue-800"
                  : peticion.status === "Pendiente"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
            }`}
          >
            {peticion.status || "No asignado"}
          </span>
        </TableCell>
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
              <Button variant="outline" className="w-fit max-w-[200px] truncate">
                <span className="truncate">{selectedYear === "all" ? "Todos los años" : `Año ${selectedYear}`}</span>
                <ChevronDownIcon className="ml-2 h-4 w-4 flex-shrink-0" />
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
              <Button variant="outline" className="w-fit max-w-[200px] truncate">
                <span className="truncate">
                  {statusOptions.find((option) => option.value === selectedStatus)?.label}
                </span>
                <ChevronDownIcon className="ml-2 h-4 w-4 flex-shrink-0" />
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

          {/* Filtro de asesor */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-fit max-w-[300px] truncate">
                <span className="truncate">{selectedAsesor === "all" ? "Todos los asesores" : selectedAsesor}</span>
                <ChevronDownIcon className="ml-2 h-4 w-4 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[300px] max-h-[350px] overflow-y-auto">
              {asesoresOptions.map((option) => (
                <DropdownMenuItem key={option.value} onClick={() => setSelectedAsesor(option.value)}>
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

      {/* Botones para crear nueva petición y agrupar */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant={groupByAsesor ? "default" : "outline"} onClick={() => setGroupByAsesor(!groupByAsesor)}>
            {groupByAsesor ? "Desagrupar" : "Agrupar por Asesor"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/asesores/colores">Configurar Colores de Asesores</Link>
          </Button>
        </div>
        <Button asChild>
          <Link href="/dashboard/peticiones/nueva">Nueva Petición</Link>
        </Button>
      </div>

      {/* Tabla de peticiones */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-black">Asesor</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 text-black"
                onClick={() => handleSort("num_peticion")}
              >
                Trabajo Asignado
                {sortColumn === "num_peticion" && <span className="ml-2">{sortDirection === "asc" ? "↑" : "↓"}</span>}
              </TableHead>
              <TableHead className="text-black">Clasificación</TableHead>
              <TableHead className="text-black">Legislador</TableHead>
              <TableHead className="text-black">Tema</TableHead>
              <TableHead className="text-black">Estatus</TableHead>
              <TableHead className="text-black">Fecha Asignación</TableHead>
              <TableHead className="text-black">Fecha Límite</TableHead>
              <TableHead className="text-right text-black">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupByAsesor ? (
              // Mostrar datos agrupados por asesor
              Object.entries(groupedData).map(([asesor, peticiones]) => (
                <React.Fragment key={asesor}>
                  {/* Encabezado del grupo */}
                  <TableRow className="bg-gray-800 font-medium text-white hover:bg-[#1d3658] transition-colors duration-200">
                    <TableCell colSpan={9} className="py-2 text-white">
                      {asesor} ({peticiones.length} peticiones)
                    </TableCell>
                  </TableRow>
                  {/* Filas de peticiones */}
                  {peticiones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-12 text-center text-muted-foreground">
                        No hay peticiones para este asesor.
                      </TableCell>
                    </TableRow>
                  ) : (
                    peticiones.map(renderTableRow)
                  )}
                </React.Fragment>
              ))
            ) : // Mostrar datos sin agrupar
            sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No se encontraron resultados.
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.ungrouped.map(renderTableRow)
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {!groupByAsesor && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground">Mostrar</p>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setCurrentPage(1) // Resetear a la primera página al cambiar el tamaño
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[5, 10, 20, 30, 40, 50].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">entradas por página</p>
          </div>

          <div className="text-sm text-muted-foreground">
            Mostrando {paginatedData.ungrouped.length} de {sortedData.length} registros
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Página anterior</span>
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageToShow
                if (totalPages <= 5) {
                  pageToShow = i + 1
                } else {
                  let startPage = Math.max(1, currentPage - 2)
                  const endPage = Math.min(totalPages, startPage + 4)
                  if (endPage === totalPages) {
                    startPage = Math.max(1, endPage - 4)
                  }
                  pageToShow = startPage + i
                }

                if (pageToShow <= totalPages) {
                  return (
                    <Button
                      key={pageToShow}
                      variant={pageToShow === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageToShow)}
                      className={pageToShow === currentPage ? "bg-[#1a365d] hover:bg-[#15294d]" : ""}
                    >
                      {pageToShow}
                    </Button>
                  )
                }
                return null
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Página siguiente</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
