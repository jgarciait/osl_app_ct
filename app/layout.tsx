import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { NotificationProvider } from "@/contexts/notification-context"
import { ThemeProvider } from "@/components/theme-provider"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "PCL",
  description: "Plataforma de Consultoría Técnica",
  generator: "v0.dev",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Crear cliente de Supabase del lado del servidor
  const supabase = createServerSupabaseClient()

  // Obtener la sesión actual (esto no bloquea la renderización)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <NotificationProvider>{children}</NotificationProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
