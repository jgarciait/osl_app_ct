"use client"

import { useEffect } from "react"
import type { Table } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
  tableId?: string // Optional unique ID for the table
}

export function DataTableViewOptions<TData>({ table, tableId = "default-table" }: DataTableViewOptionsProps<TData>) {
  // Load column visibility from cookies when component mounts
  useEffect(() => {
    const loadColumnVisibility = () => {
      try {
        const cookieValue = getCookie(`table-columns-${tableId}`)
        if (cookieValue) {
          const visibilityState = JSON.parse(cookieValue)
          // Apply saved visibility state to columns
          table.getAllColumns().forEach((column) => {
            if (visibilityState[column.id] !== undefined) {
              column.toggleVisibility(visibilityState[column.id])
            }
          })
        }
      } catch (error) {
        console.error("Error loading column visibility from cookies:", error)
      }
    }

    loadColumnVisibility()
  }, [table, tableId])

  // Save column visibility to cookies when it changes
  const saveColumnVisibility = (columnId: string, isVisible: boolean) => {
    try {
      // Get current visibility state
      const currentVisibility = getCookie(`table-columns-${tableId}`)
      const visibilityState = currentVisibility ? JSON.parse(currentVisibility) : {}

      // Update with new value
      visibilityState[columnId] = isVisible

      // Save to cookie (30 days expiration)
      setCookie(`table-columns-${tableId}`, JSON.stringify(visibilityState), 30)
    } catch (error) {
      console.error("Error saving column visibility to cookies:", error)
    }
  }

  // Cookie helper functions
  const setCookie = (name: string, value: string, days: number) => {
    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`
  }

  const getCookie = (name: string) => {
    const nameEQ = `${name}=`
    const ca = document.cookie.split(";")
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) === " ") c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
    }
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto hidden lg:flex">
          Columnas
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        {table
          .getAllColumns()
          .filter((column) => column.getCanHide())
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => {
                  column.toggleVisibility(!!value)
                  saveColumnVisibility(column.id, !!value)
                }}
              >
                {column.id === "estado" ? "estatus" : column.id === "ano" ? "año" : column.id}
              </DropdownMenuCheckboxItem>
            )
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
