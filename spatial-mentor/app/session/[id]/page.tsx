import { Suspense } from "react";
import SessionRoom from "@/components/session/SessionRoom";

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
          Loading session...
        </div>
      }
    >
      <SessionRoom />
    </Suspense>
  );
}
