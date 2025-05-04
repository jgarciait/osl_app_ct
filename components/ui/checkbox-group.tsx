"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const CheckboxGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string[]
    onValueChange?: (value: string[]) => void
  }
>(({ className, value = [], onValueChange, children, ...props }, ref) => {
  const handleValueChange = (itemValue: string, checked: boolean) => {
    if (!onValueChange) return

    if (checked) {
      onValueChange([...value, itemValue])
    } else {
      onValueChange(value.filter((v) => v !== itemValue))
    }
  }

  return (
    <div ref={ref} className={cn("space-y-2", className)} {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === CheckboxItem) {
          return React.cloneElement(child as React.ReactElement<any>, {
            checked: value.includes(child.props.value),
            onCheckedChange: (checked: boolean) => handleValueChange(child.props.value, checked),
          })
        }
        return child
      })}
    </div>
  )
})
CheckboxGroup.displayName = "CheckboxGroup"

const CheckboxItem = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
    children: React.ReactNode
  }
>(({ className, children, id, ...props }, ref) => (
  <div className="flex items-center space-x-2">
    <CheckboxPrimitive.Root
      ref={ref}
      id={id}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-current")}>
        <Check className="h-4 w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
    <Label
      htmlFor={id}
      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {children}
    </Label>
  </div>
))
CheckboxItem.displayName = "CheckboxItem"

export { CheckboxGroup, CheckboxItem }
