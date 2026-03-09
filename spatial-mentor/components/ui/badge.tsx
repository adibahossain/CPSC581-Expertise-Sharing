"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "outline"
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
        variant === "outline"
          ? "border-border bg-background/50 text-foreground"
          : "border-transparent bg-primary text-primary-foreground",
        className
      )}
      {...props}
    />
  )
}
