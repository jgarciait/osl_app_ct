"use client"

import { useEffect } from "react"
import type { Table } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DataTablePaginationProps<TData> {
  table: Table<TData>
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  // Establecer el tamaño de página predeterminado a 5 al montar el componente
  useEffect(() => {
    table.setPageSize(5)
  }, [table])

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <p className="text-sm text-muted-foreground">Mostrar</p>
        <Select
          value={`${table.getState().pagination.pageSize}`}
          onValueChange={(value) => {
            table.setPageSize(Number(value))
          }}
        >
          <SelectTrigger className="h-8 w-[70px]">
            <SelectValue placeholder={table.getState().pagination.pageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            {[5, 10, 20, 30, 40, 50].map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">entradas por página</p>
      </div>

      <div className="text-sm text-muted-foreground">
        Mostrando {table.getFilteredRowModel().rows.length} de {table.getCoreRowModel().rows.length} registros
      </div>

      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Página anterior</span>
        </Button>
        <div className="flex items-center space-x-1">
          {Array.from({ length: Math.min(5, table.getPageCount()) }).map((_, i) => {
            let pageToShow
            if (table.getPageCount() <= 5) {
              pageToShow = i + 1
            } else {
              let startPage = Math.max(1, table.getState().pagination.pageIndex - 1)
              const endPage = Math.min(table.getPageCount(), startPage + 4)
              if (endPage === table.getPageCount()) {
                startPage = Math.max(1, endPage - 4)
              }
              pageToShow = startPage + i
            }

            if (pageToShow <= table.getPageCount()) {
              return (
                <Button
                  key={pageToShow}
                  variant={pageToShow === table.getState().pagination.pageIndex + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => table.setPageIndex(pageToShow - 1)}
                  className={
                    pageToShow === table.getState().pagination.pageIndex + 1 ? "bg-[#1a365d] hover:bg-[#15294d]" : ""
                  }
                >
                  {pageToShow}
                </Button>
              )
            }
            return null
          })}
        </div>
        <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Página siguiente</span>
        </Button>
      </div>
    </div>
  )
}
