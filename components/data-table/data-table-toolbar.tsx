"use client"

import { Cross2Icon } from "@radix-ui/react-icons"
import type { Table } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options"
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  statusOptions?: {
    label: string
    value: string
  }[]
  yearOptions?: {
    label: string
    value: string
  }[]
  monthOptions?: {
    label: string
    value: string
  }[]
  assignedUserOptions?: {
    label: string
    value: string
  }[]
  tagOptions?: {
    label: string
    value: string
    color?: string
  }[]
  globalFilter?: string
  setGlobalFilter?: (value: string) => void
}

export function DataTableToolbar<TData>({
  table,
  statusOptions,
  yearOptions,
  monthOptions,
  assignedUserOptions,
  tagOptions,
  globalFilter,
  setGlobalFilter,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Buscar..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter?.(event.target.value)}
          className="h-8 w-[150px] lg:w-[300px]"
        />
        {isFiltered && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()} className="h-8 px-2 lg:px-3">
            Limpiar
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
        {table.getColumn("estado") && statusOptions && (
          <DataTableFacetedFilter column={table.getColumn("estado")} title="Estado" options={statusOptions} />
        )}
        {table.getColumn("ano") && yearOptions && (
          <DataTableFacetedFilter column={table.getColumn("ano")} title="Año" options={yearOptions} />
        )}
        {table.getColumn("mes") && monthOptions && (
          <DataTableFacetedFilter column={table.getColumn("mes")} title="Mes" options={monthOptions} />
        )}
        {table.getColumn("assigned_to_name") && assignedUserOptions && (
          <DataTableFacetedFilter
            column={table.getColumn("assigned_to_name")}
            title="Asignado a"
            options={assignedUserOptions}
          />
        )}
        {table.getColumn("document_tags") && tagOptions && tagOptions.length > 0 && (
          <DataTableFacetedFilter column={table.getColumn("document_tags")} title="Etiquetas" options={tagOptions} />
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}
