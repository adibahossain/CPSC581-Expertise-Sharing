"use client";

import { useSessionStore } from "@/lib/store/useSessionStore";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Pencil,
  ArrowUpRight,
  MapPin,
  Type,
  Target,
  Hand,
  Trash2,
  Undo2,
  MousePointer2,
} from "lucide-react";
import type { ActiveTool } from "@/types";

const tools: { id: ActiveTool; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "gesture", label: "Gesture Drag", icon: Hand },
  { id: "draw", label: "Draw", icon: Pencil },
  { id: "arrow", label: "Arrow", icon: ArrowUpRight },
  { id: "marker", label: "Marker", icon: MapPin },
  { id: "text", label: "Text Note", icon: Type },
  { id: "focus", label: "Focus Region", icon: Target },
];

export default function Toolbar() {
  const { activeTool, setActiveTool, clearAnnotations, undoLastAnnotation, lessonPhase } =
    useSessionStore();

  return (
    <div className="flex w-14 flex-col items-center gap-1 border-l border-border bg-card/80 py-3 backdrop-blur">
      {tools.map((tool) => {
        const isActive = activeTool === tool.id;
        const isDisabled = lessonPhase === "walkthrough" && tool.id !== "gesture";
        return (
          <Tooltip key={tool.id}>
            <TooltipTrigger
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                isActive
                  ? "bg-pink-500/20 text-pink-400"
                  : isDisabled
                    ? "cursor-not-allowed text-muted-foreground/35"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
              disabled={isDisabled}
              onClick={() => setActiveTool(isActive ? null : tool.id)}
            >
              <tool.icon className="h-[18px] w-[18px]" />
            </TooltipTrigger>
            <TooltipContent side="left">
              {isDisabled ? `${tool.label} disabled during walkthrough` : tool.label}
            </TooltipContent>
          </Tooltip>
        );
      })}

      <div className="my-1 h-px w-8 bg-border" />

      <Tooltip>
        <TooltipTrigger
          className={`flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors ${
            lessonPhase === "walkthrough"
              ? "cursor-not-allowed opacity-35"
              : "hover:bg-accent hover:text-foreground"
          }`}
          disabled={lessonPhase === "walkthrough"}
          onClick={undoLastAnnotation}
        >
          <Undo2 className="h-[18px] w-[18px]" />
        </TooltipTrigger>
        <TooltipContent side="left">Undo</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          className={`flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors ${
            lessonPhase === "walkthrough"
              ? "cursor-not-allowed opacity-35"
              : "hover:bg-destructive/20 hover:text-red-400"
          }`}
          disabled={lessonPhase === "walkthrough"}
          onClick={clearAnnotations}
        >
          <Trash2 className="h-[18px] w-[18px]" />
        </TooltipTrigger>
        <TooltipContent side="left">Clear All</TooltipContent>
      </Tooltip>
    </div>
  );
}
