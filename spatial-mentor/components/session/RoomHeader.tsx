"use client";

import { Badge } from "@/components/ui/badge";
import { useSessionStore } from "@/lib/store/useSessionStore";
import { MonitorPlay, Wifi, Hand } from "lucide-react";

export default function RoomHeader() {
  const { sessionId, mode, role, expertGesture, focusTarget } = useSessionStore();

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-foreground">
          Spatial Mentor
        </span>
        <Badge
          variant="outline"
          className="gap-1 border-pink-500/30 bg-pink-500/10 text-xs text-pink-400"
        >
          {mode === "demo" ? (
            <MonitorPlay className="h-3 w-3" />
          ) : (
            <Wifi className="h-3 w-3" />
          )}
          {mode === "demo" ? "Demo Mode" : "Live"}
        </Badge>
        {sessionId && sessionId !== "demo" && (
          <Badge variant="outline" className="font-mono text-xs">
            {sessionId}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        {role && (
          <Badge
            variant="outline"
            className={`text-xs capitalize ${
              role === "expert"
                ? "border-pink-500/30 text-pink-400"
                : "border-green-500/30 text-green-400"
            }`}
          >
            {role}
          </Badge>
        )}
        {expertGesture !== "idle" && (
          <Badge
            variant="outline"
            className="gap-1 border-amber-500/30 bg-amber-500/10 text-xs text-amber-400"
          >
            <Hand className="h-3 w-3" />
            {expertGesture}
          </Badge>
        )}
        {focusTarget && (
          <Badge
            variant="outline"
            className="border-sky-500/30 bg-sky-500/10 text-xs text-sky-300"
          >
            Focus: {focusTarget.label}
          </Badge>
        )}
      </div>
    </header>
  );
}
