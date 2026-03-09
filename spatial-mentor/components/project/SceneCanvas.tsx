"use client";

import { useCallback, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import ObjectScene from "./ObjectScene";
import { useSessionStore } from "@/lib/store/useSessionStore";

const GESTURE_ORBIT_SPEED = Math.PI * 1.2;
const MIN_POLAR_ANGLE = 0.35;
const MAX_POLAR_ANGLE = Math.PI - 0.35;

export default function SceneCanvas() {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const lastPalmPointerRef = useRef<{ x: number; y: number } | null>(null);
  const {
    activeTool,
    interactionMode,
    clearSelections,
    expertGesture,
    expertPalmPointer,
    learnerGesture,
    learnerPalmPointer,
    lessonPhase,
  } = useSessionStore();
  const orbitEnabled = interactionMode !== "dragging_object";
  const activeGesture = lessonPhase === "walkthrough" ? learnerGesture : expertGesture;
  const activePalmPointer =
    lessonPhase === "walkthrough" ? learnerPalmPointer : expertPalmPointer;

  useEffect(() => {
    if (
      activeTool !== "gesture" ||
      activeGesture !== "open_palm" ||
      interactionMode === "dragging_object" ||
      !activePalmPointer
    ) {
      lastPalmPointerRef.current = null;
      return;
    }

    if (!controlsRef.current) return;

    const previousPalmPointer = lastPalmPointerRef.current;
    lastPalmPointerRef.current = activePalmPointer;
    if (!previousPalmPointer) return;

    const dx = activePalmPointer.x - previousPalmPointer.x;
    const dy = activePalmPointer.y - previousPalmPointer.y;
    if (Math.abs(dx) < 0.002 && Math.abs(dy) < 0.002) return;

    const nextAzimuthalAngle =
      controlsRef.current.getAzimuthalAngle() - dx * GESTURE_ORBIT_SPEED;
    const nextPolarAngle = Math.max(
      MIN_POLAR_ANGLE,
      Math.min(
        MAX_POLAR_ANGLE,
        controlsRef.current.getPolarAngle() - dy * GESTURE_ORBIT_SPEED
      )
    );

    controlsRef.current.setAzimuthalAngle(nextAzimuthalAngle);
    controlsRef.current.setPolarAngle(nextPolarAngle);
    controlsRef.current.update();
  }, [activeGesture, activePalmPointer, activeTool, interactionMode]);

  const onCreated = useCallback(({ gl }: { gl: { domElement: HTMLCanvasElement; forceContextRestore?: () => void } }) => {
    const canvas = gl.domElement;

    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      console.warn("WebGL context lost — will attempt restore");
    });

    canvas.addEventListener("webglcontextrestored", () => {
      console.info("WebGL context restored");
    });
  }, []);

  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [4.8, 2.8, 6.6], fov: 48 }}
        gl={{
          antialias: true,
          powerPreference: "default",
          preserveDrawingBuffer: true,
        }}
        onCreated={onCreated}
        onPointerMissed={() => {
          if (activeTool === "select" && interactionMode === "idle") {
            clearSelections();
          }
        }}
      >
        <color attach="background" args={["#0a0a0f"]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.3} />
        <gridHelper args={[14, 14, "#27272a", "#18181b"]} position={[0, -0.82, 0]} />
        <ObjectScene />
        <ContactShadows
          position={[0, -0.8, 0]}
          opacity={0.4}
          scale={12}
          blur={2}
        />
        <Environment preset="city" />
        <OrbitControls
          ref={controlsRef}
          target={[0, 0, 0]}
          enablePan={false}
          enableZoom={true}
          enabled={orbitEnabled}
          minDistance={3.5}
          maxDistance={16}
        />
      </Canvas>
    </div>
  );
}
