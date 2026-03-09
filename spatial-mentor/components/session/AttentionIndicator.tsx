"use client"

import { Badge } from "@/components/ui/badge"
import { useSessionStore } from "@/lib/store/useSessionStore"

const labels = {
  target_locked: "Likely focused on the task",
  uncertain: "Attention seems uncertain",
  away: "Attention appears away from target",
  no_signal: "No reliable attention signal",
} as const

const classes = {
  target_locked: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  uncertain: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  away: "border-red-500/30 bg-red-500/10 text-red-300",
  no_signal: "border-border bg-background/40 text-muted-foreground",
} as const

export default function AttentionIndicator() {
  const attentionState = useSessionStore((state) => state.attentionState)

  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-muted-foreground">Estimated attention</span>
      <Badge variant="outline" className={classes[attentionState]}>
        {labels[attentionState]}
      </Badge>
    </div>
  )
}
