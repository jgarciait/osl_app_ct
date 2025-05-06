"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

export const FadeIn = ({
  children,
  delay = 0,
  duration = 0.5,
  className = "",
}: {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export const SlideIn = ({
  children,
  direction = "left",
  delay = 0,
  duration = 0.5,
  className = "",
}: {
  children: ReactNode
  direction?: "left" | "right" | "up" | "down"
  delay?: number
  duration?: number
  className?: string
}) => {
  const directionMap = {
    left: { x: -50, y: 0 },
    right: { x: 50, y: 0 },
    up: { x: 0, y: -50 },
    down: { x: 0, y: 50 },
  }

  return (
    <motion.div
      initial={{ opacity: 0, ...directionMap[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay, duration, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export const ScaleIn = ({
  children,
  delay = 0,
  duration = 0.5,
  className = "",
}: {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export const AnimatedButton = ({
  children,
  className = "",
  ...props
}: {
  children: ReactNode
  className?: string
  [key: string]: any
}) => {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  )
}

export const AnimatedBackground = ({ children }: { children: ReactNode }) => {
  return (
    <motion.div
      initial={{ backgroundPosition: "0% 0%" }}
      animate={{
        backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
      }}
      transition={{
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "reverse",
        duration: 20,
        ease: "linear",
      }}
      style={{
        backgroundSize: "200% 200%",
        backgroundImage:
          "linear-gradient(135deg, rgba(26, 54, 93, 1) 0%, rgba(20, 41, 75, 1) 50%, rgba(26, 54, 93, 1) 100%)",
      }}
      className="absolute inset-0"
    >
      {children}
    </motion.div>
  )
}
