import * as React from "react"

import { cn } from "@/lib/utils"

const Bar = React.forwardRef<SVGRectElement, React.SVGProps<SVGRectElement>>(({ className, ...props }, ref) => (
  <rect ref={ref} className={cn("", className)} {...props} />
))
Bar.displayName = "Bar"

const BarChart = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(({ className, ...props }, ref) => (
  <svg
    ref={ref}
    viewBox="0 0 150 80"
    preserveAspectRatio="none"
    className={cn("overflow-visible", className)}
    {...props}
  />
))
BarChart.displayName = "BarChart"

const XAxis = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(({ className, ...props }, ref) => (
  <svg
    ref={ref}
    viewBox="0 0 150 80"
    preserveAspectRatio="none"
    className={cn("overflow-visible", className)}
    {...props}
  />
))
XAxis.displayName = "XAxis"

const ChartContainer = ({ config, className, children }) => {
  const colorVariables = Object.entries(config).reduce((acc, [key, value]) => {
    acc[`--color-${key}`] = value.color
    return acc
  }, {})

  return (
    <div className={className} style={colorVariables}>
      {children}
    </div>
  )
}

const ChartTooltip = ({ content, cursor = true }) => {
  return (
    <g>
      {cursor && <line className="stroke-gray-300 pointer-events-none" x1="0" x2="0" y1="0" y2="100%" />}
      {content}
    </g>
  )
}

const ChartTooltipContent = ({ payload, config }) => {
  if (!payload || !payload[0] || !config) {
    return null
  }

  const data = payload[0].payload

  return (
    <g>
      <rect x="6" y="0" width="120" height="auto" fill="#fff" stroke="#666" strokeWidth="0.5" />
      {Object.entries(config).map(([key, value], index) => {
        if (data[key]) {
          return (
            <text key={key} x="12" y={15 + index * 12} fontSize="10" fill="#666">
              <tspan fontWeight="bold" fill={value.color}>
                {value.label}:{" "}
              </tspan>
              {data[key]}
            </text>
          )
        }
        return null
      })}
    </g>
  )
}

export { Bar, BarChart, XAxis, ChartContainer, ChartTooltip, ChartTooltipContent }
