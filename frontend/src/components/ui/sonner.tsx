"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-[15px]" />,
        info: <InfoIcon className="size-[15px]" />,
        warning: <TriangleAlertIcon className="size-[15px]" />,
        error: <OctagonXIcon className="size-[15px]" />,
        loading: <Loader2Icon className="size-[15px] animate-spin" />,
      }}
      toastOptions={{
        duration: 3000,
        classNames: {
          toast: 'agentboard-toast',
          title: 'agentboard-toast-title',
          description: 'agentboard-toast-description',
          icon: 'agentboard-toast-icon',
          success: 'agentboard-toast--success',
          error: 'agentboard-toast--error',
          warning: 'agentboard-toast--warning',
          info: 'agentboard-toast--info',
        },
        style: {
          fontFamily: "'General Sans', system-ui, -apple-system, sans-serif",
        },
      }}
      gap={8}
      visibleToasts={3}
      offset={16}
      style={
        {
          "--normal-bg": "var(--elevated)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--border-subtle)",
          "--border-radius": "10px",
          "--width": "380px",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
