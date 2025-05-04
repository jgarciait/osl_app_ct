"use client"

interface PieChartData {
  name: string
  value: number
}

interface SimplePieChartProps {
  data: PieChartData[]
  colors?: string[]
}

export function SimplePieChart({
  data,
  colors = ["#1a365d", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe", "#eff6ff"],
}: SimplePieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>No hay datos disponibles para mostrar</p>
      </div>
    )
  }

  // Calcular el total para los porcentajes
  const total = data.reduce((sum, item) => sum + (item.value as number), 0)

  // Preparar los datos para el gráfico
  let currentAngle = 0
  const segments = data.map((item, index) => {
    const percentage = total > 0 ? (item.value as number) / total : 0
    const startAngle = currentAngle
    const angle = percentage * 360
    currentAngle += angle

    return {
      ...item,
      percentage,
      startAngle,
      angle,
      color: colors[index % colors.length],
    }
  })

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="hidden relative w-[150px] h-[150px] sm:w-[200px] sm:h-[200px]">
        {segments.map((segment, index) => {
          // Calcular las coordenadas para el arco SVG
          const startAngle = segment.startAngle * (Math.PI / 180)
          const endAngle = (segment.startAngle + segment.angle) * (Math.PI / 180)

          // Calcular puntos del arco
          const x1 = 100 + 100 * Math.cos(startAngle)
          const y1 = 100 + 100 * Math.sin(startAngle)
          const x2 = 100 + 100 * Math.cos(endAngle)
          const y2 = 100 + 100 * Math.sin(endAngle)

          // Determinar si el arco es mayor que 180 grados
          const largeArcFlag = segment.angle > 180 ? 1 : 0

          // Crear path para el segmento
          const path = [
            `M 100 100`, // Mover al centro
            `L ${x1} ${y1}`, // Línea al punto inicial del arco
            `A 100 100 0 ${largeArcFlag} 1 ${x2} ${y2}`, // Arco al punto final
            "Z", // Cerrar el path
          ].join(" ")

          return (
            <svg key={index} className="absolute top-0 left-0 w-full h-full" viewBox="0 0 200 200">
              <path
                d={path}
                fill={segment.color}
                stroke="white"
                strokeWidth="1"
                className="hover:opacity-80 transition-opacity"
              />
              {segment.angle > 15 && (
                <text
                  x={100 + 70 * Math.cos(startAngle + (segment.angle / 2) * (Math.PI / 180))}
                  y={100 + 70 * Math.sin(startAngle + (segment.angle / 2) * (Math.PI / 180))}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {Math.round(segment.percentage * 100)}%
                </text>
              )}
            </svg>
          )
        })}

        {/* Círculo central para crear efecto de donut - actualmente oculto */}
        <div className="hidden absolute top-1/2 left-1/2 w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] bg-white rounded-full -translate-x-1/2 -translate-y-1/2 z-10"></div>
      </div>

      <div className="mt-3 sm:mt-6 grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-1 sm:gap-y-2">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center">
            <div className="w-2 h-2 sm:w-3 sm:h-3 mr-1 sm:mr-2" style={{ backgroundColor: segment.color }}></div>
            <span className="text-[10px] sm:text-xs break-words max-w-[100px] sm:max-w-[150px]" title={segment.name}>
              {segment.name}: {(segment.percentage * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
