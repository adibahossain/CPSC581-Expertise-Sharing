"use client";

import { useSessionStore } from "@/lib/store/useSessionStore";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Grab } from "lucide-react";
import type { GestureState } from "@/types";

const gestures: {
  id: GestureState;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "pinch", label: "Pinch", icon: Grab },
];

export default function ExpertGestureControls() {
  const { expertGesture, setExpertGesture, runExpertGestureAction } =
    useSessionStore();

  const handleGesture = (id: GestureState) => {
    if (expertGesture === id) {
      setExpertGesture("idle");
      return;
    }

    setExpertGesture(id);
    runExpertGestureAction(id);
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card/80 p-3">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Gesture Fallback
      </span>
      <div className="grid grid-cols-1 gap-1">
        {gestures.map((g) => {
          const isActive = expertGesture === g.id;
          return (
            <motion.div key={g.id} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="sm"
                className={`flex h-auto w-full flex-col gap-0.5 py-1.5 text-[9px] ${
                  isActive
                    ? "bg-pink-500/20 text-pink-400 ring-1 ring-pink-500/30"
                    : "text-muted-foreground hover:bg-pink-500/10 hover:text-pink-400"
                }`}
                onClick={() => handleGesture(g.id)}
              >
                <g.icon className="h-3.5 w-3.5" />
                {g.label}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
