"use client"

import { useEffect, useMemo } from "react"
import { useParams, useSearchParams } from "next/navigation"

import SharedViewport from "@/components/project/SharedViewport"
import Toolbar from "@/components/session/Toolbar"
import ExpertCamPanel from "@/components/webcam/ExpertCamPanel"
import LearnerCamPanel from "@/components/webcam/LearnerCamPanel"
import LearnerReactionPanel from "@/components/learner/LearnerReactionPanel"
import { Badge } from "@/components/ui/badge"
import { useSessionStore } from "@/lib/store/useSessionStore"
import { useSyncSession } from "@/lib/sync/useSyncSession"
import {
  isWalkthroughStepComplete,
  walkthroughSteps,
} from "@/lib/lesson/walkthrough"
import type { Role, SessionMode } from "@/types"

export default function SessionRoom() {
  const params = useParams()
  const searchParams = useSearchParams()
  useSyncSession()

  const {
    sessionId,
    setSessionId,
    setMode,
    setRole,
    lessonPhase,
    walkthroughStepIndex,
    walkthroughTooltipStepId,
    partTransforms,
    partScales,
    partRotations,
    startWalkthrough,
    resetLesson,
    showWalkthroughTooltip,
    advanceWalkthrough,
  } = useSessionStore()

  const currentStep = walkthroughSteps[walkthroughStepIndex] ?? null

  useEffect(() => {
    const routeSessionId =
      typeof params?.id === "string" && params.id.trim().length > 0 ? params.id : null
    const routeRole = (searchParams.get("role") as Role | null) ?? null
    const routeMode = (searchParams.get("mode") as SessionMode | null) ?? null

    if (routeSessionId) {
      setSessionId(routeSessionId)
      setMode(routeMode ?? (routeSessionId === "demo" ? "demo" : "live"))

      if (routeSessionId === "demo") {
        setRole("expert")
      } else if (routeRole) {
        setRole(routeRole)
      }
      return
    }

    if (!sessionId) {
      setSessionId(`demo-${crypto.randomUUID().slice(0, 8)}`)
    }
    setMode("demo")
    setRole("expert")
  }, [params, searchParams, sessionId, setMode, setRole, setSessionId])

  useEffect(() => {
    if (lessonPhase !== "walkthrough" || !currentStep || walkthroughTooltipStepId) {
      return
    }

    if (
      isWalkthroughStepComplete(
        currentStep.id,
        partTransforms,
        partScales,
        partRotations
      )
    ) {
      showWalkthroughTooltip(currentStep.id)
    }
  }, [
    currentStep,
    lessonPhase,
    partRotations,
    partScales,
    partTransforms,
    showWalkthroughTooltip,
    walkthroughTooltipStepId,
  ])

  useEffect(() => {
    if (!walkthroughTooltipStepId) return

    const timeoutId = window.setTimeout(() => {
      advanceWalkthrough()
    }, 3200)

    return () => window.clearTimeout(timeoutId)
  }, [advanceWalkthrough, walkthroughTooltipStepId])

  const phaseLabel = useMemo(() => {
    if (lessonPhase === "teaching") return "Expert teaching phase"
    if (lessonPhase === "walkthrough") return "Learner walkthrough phase"
    return "Walkthrough complete"
  }, [lessonPhase])

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
      <header className="border-b border-white/10 bg-black/40 px-5 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">Spatial Mentor Lesson Room</h1>
            <p className="text-sm text-white/60">
              Teach with annotations first, then hand off a gesture-driven walkthrough.
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-pink-500/20 bg-pink-500/10 text-pink-200">
              {phaseLabel}
            </Badge>
            {sessionId && (
              <Badge variant="outline" className="border-white/10 bg-white/5 text-white/70">
                Session {sessionId}
              </Badge>
            )}
            <button
              type="button"
              onClick={startWalkthrough}
              className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pink-400"
            >
              Start walkthrough
            </button>
            <button
              type="button"
              onClick={resetLesson}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/10"
            >
              Reset lesson
            </button>
          </div>
        </div>
        <div className="mt-2 grid gap-2 text-xs text-white/70 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            During teaching, the expert can annotate, orbit, drag, resize, and react to learner
            feedback.
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            Starting the walkthrough resets the shared workspace and shifts object control to the
            learner hand gestures.
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            Each successful task reveals how the same action maps to a real Blender-style workflow.
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <section className="flex min-h-[500px] flex-1 gap-3">
          <div className="min-h-[500px] min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl shadow-black/30">
            <SharedViewport />
          </div>
          <Toolbar />
        </section>

        <section className="grid shrink-0 gap-3 lg:grid-cols-[220px_220px_minmax(260px,1fr)]">
          <div className="h-[170px]">
            <ExpertCamPanel />
          </div>
          <div className="h-[170px]">
            <LearnerCamPanel />
          </div>
          <div className="h-[170px]">
            <LearnerReactionPanel />
          </div>
        </section>
      </main>
    </div>
  )
}
