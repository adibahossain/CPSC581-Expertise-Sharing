"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { RoundedBox, Edges } from "@react-three/drei";
import * as THREE from "three";
import { useSessionStore } from "@/lib/store/useSessionStore";
import type {
  DemoPartId,
  HandPointer,
  PartRotations,
  PartScales,
  PartTransforms,
} from "@/types";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const partBasePositions: Record<DemoPartId, { x: number; y: number }> = {
  mainBody: { x: 0, y: 0 },
  topNotch: { x: 0.4, y: 0.85 },
  leftExtension: { x: -1.1, y: -0.3 },
  platform: { x: 0, y: -0.75 },
};

const partBounds: Record<DemoPartId, { minX: number; maxX: number; minY: number; maxY: number }> = {
  mainBody: { minX: -2.4, maxX: 2.4, minY: -1.9, maxY: 1.9 },
  topNotch: { minX: -2.2, maxX: 2.2, minY: -1.2, maxY: 2.4 },
  leftExtension: { minX: -3.2, maxX: 1.4, minY: -1.8, maxY: 1.5 },
  platform: { minX: -2.8, maxX: 2.8, minY: -2.1, maxY: 0.8 },
};

const partBaseSizes: Record<DemoPartId, { width: number; height: number }> = {
  mainBody: { width: 2, height: 1.2 },
  topNotch: { width: 0.8, height: 0.5 },
  leftExtension: { width: 0.6, height: 0.6 },
  platform: { width: 4.8, height: 0.1 },
};

const SCALE_MIN = 0.7;
const SCALE_MAX = 2.4;
const HANDLE_SNAP_DISTANCE = 0.34;
const HANDLE_RENDER_RADIUS = 0.065;
const ROTATION_HANDLE_DISTANCE = 0.42;

type ScaleHandle = "left" | "right" | "top" | "bottom";

type DragState = {
  partId: DemoPartId;
  startPointer: { x: number; y: number };
  startTransforms: PartTransforms;
};

type ScaleState = {
  partId: DemoPartId;
  handle: ScaleHandle;
  center: { x: number; y: number };
  startDistance: number;
  startScale: number;
};

type RotationState = {
  partId: DemoPartId;
  center: { x: number; y: number };
  startAngle: number;
  startRotation: number;
};

type HandlePoint = {
  partId: DemoPartId;
  handle: ScaleHandle;
  position: THREE.Vector3;
  center: { x: number; y: number };
};

type RotationHandlePoint = {
  partId: DemoPartId;
  position: THREE.Vector3;
  center: { x: number; y: number };
};

const partIds = Object.keys(partBasePositions) as DemoPartId[];

function getPartOffsetKeys(partId: DemoPartId) {
  switch (partId) {
    case "mainBody":
      return { x: "mainBodyX", y: "mainBodyY" } as const;
    case "topNotch":
      return { x: "topNotchX", y: "topNotchY" } as const;
    case "leftExtension":
      return { x: "leftExtensionX", y: "leftExtensionY" } as const;
    case "platform":
      return { x: "platformX", y: "platformY" } as const;
  }
}

function getPartPosition(partId: DemoPartId, transforms: PartTransforms): [number, number, number] {
  const base = partBasePositions[partId];
  const keys = getPartOffsetKeys(partId);
  return [base.x + transforms[keys.x], base.y + transforms[keys.y], 0];
}

function getViewportPoint(worldPoint: THREE.Vector3, camera: THREE.Camera): HandPointer {
  const projected = worldPoint.clone().project(camera);
  return {
    x: (projected.x + 1) / 2,
    y: (1 - projected.y) / 2,
  };
}

function rotateAroundCenter(
  point: { x: number; y: number },
  center: { x: number; y: number },
  angle: number
) {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

function getPartHandlePoints(
  partId: DemoPartId,
  transforms: PartTransforms,
  scales: PartScales,
  rotations: PartRotations
): HandlePoint[] {
  const [centerX, centerY] = getPartPosition(partId, transforms);
  const baseSize = partBaseSizes[partId];
  const scale = scales[partId];
  const rotation = rotations[partId];
  const halfWidth = (baseSize.width * scale) / 2;
  const halfHeight = (baseSize.height * scale) / 2;
  const center = { x: centerX, y: centerY };

  return [
    { handle: "left" as const, point: { x: centerX - halfWidth, y: centerY } },
    { handle: "right" as const, point: { x: centerX + halfWidth, y: centerY } },
    { handle: "top" as const, point: { x: centerX, y: centerY + halfHeight } },
    { handle: "bottom" as const, point: { x: centerX, y: centerY - halfHeight } },
  ].map(({ handle, point }) => {
    const rotated = rotateAroundCenter(point, center, rotation);
    return {
      partId,
      handle,
      position: new THREE.Vector3(rotated.x, rotated.y, 0),
      center,
    };
  });
}

function getPartRotationHandlePoint(
  partId: DemoPartId,
  transforms: PartTransforms,
  scales: PartScales,
  rotations: PartRotations
): RotationHandlePoint {
  const [centerX, centerY] = getPartPosition(partId, transforms);
  const baseSize = partBaseSizes[partId];
  const scale = scales[partId];
  const center = { x: centerX, y: centerY };
  const unrotatedPoint = {
    x: centerX,
    y: centerY + (baseSize.height * scale) / 2 + ROTATION_HANDLE_DISTANCE,
  };
  const rotated = rotateAroundCenter(unrotatedPoint, center, rotations[partId]);

  return {
    partId,
    center,
    position: new THREE.Vector3(rotated.x, rotated.y, 0),
  };
}

function getPartColors(
  partId: DemoPartId,
  state: {
    isHovered: boolean;
    isSelected: boolean;
    isFocused: boolean;
  }
) {
  const defaults: Record<DemoPartId, { fill: string; edge: string }> = {
    mainBody: { fill: "#6366f1", edge: "#818cf8" },
    topNotch: { fill: "#8b5cf6", edge: "#a78bfa" },
    leftExtension: { fill: "#7c3aed", edge: "#a78bfa" },
    platform: { fill: "#1e1b4b", edge: "#6366f1" },
  };

  if (state.isFocused) {
    return { fill: "#ec4899", edge: "#f9a8d4", emissive: "#881337" };
  }

  if (state.isSelected) {
    return { fill: "#a78bfa", edge: "#f5d0fe", emissive: "#5b21b6" };
  }

  if (state.isHovered) {
    return { fill: "#8b5cf6", edge: "#ddd6fe", emissive: "#4c1d95" };
  }

  return {
    fill: defaults[partId].fill,
    edge: defaults[partId].edge,
    emissive: "#000000",
  };
}

export default function ObjectScene() {
  const dragRef = useRef<DragState | null>(null);
  const gestureDragRef = useRef<DragState | null>(null);
  const gestureScaleRef = useRef<ScaleState | null>(null);
  const gestureRotationRef = useRef<RotationState | null>(null);
  const gestureHoverRef = useRef<DemoPartId | null>(null);
  const snappedPointerRef = useRef<HandPointer | null>(null);
  const partTransformsRef = useRef<PartTransforms>({
    mainBodyX: 0,
    mainBodyY: 0,
    topNotchX: 0,
    leftExtensionX: 0,
    leftExtensionY: 0,
    topNotchY: 0,
    platformX: 0,
    platformY: 0,
  });
  const partScalesRef = useRef<PartScales>({
    mainBody: 1,
    topNotch: 1,
    leftExtension: 1,
    platform: 1,
  });
  const partRotationsRef = useRef<PartRotations>({
    mainBody: 0,
    topNotch: 0,
    leftExtension: 0,
    platform: 0,
  });
  const raycasterRef = useRef(new THREE.Raycaster());
  const dragPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const mainBodyRef = useRef<THREE.Mesh>(null);
  const topNotchRef = useRef<THREE.Mesh>(null);
  const leftExtensionRef = useRef<THREE.Mesh>(null);
  const platformRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const {
    activeTool,
    lessonPhase,
    expertGesture,
    expertPointer,
    learnerGesture,
    learnerPointer,
    hoveredObjectId,
    selectedObjectId,
    focusTarget,
    interactionMode,
    partTransforms,
    partScales,
    partRotations,
    selectObject,
    setHoveredObjectId,
    setGesturePointerOverride,
    setInteractionMode,
    setPartScales,
    setPartTransforms,
    setPartRotations,
  } = useSessionStore();

  const activeGesture = lessonPhase === "walkthrough" ? learnerGesture : expertGesture;
  const activePointer = lessonPhase === "walkthrough" ? learnerPointer : expertPointer;

  useEffect(() => {
    partTransformsRef.current = partTransforms;
  }, [partTransforms]);

  useEffect(() => {
    partScalesRef.current = partScales;
  }, [partScales]);

  useEffect(() => {
    partRotationsRef.current = partRotations;
  }, [partRotations]);

  const isFocusPart = (partId: DemoPartId) =>
    focusTarget?.kind === "part" && focusTarget.partId === partId;

  const handlePointerOver = (event: ThreeEvent<PointerEvent>, partId: DemoPartId) => {
    if (activeTool !== "select" || lessonPhase === "walkthrough") return;
    event.stopPropagation();
    setHoveredObjectId(partId);
  };

  const handlePointerOut = (event: ThreeEvent<PointerEvent>, partId: DemoPartId) => {
    if (activeTool !== "select" || lessonPhase === "walkthrough") return;
    event.stopPropagation();
    if (hoveredObjectId === partId) {
      setHoveredObjectId(null);
    }
  };

  const beginPartDrag = (event: ThreeEvent<PointerEvent>, partId: DemoPartId) => {
    const pointerTarget = event.target as
      | (EventTarget & {
          setPointerCapture?: (pointerId: number) => void;
        })
      | null;

    dragRef.current = {
      partId,
      startPointer: { x: event.point.x, y: event.point.y },
      startTransforms: partTransforms,
    };
    selectObject(partId);
    setInteractionMode("dragging_object");
    pointerTarget?.setPointerCapture?.(event.pointerId);
  };

  const handlePointerDown = (event: ThreeEvent<PointerEvent>, partId: DemoPartId) => {
    if (activeTool !== "select" || lessonPhase === "walkthrough") return;
    event.stopPropagation();
    beginPartDrag(event, partId);
  };

  const applyPartDrag = (partId: DemoPartId, dragState: DragState, pointer: { x: number; y: number }) => {
    const keys = getPartOffsetKeys(partId);
    const bounds = partBounds[partId];
    const nextX = clamp(
      dragState.startTransforms[keys.x] + (pointer.x - dragState.startPointer.x),
      bounds.minX,
      bounds.maxX
    );
    const nextY = clamp(
      dragState.startTransforms[keys.y] + (pointer.y - dragState.startPointer.y),
      bounds.minY,
      bounds.maxY
    );
    const roundedX = Number(nextX.toFixed(3));
    const roundedY = Number(nextY.toFixed(3));
    const currentTransforms = partTransformsRef.current;

    if (currentTransforms[keys.x] === roundedX && currentTransforms[keys.y] === roundedY) {
      return;
    }

    setPartTransforms({
      [keys.x]: roundedX,
      [keys.y]: roundedY,
    });
  };

  const syncSnappedPointer = (pointer: HandPointer | null) => {
    const current = snappedPointerRef.current;
    if (
      current &&
      pointer &&
      Math.abs(current.x - pointer.x) < 0.001 &&
      Math.abs(current.y - pointer.y) < 0.001
    ) {
      return;
    }

    if (!current && !pointer) return;

    snappedPointerRef.current = pointer;
    setGesturePointerOverride(pointer);
  };

  const applyPartScale = (partId: DemoPartId, nextScale: number) => {
    const roundedScale = Number(clamp(nextScale, SCALE_MIN, SCALE_MAX).toFixed(3));
    if (partScalesRef.current[partId] === roundedScale) return;
    setPartScales({ [partId]: roundedScale });
  };

  const applyPartRotation = (partId: DemoPartId, nextRotation: number) => {
    const boundedRotation = clamp(nextRotation, -Math.PI, Math.PI);
    const roundedRotation = Number(boundedRotation.toFixed(3));
    if (partRotationsRef.current[partId] === roundedRotation) return;
    setPartRotations({ [partId]: roundedRotation });
  };

  const applyGestureScale = (scaleState: ScaleState, pointer: { x: number; y: number }) => {
    const currentDistance =
      scaleState.handle === "left" || scaleState.handle === "right"
        ? Math.abs(pointer.x - scaleState.center.x)
        : Math.abs(pointer.y - scaleState.center.y);
    const distanceRatio = Math.max(0.25, currentDistance / scaleState.startDistance);
    applyPartScale(scaleState.partId, scaleState.startScale * distanceRatio);
  };

  const applyGestureRotation = (
    rotationState: RotationState,
    pointer: { x: number; y: number }
  ) => {
    const currentAngle = Math.atan2(
      pointer.y - rotationState.center.y,
      pointer.x - rotationState.center.x
    );
    applyPartRotation(
      rotationState.partId,
      rotationState.startRotation + (currentAngle - rotationState.startAngle)
    );
  };

  const handlePartMove = (event: ThreeEvent<PointerEvent>, partId: DemoPartId) => {
    if (interactionMode !== "dragging_object" || dragRef.current?.partId !== partId) return;
    event.stopPropagation();
    const dragState = dragRef.current;
    if (!dragState) return;
    applyPartDrag(partId, dragState, event.point);
  };

  const finishPartDrag = (event: ThreeEvent<PointerEvent>, partId: DemoPartId) => {
    const pointerTarget = event.target as
      | (EventTarget & {
          releasePointerCapture?: (pointerId: number) => void;
        })
      | null;
    if (interactionMode !== "dragging_object" || dragRef.current?.partId !== partId) return;
    event.stopPropagation();
    dragRef.current = null;
    setInteractionMode("idle");
    pointerTarget?.releasePointerCapture?.(event.pointerId);
  };

  useEffect(() => {
    const syncHoveredPart = (partId: DemoPartId | null) => {
      if (gestureHoverRef.current === partId) return;
      gestureHoverRef.current = partId;
      setHoveredObjectId(partId);
    };

    const finishGestureInteraction = () => {
      const hadInteraction = Boolean(
        gestureDragRef.current || gestureScaleRef.current || gestureRotationRef.current
      );
      gestureDragRef.current = null;
      gestureScaleRef.current = null;
      gestureRotationRef.current = null;
      if (!hadInteraction) return;
      setInteractionMode("idle");
    };

    if (activeTool !== "gesture") {
      syncHoveredPart(null);
      syncSnappedPointer(null);
      finishGestureInteraction();
      return;
    }

    if (activeGesture !== "pinch") {
      syncSnappedPointer(null);
      finishGestureInteraction();
    }

    if (!activePointer) {
      if (!gestureDragRef.current && !gestureScaleRef.current && !gestureRotationRef.current) {
        syncHoveredPart(null);
      }
      syncSnappedPointer(null);
      return;
    }

    const parts = [
      mainBodyRef.current,
      topNotchRef.current,
      leftExtensionRef.current,
      platformRef.current,
    ].filter((mesh): mesh is THREE.Mesh => Boolean(mesh));
    if (parts.length === 0) return;

    const pointer = new THREE.Vector2(activePointer.x * 2 - 1, 1 - activePointer.y * 2);
    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(pointer, camera);

    const planePoint = raycaster.ray.intersectPlane(
      dragPlaneRef.current,
      new THREE.Vector3()
    );

    const hit = raycaster.intersectObjects(parts, true)[0];
    let hitPartId: DemoPartId | null = null;
    let hitObject: THREE.Object3D | null = hit?.object ?? null;

    while (hitObject) {
      const partId = hitObject.userData.partId as DemoPartId | undefined;
      if (partId) {
        hitPartId = partId;
        break;
      }
      hitObject = hitObject.parent;
    }

    const handlePoints = partIds.flatMap((partId) =>
      getPartHandlePoints(
        partId,
        partTransformsRef.current,
        partScalesRef.current,
        partRotationsRef.current
      )
    );
    const rotationHandles = partIds.map((partId) =>
      getPartRotationHandlePoint(
        partId,
        partTransformsRef.current,
        partScalesRef.current,
        partRotationsRef.current
      )
    );
    const nearestHandle =
      planePoint &&
      handlePoints.reduce<{ item: HandlePoint | null; distance: number }>(
        (best, handlePoint) => {
          const distance = Math.hypot(
            planePoint.x - handlePoint.position.x,
            planePoint.y - handlePoint.position.y
          );
          return distance < best.distance ? { item: handlePoint, distance } : best;
        },
        { item: null, distance: Number.POSITIVE_INFINITY }
      );
    const snappedHandle =
      nearestHandle && nearestHandle.item && nearestHandle.distance <= HANDLE_SNAP_DISTANCE
        ? nearestHandle.item
        : null;
    const nearestRotationHandle =
      planePoint &&
      rotationHandles.reduce<{ item: RotationHandlePoint | null; distance: number }>(
        (best, handlePoint) => {
          const distance = Math.hypot(
            planePoint.x - handlePoint.position.x,
            planePoint.y - handlePoint.position.y
          );
          return distance < best.distance ? { item: handlePoint, distance } : best;
        },
        { item: null, distance: Number.POSITIVE_INFINITY }
      );
    const snappedRotationHandle =
      nearestRotationHandle &&
      nearestRotationHandle.item &&
      nearestRotationHandle.distance <= HANDLE_SNAP_DISTANCE
        ? nearestRotationHandle.item
        : null;

    if (gestureRotationRef.current) {
      const activeHandle = getPartRotationHandlePoint(
        gestureRotationRef.current.partId,
        partTransformsRef.current,
        partScalesRef.current,
        partRotationsRef.current
      );
      syncSnappedPointer(getViewportPoint(activeHandle.position, camera));
    } else if (gestureScaleRef.current) {
      const activeHandle = getPartHandlePoints(
        gestureScaleRef.current.partId,
        partTransformsRef.current,
        partScalesRef.current,
        partRotationsRef.current
      ).find((handlePoint) => handlePoint.handle === gestureScaleRef.current?.handle);
      syncSnappedPointer(
        activeHandle ? getViewportPoint(activeHandle.position, camera) : null
      );
    } else if (snappedRotationHandle) {
      syncHoveredPart(snappedRotationHandle.partId);
      syncSnappedPointer(getViewportPoint(snappedRotationHandle.position, camera));
    } else if (snappedHandle) {
      syncHoveredPart(snappedHandle.partId);
      syncSnappedPointer(getViewportPoint(snappedHandle.position, camera));
    } else {
      syncSnappedPointer(null);
    }

    if (!gestureDragRef.current && !gestureScaleRef.current && !gestureRotationRef.current) {
      syncHoveredPart(snappedRotationHandle?.partId ?? snappedHandle?.partId ?? hitPartId);
    }

    if (
      !gestureDragRef.current &&
      !gestureScaleRef.current &&
      !gestureRotationRef.current &&
      activeGesture === "pinch" &&
      snappedRotationHandle &&
      planePoint
    ) {
      gestureRotationRef.current = {
        partId: snappedRotationHandle.partId,
        center: snappedRotationHandle.center,
        startAngle: Math.atan2(
          planePoint.y - snappedRotationHandle.center.y,
          planePoint.x - snappedRotationHandle.center.x
        ),
        startRotation: partRotationsRef.current[snappedRotationHandle.partId],
      };
      selectObject(snappedRotationHandle.partId);
      setInteractionMode("dragging_object");
      return;
    }

    if (
      !gestureDragRef.current &&
      !gestureScaleRef.current &&
      !gestureRotationRef.current &&
      activeGesture === "pinch" &&
      snappedHandle &&
      planePoint
    ) {
      const startDistance =
        snappedHandle.handle === "left" || snappedHandle.handle === "right"
          ? Math.abs(planePoint.x - snappedHandle.center.x)
          : Math.abs(planePoint.y - snappedHandle.center.y);
      gestureScaleRef.current = {
        partId: snappedHandle.partId,
        handle: snappedHandle.handle,
        center: snappedHandle.center,
        startDistance: Math.max(0.18, startDistance),
        startScale: partScalesRef.current[snappedHandle.partId],
      };
      selectObject(snappedHandle.partId);
      setInteractionMode("dragging_object");
      return;
    }

    if (
      !gestureDragRef.current &&
      !gestureScaleRef.current &&
      !gestureRotationRef.current &&
      activeGesture === "pinch" &&
      hitPartId &&
      planePoint
    ) {
      gestureDragRef.current = {
        partId: hitPartId,
        startPointer: { x: planePoint.x, y: planePoint.y },
        startTransforms: partTransformsRef.current,
      };
      selectObject(hitPartId);
      setInteractionMode("dragging_object");
      return;
    }

    if (gestureRotationRef.current && activeGesture === "pinch" && planePoint) {
      applyGestureRotation(gestureRotationRef.current, { x: planePoint.x, y: planePoint.y });
      return;
    }

    if (gestureScaleRef.current && activeGesture === "pinch" && planePoint) {
      applyGestureScale(gestureScaleRef.current, { x: planePoint.x, y: planePoint.y });
      return;
    }

    if (gestureDragRef.current && activeGesture === "pinch" && planePoint) {
      applyPartDrag(
        gestureDragRef.current.partId,
        gestureDragRef.current,
        { x: planePoint.x, y: planePoint.y }
      );
    }
  }, [
    activeTool,
    activeGesture,
    activePointer,
    camera,
    lessonPhase,
    selectObject,
    setHoveredObjectId,
    setGesturePointerOverride,
    setInteractionMode,
    setPartRotations,
    setPartScales,
    setPartTransforms,
  ]);

  const mainBodyColors = getPartColors("mainBody", {
    isHovered: hoveredObjectId === "mainBody",
    isSelected: selectedObjectId === "mainBody",
    isFocused: isFocusPart("mainBody"),
  });
  const topNotchColors = getPartColors("topNotch", {
    isHovered: hoveredObjectId === "topNotch",
    isSelected: selectedObjectId === "topNotch",
    isFocused: isFocusPart("topNotch"),
  });
  const leftExtensionColors = getPartColors("leftExtension", {
    isHovered: hoveredObjectId === "leftExtension",
    isSelected: selectedObjectId === "leftExtension",
    isFocused: isFocusPart("leftExtension"),
  });
  const platformColors = getPartColors("platform", {
    isHovered: hoveredObjectId === "platform",
    isSelected: selectedObjectId === "platform",
    isFocused: isFocusPart("platform"),
  });

  return (
    <group>
      {/* Main body */}
      <RoundedBox
        ref={mainBodyRef}
        args={[2, 1.2, 1.4]}
        radius={0.12}
        userData={{ partId: "mainBody" }}
        position={getPartPosition("mainBody", partTransforms)}
        scale={partScales.mainBody * (selectedObjectId === "mainBody" ? 1.03 : 1)}
        rotation={[0, 0, partRotations.mainBody]}
        onPointerOver={(event) => handlePointerOver(event, "mainBody")}
        onPointerOut={(event) => handlePointerOut(event, "mainBody")}
        onPointerDown={(event) => handlePointerDown(event, "mainBody")}
        onPointerMove={(event) => handlePartMove(event, "mainBody")}
        onPointerUp={(event) => finishPartDrag(event, "mainBody")}
      >
        <meshStandardMaterial
          color={mainBodyColors.fill}
          roughness={0.3}
          metalness={0.4}
          emissive={mainBodyColors.emissive}
          emissiveIntensity={isFocusPart("mainBody") ? 0.7 : 0.25}
        />
        <Edges threshold={15} color={mainBodyColors.edge} lineWidth={1} />
      </RoundedBox>

      {/* Top notch — simulates a feature to bevel/edit */}
      <RoundedBox
        ref={topNotchRef}
        args={[0.8, 0.5, 1.0]}
        radius={0.08}
        userData={{ partId: "topNotch" }}
        position={getPartPosition("topNotch", partTransforms)}
        scale={partScales.topNotch * (selectedObjectId === "topNotch" ? 1.05 : 1)}
        rotation={[0, 0, partRotations.topNotch]}
        onPointerOver={(event) => handlePointerOver(event, "topNotch")}
        onPointerOut={(event) => handlePointerOut(event, "topNotch")}
        onPointerDown={(event) => handlePointerDown(event, "topNotch")}
        onPointerMove={(event) => handlePartMove(event, "topNotch")}
        onPointerUp={(event) => finishPartDrag(event, "topNotch")}
      >
        <meshStandardMaterial
          color={topNotchColors.fill}
          roughness={0.35}
          metalness={0.3}
          emissive={topNotchColors.emissive}
          emissiveIntensity={isFocusPart("topNotch") ? 0.7 : 0.25}
        />
        <Edges threshold={15} color={topNotchColors.edge} lineWidth={1} />
      </RoundedBox>

      {/* Left extension — simulates a part to stretch/drag */}
      <RoundedBox
        ref={leftExtensionRef}
        args={[0.6, 0.6, 0.8]}
        radius={0.06}
        userData={{ partId: "leftExtension" }}
        position={getPartPosition("leftExtension", partTransforms)}
        scale={partScales.leftExtension * (selectedObjectId === "leftExtension" ? 1.07 : 1)}
        rotation={[0, 0, partRotations.leftExtension]}
        onPointerOver={(event) => handlePointerOver(event, "leftExtension")}
        onPointerOut={(event) => handlePointerOut(event, "leftExtension")}
        onPointerDown={(event) => handlePointerDown(event, "leftExtension")}
        onPointerMove={(event) => handlePartMove(event, "leftExtension")}
        onPointerUp={(event) => finishPartDrag(event, "leftExtension")}
      >
        <meshStandardMaterial
          color={leftExtensionColors.fill}
          roughness={0.4}
          metalness={0.35}
          emissive={leftExtensionColors.emissive}
          emissiveIntensity={isFocusPart("leftExtension") ? 0.7 : 0.25}
        />
        <Edges threshold={15} color={leftExtensionColors.edge} lineWidth={1} />
      </RoundedBox>

      {/* Bottom platform */}
      <mesh
        ref={platformRef}
        userData={{ partId: "platform" }}
        position={getPartPosition("platform", partTransforms)}
        scale={partScales.platform * (selectedObjectId === "platform" ? 1.02 : 1)}
        rotation={[0, 0, partRotations.platform]}
        onPointerOver={(event) => handlePointerOver(event, "platform")}
        onPointerOut={(event) => handlePointerOut(event, "platform")}
        onPointerDown={(event) => handlePointerDown(event, "platform")}
        onPointerMove={(event) => handlePartMove(event, "platform")}
        onPointerUp={(event) => finishPartDrag(event, "platform")}
      >
        <boxGeometry args={[4.8, 0.1, 3.2]} />
        <meshStandardMaterial
          color={platformColors.fill}
          roughness={0.8}
          metalness={0.1}
          transparent
          opacity={0.5}
          emissive={platformColors.emissive}
          emissiveIntensity={isFocusPart("platform") ? 0.5 : 0.2}
        />
      </mesh>
      {activeTool === "gesture" &&
        partIds.flatMap((partId) =>
          getPartHandlePoints(partId, partTransforms, partScales, partRotations)
            .filter(
              (handlePoint) =>
                hoveredObjectId === partId ||
                selectedObjectId === partId ||
                gestureScaleRef.current?.partId === partId ||
                gestureRotationRef.current?.partId === partId
            )
            .map((handlePoint) => (
              <mesh
                key={`${partId}-${handlePoint.handle}`}
                position={handlePoint.position}
                scale={
                  gestureScaleRef.current?.partId === partId &&
                  gestureScaleRef.current?.handle === handlePoint.handle
                    ? 1.25
                    : 1
                }
              >
                <sphereGeometry args={[HANDLE_RENDER_RADIUS, 18, 18]} />
                <meshStandardMaterial
                  color={
                    gestureScaleRef.current?.partId === partId &&
                    gestureScaleRef.current?.handle === handlePoint.handle
                      ? "#f9a8d4"
                      : "#f472b6"
                  }
                  emissive="#be185d"
                  emissiveIntensity={0.9}
                />
              </mesh>
            ))
        )}
      {activeTool === "gesture" &&
        partIds
          .map((partId) =>
            getPartRotationHandlePoint(
              partId,
              partTransforms,
              partScales,
              partRotations
            )
          )
          .filter(
            (handlePoint) =>
              hoveredObjectId === handlePoint.partId ||
              selectedObjectId === handlePoint.partId ||
              gestureRotationRef.current?.partId === handlePoint.partId
          )
          .map((handlePoint) => (
            <mesh
              key={`${handlePoint.partId}-rotation`}
              position={handlePoint.position}
              scale={gestureRotationRef.current?.partId === handlePoint.partId ? 1.2 : 1}
            >
              <torusGeometry args={[0.08, 0.02, 14, 28]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0369a1" emissiveIntensity={0.8} />
            </mesh>
          ))}
    </group>
  );
}
