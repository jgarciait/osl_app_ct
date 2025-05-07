import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { NotificationProvider } from "@/contexts/notification-context"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Sistema de Consultoría Técnica",
  description:
    "Sistema de gestión documental de opiniones legales, proyectos, informes, investigaciones, resoluciones, mociones y otros productos técnicos.",
  generator: "v0.dev",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <NotificationProvider>{children}</NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
