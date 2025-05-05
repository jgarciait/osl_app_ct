import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Sistema de Expresiones Legislativas",
  description: "Sistema para gestionar expresiones legislativas de ciudadanos",
  generator: "v0.dev",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {/* No envolver todas las rutas con GroupPermissionsProvider */}
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
