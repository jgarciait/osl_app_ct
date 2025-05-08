"use client"

import { useState, useEffect } from "react"
import { createClientClient } from "@/lib/supabase-client"
import { Check, ChevronsUpDown, Plus, Edit } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

interface EstatusSelectorProps {
  value: number | null
  onChange?: (value: number | null) => void
  onValueChange?: (value: number | null) => void
  className?: string
}

export function EstatusSelector({ value, onChange, onValueChange, className }: EstatusSelectorProps) {
  const [open, setOpen] = useState(false)
  const [estatus, setEstatus] = useState<Array<{ id: number; nombre: string; color: string }>>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [newEstatus, setNewEstatus] = useState({ nombre: "", color: "#3B82F6" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingEstatus, setEditingEstatus] = useState<{ id: number; nombre: string; color: string } | null>(null)

  useEffect(() => {
    const fetchEstatus = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase.from("peticionEstatus").select("id, nombre, color").order("nombre")

        if (error) throw error
        setEstatus(data || [])
      } catch (error) {
        console.error("Error al cargar estatus:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEstatus()
  }, [supabase])

  const selectedEstatus = estatus.find((item) => item.id === value)

  // Función para determinar si el texto debe ser blanco o negro según el color de fondo
  const getTextColor = (bgColor: string) => {
    // Convertir el color hexadecimal a RGB
    const hex = bgColor.replace("#", "")
    const r = Number.parseInt(hex.substring(0, 2), 16)
    const g = Number.parseInt(hex.substring(2, 4), 16)
    const b = Number.parseInt(hex.substring(4, 6), 16)

    // Calcular la luminosidad (fórmula estándar)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    // Si la luminosidad es mayor a 0.5, el fondo es claro, por lo que el texto debe ser negro
    return luminance > 0.5 ? "#000000" : "#FFFFFF"
  }

  const createNewEstatus = async () => {
    if (!newEstatus.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre del estatus es requerido",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      const { data, error } = await supabase
        .from("peticionEstatus")
        .insert([{ nombre: newEstatus.nombre, color: newEstatus.color }])
        .select()

      if (error) throw error

      // Actualizar la lista de estatus
      setEstatus([...estatus, data[0]])

      // Seleccionar el nuevo estatus usando el callback apropiado
      if (typeof onChange === "function") {
        onChange(data[0].id)
      } else if (typeof onValueChange === "function") {
        onValueChange(data[0].id)
      }

      // Cerrar el diálogo
      setDialogOpen(false)

      // Resetear el formulario
      setNewEstatus({ nombre: "", color: "#3B82F6" })

      toast({
        title: "Éxito",
        description: "Estatus creado correctamente",
      })
    } catch (error) {
      console.error("Error al crear estatus:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el estatus",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateExistingEstatus = async () => {
    if (!editingEstatus) return

    if (!editingEstatus.nombre.trim()) {
      toast({
        title: "Error",
        description: "El nombre del estatus es requerido",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      const { error } = await supabase
        .from("peticionEstatus")
        .update({
          nombre: editingEstatus.nombre,
          color: editingEstatus.color,
        })
        .eq("id", editingEstatus.id)

      if (error) throw error

      // Actualizar la lista de estatus
      setEstatus(estatus.map((item) => (item.id === editingEstatus.id ? editingEstatus : item)))

      // Cerrar el diálogo
      setEditDialogOpen(false)

      toast({
        title: "Éxito",
        description: "Estatus actualizado correctamente",
      })
    } catch (error) {
      console.error("Error al actualizar estatus:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estatus",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex w-full gap-2">
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", className)}
            disabled={loading}
            onClick={() => setOpen(!open)}
          >
            {loading ? (
              <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>
            ) : selectedEstatus ? (
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: selectedEstatus.color }} />
                {selectedEstatus.nombre}
              </div>
            ) : (
              "Seleccionar estatus"
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
          {selectedEstatus && (
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                setEditingEstatus(selectedEstatus)
                setEditDialogOpen(true)
              }}
              title="Editar estatus seleccionado"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              setDialogOpen(true)
            }}
            title="Añadir nuevo estatus"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Buscar estatus..." />
          <CommandList>
            <CommandEmpty>No se encontraron estatus.</CommandEmpty>
            <CommandGroup>
              {estatus.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.nombre}
                  onSelect={() => {
                    const newValue = item.id === value ? null : item.id
                    if (typeof onChange === "function") {
                      onChange(newValue)
                    } else if (typeof onValueChange === "function") {
                      onValueChange(newValue)
                    }
                    setOpen(false)
                  }}
                >
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                    {item.nombre}
                  </div>
                  <Check className={cn("ml-auto h-4 w-4", value === item.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo estatus</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={newEstatus.nombre}
                onChange={(e) => setNewEstatus({ ...newEstatus, nombre: e.target.value })}
                placeholder="Ej: En proceso"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded border cursor-pointer"
                  style={{ backgroundColor: newEstatus.color }}
                  onClick={() => document.getElementById("colorPicker")?.click()}
                />
                <Input
                  id="colorPicker"
                  type="color"
                  value={newEstatus.color}
                  onChange={(e) => setNewEstatus({ ...newEstatus, color: e.target.value })}
                  className="w-12 h-8 p-0 overflow-hidden"
                />
                <Input
                  value={newEstatus.color}
                  onChange={(e) => setNewEstatus({ ...newEstatus, color: e.target.value })}
                  placeholder="#HEX"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="mt-2">
              <Label>Vista previa</Label>
              <div
                className="mt-1 p-2 rounded flex items-center justify-center"
                style={{ backgroundColor: newEstatus.color, color: getTextColor(newEstatus.color) }}
              >
                {newEstatus.nombre || "Nombre del estatus"}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={createNewEstatus} disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Diálogo para editar estatus */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar estatus</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-nombre">Nombre</Label>
              <Input
                id="edit-nombre"
                value={editingEstatus?.nombre || ""}
                onChange={(e) => setEditingEstatus((prev) => (prev ? { ...prev, nombre: e.target.value } : prev))}
                placeholder="Nombre del estatus"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-color">Color</Label>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded border cursor-pointer"
                  style={{ backgroundColor: editingEstatus?.color || "#3B82F6" }}
                  onClick={() => document.getElementById("edit-colorPicker")?.click()}
                />
                <Input
                  id="edit-colorPicker"
                  type="color"
                  value={editingEstatus?.color || "#3B82F6"}
                  onChange={(e) => setEditingEstatus((prev) => (prev ? { ...prev, color: e.target.value } : prev))}
                  className="w-12 h-8 p-0 overflow-hidden"
                />
                <Input
                  value={editingEstatus?.color || "#3B82F6"}
                  onChange={(e) => setEditingEstatus((prev) => (prev ? { ...prev, color: e.target.value } : prev))}
                  placeholder="#HEX"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="mt-2">
              <Label>Vista previa</Label>
              <div
                className="mt-1 p-2 rounded flex items-center justify-center"
                style={{
                  backgroundColor: editingEstatus?.color || "#3B82F6",
                  color: getTextColor(editingEstatus?.color || "#3B82F6"),
                }}
              >
                {editingEstatus?.nombre || "Nombre del estatus"}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={updateExistingEstatus} disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Popover>
  )
}
