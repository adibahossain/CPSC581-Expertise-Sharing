"use client"

import { Badge } from "@/components/ui/badge"
import { useSessionStore } from "@/lib/store/useSessionStore"
import type { LearnerReaction } from "@/types"

const reactions: { id: LearnerReaction; label: string }[] = [
  { id: "yes", label: "Yes" },
  { id: "no", label: "No" },
  { id: "thumbs_up", label: "Understood" },
  { id: "thumbs_down", label: "Confused" },
  { id: "explain_please", label: "Explain please" },
  { id: "demonstrate_again", label: "Demonstrate again" },
]

export default function LearnerReactionPanel() {
  const learnerReaction = useSessionStore((state) => state.learnerReaction)
  const setLearnerReaction = useSessionStore((state) => state.setLearnerReaction)

  return (
    <div className="rounded-xl border border-green-500/20 bg-card/80 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium text-foreground">Learner quick responses</div>
          <div className="text-xs text-muted-foreground">
            Manual fallback controls when a gesture is missed.
          </div>
        </div>
        {learnerReaction && (
          <Badge
            variant="outline"
            className="border-green-500/30 bg-green-500/10 text-green-300"
          >
            {learnerReaction.replaceAll("_", " ")}
          </Badge>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {reactions.map((reaction) => {
          const isActive = learnerReaction === reaction.id
          return (
            <button
              key={reaction.id}
              type="button"
              onClick={() => setLearnerReaction(isActive ? null : reaction.id)}
              className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                isActive
                  ? "border-green-500/40 bg-green-500/15 text-green-200"
                  : "border-border bg-background/40 text-muted-foreground hover:border-green-500/20 hover:text-foreground"
              }`}
            >
              {reaction.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
