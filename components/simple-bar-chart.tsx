"use client"

interface BarChartData {
  nombre: string
  activas: number
  archivadas: number
  total: number
  value: number
  name: string
}

interface SimpleBarChartProps {
  data: BarChartData[]
  height?: number
}

// Modificar la función para mostrar solo los últimos 5 meses y mejorar la visualización cuando los datos están concentrados en un solo mes:

export function SimpleBarChart({ data, height = 350 }: SimpleBarChartProps) {
  console.log("SimpleBarChart data:", data)

  // Verificar si hay datos con valores
  const hasValidData = data && data.length > 0 && data.some((item) => (item.value || item.total) > 0)

  if (!hasValidData) {
    return (
      <div className="flex h-full items-center justify-center flex-col">
        <p className="text-red-500">No hay datos disponibles para mostrar</p>
        <p className="text-xs text-gray-500 mt-2">Datos recibidos: {JSON.stringify(data)}</p>
      </div>
    )
  }

  // Asumiendo que los datos tienen una propiedad 'fecha' o podemos inferir la fecha del nombre del mes
  // Filtrar para mostrar solo los últimos 5 meses cronológicamente
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Crear un mapa de nombres de meses a números
  const monthNameToNumber = {
    Enero: 0,
    Febrero: 1,
    Marzo: 2,
    Abril: 3,
    Mayo: 4,
    Junio: 5,
    Julio: 6,
    Agosto: 7,
    Septiembre: 8,
    Octubre: 9,
    Noviembre: 10,
    Diciembre: 11,
  }

  // Función para obtener el número de mes a partir del nombre
  const getMonthNumber = (monthName) => {
    // Si el nombre incluye el año (ej: "Enero 2023"), extraer solo el nombre del mes
    const cleanMonthName = monthName.split(" ")[0]
    return monthNameToNumber[cleanMonthName] !== undefined ? monthNameToNumber[cleanMonthName] : -1
  }

  // Ordenar los datos cronológicamente (del más antiguo al más reciente)
  const sortedData = [...data].sort((a, b) => {
    const monthA = getMonthNumber(a.name || a.nombre)
    const monthB = getMonthNumber(b.name || b.nombre)

    // Si no podemos determinar el mes, poner al final
    if (monthA === -1) return 1
    if (monthB === -1) return -1

    // Calcular la diferencia de meses respecto al mes actual
    const diffA = (currentMonth - monthA + 12) % 12
    const diffB = (currentMonth - monthB + 12) % 12

    // Ordenar por cercanía al mes actual (los más recientes primero)
    return diffA - diffB
  })

  // Tomar los últimos 5 meses (los más recientes)
  const last5MonthsData = sortedData.slice(0, 5)

  // Si todos los datos están en un solo mes, mostrar un mensaje
  const totalDocuments = data.reduce((sum, item) => sum + item.value, 0)
  const hasDataInMultipleMonths = data.filter((item) => item.value > 0).length > 1

  // Encontrar el valor máximo para escalar las barras
  const values = last5MonthsData.map((item) => Number(item.value || item.total || 0))
  const maxValue = Math.max(...values) || 1 // Usar 1 como mínimo para evitar división por cero

  // Calcular la escala (altura máxima de barra en píxeles)
  const maxBarHeight = height - 100 // Aumentar el espacio para evitar desbordamiento
  const scale = maxValue > 0 ? maxBarHeight / maxValue : 0

  return (
    <div className="w-full h-full">
      <div className="flex justify-between mb-4">
        <div className="text-sm text-gray-500">
          {!hasDataInMultipleMonths && totalDocuments > 0 ? (
            <span className="text-amber-600 font-medium">
              Todos los documentos ({totalDocuments}) fueron creados en el mismo mes
            </span>
          ) : (
            <span>Mostrando los últimos 5 meses</span>
          )}
        </div>
      </div>

      <div className="flex items-end justify-around h-[calc(100%-30px)] border-b border-l relative">
        {/* Líneas de guía horizontales */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="border-t border-gray-100 absolute w-full" style={{ bottom: "25%" }}></div>
          <div className="border-t border-gray-100 absolute w-full" style={{ bottom: "50%" }}></div>
          <div className="border-t border-gray-100 absolute w-full" style={{ bottom: "75%" }}></div>

          {/* Etiquetas de valores en el eje Y */}
          {maxValue > 0 && (
            <>
              <div className="absolute -left-2 text-xs text-gray-500" style={{ bottom: "25%" }}>
                {Math.round(maxValue * 0.25)}
              </div>
              <div className="absolute -left-2 text-xs text-gray-500" style={{ bottom: "50%" }}>
                {Math.round(maxValue * 0.5)}
              </div>
              <div className="absolute -left-2 text-xs text-gray-500" style={{ bottom: "75%" }}>
                {Math.round(maxValue * 0.75)}
              </div>
              <div className="absolute -left-2 text-xs text-gray-500" style={{ bottom: "100%" }}>
                {maxValue}
              </div>
            </>
          )}
        </div>

        {last5MonthsData.map((item, index) => {
          // Usar value o total, lo que esté disponible
          const itemValue = Number(item.value || item.total || 0)

          // Calcular la altura de la barra (limitada por maxBarHeight)
          const barHeight = Math.max(itemValue * scale, itemValue > 0 ? 20 : 0) // Mínimo 20px si hay valor

          console.log(`Barra ${index}: valor=${itemValue}, altura=${barHeight}px`)

          return (
            <div
              key={index}
              className="flex flex-col items-center mx-0.5 sm:mx-1 w-full max-w-[60px] sm:max-w-[100px] relative z-10"
            >
              <div className="flex flex-col w-full items-center">
                {/* Barra con valor */}
                <div className="relative w-8 sm:w-16 rounded-t-md overflow-visible group">
                  {itemValue > 0 && (
                    <div
                      className="w-full bg-gradient-to-t from-blue-700 to-blue-500 relative z-20"
                      style={{ height: `${barHeight}px` }}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity"></div>
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black text-white text-[10px] sm:text-xs px-1 py-0.5 rounded transition-opacity whitespace-nowrap z-30">
                        {itemValue} expresiones
                      </div>
                      {/* Mostrar la cantidad */}
                      <div className="absolute inset-0 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold">
                        {itemValue}
                      </div>
                    </div>
                  )}

                  {/* Reflejo para efecto 3D */}
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-black opacity-10"></div>
                </div>
              </div>

              {/* Etiqueta del mes */}
              <div className="text-[10px] sm:text-xs mt-1 sm:mt-2 text-center font-medium">
                {item.name || item.nombre}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
