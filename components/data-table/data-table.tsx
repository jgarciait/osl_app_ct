"use client"

import { type ColumnDef, flexRender, type Table as ReactTable } from "@tanstack/react-table"
import type React from "react"
import { useState } from "react"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowUp, ArrowDown, ArrowUpDown, Copy, Mail } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface DataTableProps<TData, TValue> {
  table: ReactTable<TData>
  columns: ColumnDef<TData, TValue>[]
  onRowClick?: (row: TData) => void
  onRowRightClick?: (e: React.MouseEvent, row: TData) => void
  canEdit?: boolean
  tagMap?: Record<string, string> // Nuevo prop para mapear IDs de etiquetas a nombres
}

export function DataTable<TData, TValue>({
  table,
  columns,
  onRowClick,
  onRowRightClick,
  canEdit,
  tagMap = {}, // Valor por defecto vacío
}: DataTableProps<TData, TValue>) {
  const [copiedText, setCopiedText] = useState<string | null>(null)

  // Función para copiar texto al portapapeles
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedText(text)
        toast({
          title: "Copiado al portapapeles",
          description: `"${text}" ha sido copiado al portapapeles.`,
          duration: 2000,
        })
        setTimeout(() => setCopiedText(null), 2000)
      },
      (err) => {
        console.error("No se pudo copiar el texto: ", err)
        toast({
          title: "Error",
          description: "No se pudo copiar el texto al portapapeles.",
          variant: "destructive",
        })
      },
    )
  }

  // Función para abrir el cliente de correo
  const openMailto = (email: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    window.location.href = `mailto:${email}`
  }

  // Función para manejar el clic en una celda
  const handleCellClick = (e: React.MouseEvent, value: any, columnId: string) => {
    e.stopPropagation() // Evitar que el evento se propague a la fila

    // Si es un email o nombre, copiar al portapapeles
    if (
      (columnId.includes("email") || columnId.includes("nombre") || columnId.includes("name")) &&
      typeof value === "string"
    ) {
      copyToClipboard(value)
    }
  }

  // Función para manejar el clic derecho en una celda
  const handleCellRightClick = (e: React.MouseEvent, value: any, columnId: string) => {
    // Si es un email, abrir mailto:
    if (columnId.includes("email") && typeof value === "string") {
      openMailto(value, e)
    } else if (onRowRightClick) {
      // Si no es un email pero hay un manejador de clic derecho para la fila, llamarlo
      onRowRightClick(e, table.getRow(e.currentTarget.closest("tr")?.id || "").original)
    }
  }

  return (
    <div className="rounded-md border mt-2 w-full">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => {
            // Skip rendering the checkbox column
            if (headerGroup.headers.find((header) => header.id.includes("select"))) {
              const selectHeader = headerGroup.headers.find((header) => header.id.includes("select"))
              if (selectHeader) {
                selectHeader.column.columnDef.header = () => null
              }
            }
            return (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  // Skip rendering the checkbox column
                  if (header.id.includes("select")) return null

                  let headerContent =
                    header.id === "actions"
                      ? "Opciones"
                      : flexRender(header.column.columnDef.header, header.getContext())

                  // Change the header name of the last column to "Opciones"
                  if (header === headerGroup.headers[headerGroup.headers.length - 1]) {
                    headerContent = "Opciones"
                  }

                  if (header.id === "document_tags") {
                    headerContent = "Etiquetas"
                  }

                  return (
                    <TableCell
                      key={header.id}
                      className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
                      onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <div className="flex items-center">
                        {headerContent}
                        {header.column.getCanSort() && (
                          <span className="ml-2">
                            {header.column.getIsSorted() === "asc" ? (
                              <ArrowUp className="h-4 w-4" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ArrowDown className="h-4 w-4" />
                            ) : (
                              <ArrowUpDown className="h-4 w-4 opacity-50" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => {
                  // Skip rendering the checkbox column cell
                  if (cell.column.id.includes("select")) return null

                  const value = cell.getValue()
                  const isEmailOrName =
                    cell.column.id.includes("email") ||
                    cell.column.id.includes("nombre") ||
                    cell.column.id.includes("name")

                  return (
                    <TableCell
                      key={cell.id}
                      onClick={(e) => handleCellClick(e, value, cell.column.id)}
                      onContextMenu={(e) => handleCellRightClick(e, value, cell.column.id)}
                      className={isEmailOrName ? "cursor-pointer" : ""}
                    >
                      {cell.column.id.includes("document_tags") || cell.column.id.includes("etiqueta") ? (
                        (() => {
                          if (Array.isArray(value)) {
                            return value
                              .map((tagId) => {
                                // Intentar obtener el nombre de la etiqueta del mapa
                                const tagName = tagMap[tagId]
                                // Si existe el nombre, mostrarlo, de lo contrario mostrar el ID
                                return tagName || tagId
                              })
                              .join(", ")
                          } else if (typeof value === "string") {
                            // Si es un string único, intentar obtener el nombre
                            return tagMap[value as string] || value
                          } else {
                            // Para cualquier otro caso, renderizar normalmente
                            return flexRender(cell.column.columnDef.cell, cell.getContext())
                          }
                        })()
                      ) : isEmailOrName ? (
                        <div className="flex items-center">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          {cell.column.id.includes("email") ? (
                            <Mail className="ml-2 h-4 w-4 opacity-50" />
                          ) : (
                            <Copy className="ml-2 h-4 w-4 opacity-50" />
                          )}
                        </div>
                      ) : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No se encontraron resultados.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
