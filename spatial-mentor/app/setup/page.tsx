"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Mic,
  CheckCircle2,
  XCircle,
  GraduationCap,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import type { Role } from "@/types";

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action") || "create";
  const sessionParam = searchParams.get("session") || "";

  const [role, setRole] = useState<Role | null>(null);
  const [sessionCode, setSessionCode] = useState(sessionParam);
  const [camStatus, setCamStatus] = useState<"pending" | "granted" | "denied">(
    "pending"
  );
  const [micStatus, setMicStatus] = useState<"pending" | "granted" | "denied">(
    "pending"
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      setCamStatus("granted");
      setMicStatus("granted");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCamStatus("denied");
      setMicStatus("denied");
    }
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const canProceed = role !== null && (action === "create" || sessionCode);

  const handleEnter = () => {
    const sid = action === "create" ? sessionParam : sessionCode;
    if (!sid || !role) return;
    const params = new URLSearchParams({ role, mode: "live" });
    router.push(`/session/${sid}?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold text-foreground">
        {action === "create" ? "Create Session" : "Join Session"}
      </h1>
      <p className="mb-8 text-muted-foreground">
        Set up your camera and choose your role before entering.
      </p>

      <div className="grid w-full max-w-3xl gap-6 md:grid-cols-2">
        {/* Webcam preview */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Camera Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video overflow-hidden rounded-lg bg-zinc-900">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />
              {camStatus === "pending" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    Camera not active
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge label="Camera" status={camStatus} icon={Camera} />
              <StatusBadge label="Mic" status={micStatus} icon={Mic} />
            </div>

            <Button
              className="w-full"
              variant="outline"
              onClick={requestPermissions}
              disabled={camStatus === "granted"}
            >
              {camStatus === "granted"
                ? "Permissions Granted"
                : "Enable Camera & Mic"}
            </Button>
          </CardContent>
        </Card>

        {/* Role selection + session */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Session Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {action === "join" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Session Code
                </label>
                <input
                  type="text"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value)}
                  placeholder="Enter session code"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                />
              </div>
            )}

            {action === "create" && sessionParam && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Session Code
                </label>
                <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm font-mono text-foreground">
                  {sessionParam}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Share this code with the other participant.
                </p>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Choose Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <RoleCard
                  role="expert"
                  selected={role === "expert"}
                  onClick={() => setRole("expert")}
                  icon={GraduationCap}
                  color="pink"
                />
                <RoleCard
                  role="learner"
                  selected={role === "learner"}
                  onClick={() => setRole("learner")}
                  icon={BookOpen}
                  color="green"
                />
              </div>
            </div>

            <Button
              className="w-full gap-2 bg-pink-600 text-white hover:bg-pink-700"
              disabled={!canProceed}
              onClick={handleEnter}
            >
              Enter Session
              <ArrowRight className="h-4 w-4" />
            </Button>

            {camStatus === "denied" && (
              <p className="text-xs text-muted-foreground">
                Camera denied — you can still enter in manual mode.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({
  label,
  status,
  icon: Icon,
}: {
  label: string;
  status: "pending" | "granted" | "denied";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const color =
    status === "granted"
      ? "text-green-400"
      : status === "denied"
        ? "text-red-400"
        : "text-muted-foreground";
  const StatusIcon = status === "granted" ? CheckCircle2 : XCircle;

  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-border/50 px-2.5 py-1 text-xs"
    >
      <Icon className={`h-3 w-3 ${color}`} />
      {label}
      {status !== "pending" && <StatusIcon className={`h-3 w-3 ${color}`} />}
    </Badge>
  );
}

function RoleCard({
  role,
  selected,
  onClick,
  icon: Icon,
  color,
}: {
  role: Role;
  selected: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  color: "pink" | "green";
}) {
  const ring = selected
    ? color === "pink"
      ? "ring-2 ring-pink-500 border-pink-500/50"
      : "ring-2 ring-green-500 border-green-500/50"
    : "border-border/50";
  const iconColor = color === "pink" ? "text-pink-400" : "text-green-400";

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-all hover:bg-accent/50 ${ring}`}
    >
      <Icon className={`h-6 w-6 ${iconColor}`} />
      <span className="text-sm font-medium capitalize text-foreground">
        {role}
      </span>
    </button>
  );
}

export default function SetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          Loading...
        </div>
      }
    >
      <SetupContent />
    </Suspense>
  );
}
