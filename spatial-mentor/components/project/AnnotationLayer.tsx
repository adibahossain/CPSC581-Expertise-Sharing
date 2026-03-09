"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useSessionStore } from "@/lib/store/useSessionStore";
import type { Annotation, Point } from "@/types";
import { demoPartLabels } from "@/lib/project/demoParts";

type ViewportSize = {
  width: number;
  height: number;
};

type DragState = {
  annotationId: string;
  startPointer: Point;
  original: Annotation;
  currentPointer: Point;
};

type TextEditorState = {
  position: Point;
  annotationId?: string;
  value: string;
} | null;

type Bounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }

  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + r, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
}

function toAbsolutePoint(point: Point, size: ViewportSize) {
  return {
    x: point.x * size.width,
    y: point.y * size.height,
  };
}

function translatePoint(point: Point, dx: number, dy: number): Point {
  return {
    x: Math.max(0, Math.min(1, point.x + dx)),
    y: Math.max(0, Math.min(1, point.y + dy)),
  };
}

function translateAnnotation(annotation: Annotation, dx: number, dy: number): Annotation {
  return {
    ...annotation,
    position: annotation.position
      ? translatePoint(annotation.position, dx, dy)
      : annotation.position,
    start: annotation.start ? translatePoint(annotation.start, dx, dy) : annotation.start,
    end: annotation.end ? translatePoint(annotation.end, dx, dy) : annotation.end,
    points: annotation.points?.map((point) => translatePoint(point, dx, dy)),
    anchorPartId: undefined,
    anchorLabel: undefined,
  };
}

function getTextWidth(annotation: Annotation) {
  return Math.max(52, (annotation.text?.length ?? 0) * 7 + 12);
}

function getAnnotationBounds(annotation: Annotation, size: ViewportSize): Bounds {
  if (annotation.type === "marker" && annotation.position) {
    const point = toAbsolutePoint(annotation.position, size);
    return {
      left: point.x - 14,
      top: point.y - 14,
      width: 28,
      height: 28,
    };
  }

  if (annotation.type === "focus" && annotation.position) {
    const point = toAbsolutePoint(annotation.position, size);
    return {
      left: point.x - 48,
      top: point.y - 48,
      width: 96,
      height: 96,
    };
  }

  if (annotation.type === "text" && annotation.position) {
    const point = toAbsolutePoint(annotation.position, size);
    const width = getTextWidth(annotation);
    return {
      left: point.x - 4,
      top: point.y - 22,
      width,
      height: 24,
    };
  }

  if (annotation.type === "arrow" && annotation.start && annotation.end) {
    const start = toAbsolutePoint(annotation.start, size);
    const end = toAbsolutePoint(annotation.end, size);
    return {
      left: Math.min(start.x, end.x) - 14,
      top: Math.min(start.y, end.y) - 14,
      width: Math.abs(end.x - start.x) + 28,
      height: Math.abs(end.y - start.y) + 28,
    };
  }

  if (annotation.type === "draw" && annotation.points?.length) {
    const xs = annotation.points.map((point) => point.x * size.width);
    const ys = annotation.points.map((point) => point.y * size.height);
    return {
      left: Math.min(...xs) - 14,
      top: Math.min(...ys) - 14,
      width: Math.max(...xs) - Math.min(...xs) + 28,
      height: Math.max(...ys) - Math.min(...ys) + 28,
    };
  }

  return { left: 0, top: 0, width: 0, height: 0 };
}

function getAnnotationAnchorPoint(annotation: Annotation): Point | null {
  if (annotation.position) return annotation.position;
  if (annotation.type === "arrow" && annotation.start && annotation.end) {
    return {
      x: (annotation.start.x + annotation.end.x) / 2,
      y: (annotation.start.y + annotation.end.y) / 2,
    };
  }
  if (annotation.points?.length) {
    const first = annotation.points[0];
    const last = annotation.points[annotation.points.length - 1];
    return {
      x: (first.x + last.x) / 2,
      y: (first.y + last.y) / 2,
    };
  }
  return null;
}

export default function AnnotationLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    annotations,
    activeTool,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    role,
    selectedAnnotationId,
    selectAnnotation,
    clearAnnotationSelection,
    setInteractionMode,
    interactionMode,
    selectedObjectId,
    lessonPhase,
  } = useSessionStore();

  const [viewportSize, setViewportSize] = useState<ViewportSize>({
    width: 0,
    height: 0,
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [textEditor, setTextEditor] = useState<TextEditorState>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const isAnnotationTool = Boolean(
    lessonPhase !== "walkthrough" &&
      activeTool &&
      activeTool !== "select" &&
      activeTool !== "gesture"
  );

  const getRelativePosFromClient = useCallback((clientX: number, clientY: number): Point => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  }, []);

  const createAnnotation = useCallback(
    (partial: Omit<Annotation, "id" | "createdBy" | "createdAt" | "color">) => {
      const annotation: Annotation = {
        ...partial,
        id: crypto.randomUUID(),
        color: "#ec4899",
        createdBy: role || "expert",
        createdAt: Date.now(),
        anchorPartId: selectedObjectId ?? partial.anchorPartId,
        anchorLabel:
          selectedObjectId && !partial.anchorLabel
            ? demoPartLabels[selectedObjectId]
            : partial.anchorLabel,
      };
      addAnnotation(annotation);
      selectAnnotation(annotation.id);
      return annotation;
    },
    [addAnnotation, role, selectAnnotation, selectedObjectId]
  );

  const openTextEditor = useCallback(
    (position: Point, annotation?: Annotation) => {
      setTextEditor({
        position,
        annotationId: annotation?.id,
        value: annotation?.text ?? "",
      });
      setInteractionMode("editing_annotation");
    },
    [setInteractionMode]
  );

  const closeTextEditor = useCallback(() => {
    setTextEditor(null);
    setInteractionMode("idle");
  }, [setInteractionMode]);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!activeTool || activeTool === "select" || activeTool === "gesture") return;
      const pos = getRelativePosFromClient(e.clientX, e.clientY);

      if (activeTool === "text") {
        openTextEditor(pos);
        return;
      }
      if (activeTool === "marker") {
        createAnnotation({ type: "marker", position: pos });
        return;
      }
      if (activeTool === "focus") {
        createAnnotation({ type: "focus", position: pos });
        return;
      }

      setInteractionMode("placing_annotation");
      setIsDrawing(true);
      setStartPoint(pos);
      if (activeTool === "draw") {
        setCurrentPoints([pos]);
      }
    },
    [activeTool, getRelativePosFromClient, createAnnotation, openTextEditor, setInteractionMode]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const pos = getRelativePosFromClient(e.clientX, e.clientY);
      if (activeTool === "draw") {
        setCurrentPoints((prev) => [...prev, pos]);
      }
    },
    [isDrawing, activeTool, getRelativePosFromClient]
  );

  const handleCanvasMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing) return;
      const endPos = getRelativePosFromClient(e.clientX, e.clientY);
      setIsDrawing(false);
      setInteractionMode("idle");

      if (activeTool === "draw" && currentPoints.length > 1) {
        createAnnotation({ type: "draw", points: currentPoints });
      } else if (activeTool === "arrow" && startPoint) {
        createAnnotation({ type: "arrow", start: startPoint, end: endPos });
      }

      setCurrentPoints([]);
      setStartPoint(null);
    },
    [
      isDrawing,
      activeTool,
      currentPoints,
      startPoint,
      getRelativePosFromClient,
      createAnnotation,
      setInteractionMode,
    ]
  );

  const handleTextSubmit = useCallback(() => {
    if (!textEditor) return;
    const value = textEditor.value.trim();
    if (!value) {
      closeTextEditor();
      return;
    }

    if (textEditor.annotationId) {
      updateAnnotation(textEditor.annotationId, (annotation) => ({
        ...annotation,
        text: value,
        position: textEditor.position,
      }));
      selectAnnotation(textEditor.annotationId);
    } else {
      createAnnotation({
        type: "text",
        position: textEditor.position,
        text: value,
      });
    }

    closeTextEditor();
  }, [textEditor, closeTextEditor, createAnnotation, selectAnnotation, updateAnnotation]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const renderedAnnotations = annotations.map((annotation) => {
    if (!dragState || dragState.annotationId !== annotation.id) {
      return annotation;
    }

    const dx = dragState.currentPointer.x - dragState.startPointer.x;
    const dy = dragState.currentPointer.y - dragState.startPointer.y;
    return translateAnnotation(dragState.original, dx, dy);
  });

  const selectedAnnotation = renderedAnnotations.find(
    (annotation) => annotation.id === selectedAnnotationId
  );
  const selectedBounds =
    selectedAnnotation && viewportSize.width > 0
      ? getAnnotationBounds(selectedAnnotation, viewportSize)
      : null;

  const beginAnnotationDrag = useCallback(
    (annotationId: string, clientX: number, clientY: number) => {
      const annotation = annotations.find((item) => item.id === annotationId);
      if (!annotation) return;

      selectAnnotation(annotationId);
      setDragState({
        annotationId,
        startPointer: getRelativePosFromClient(clientX, clientY),
        original: annotation,
        currentPointer: getRelativePosFromClient(clientX, clientY),
      });
      setInteractionMode("dragging_annotation");
    },
    [annotations, getRelativePosFromClient, selectAnnotation, setInteractionMode]
  );

  const updateAnnotationDrag = useCallback(
    (annotationId: string, clientX: number, clientY: number) => {
      setDragState((current) => {
        if (!current || current.annotationId !== annotationId) return current;
        return {
          ...current,
          currentPointer: getRelativePosFromClient(clientX, clientY),
        };
      });
    },
    [getRelativePosFromClient]
  );

  const commitAnnotationDrag = useCallback(
    (annotationId: string) => {
      if (!dragState || dragState.annotationId !== annotationId) return;

      const dx = dragState.currentPointer.x - dragState.startPointer.x;
      const dy = dragState.currentPointer.y - dragState.startPointer.y;
      updateAnnotation(annotationId, translateAnnotation(dragState.original, dx, dy));
      setDragState(null);
      setInteractionMode("idle");
    },
    [dragState, setInteractionMode, updateAnnotation]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (textEditor) {
          closeTextEditor();
        }
        if (dragState) {
          setDragState(null);
          setInteractionMode("idle");
        }
        return;
      }

      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        activeTool === "select" &&
        selectedAnnotationId &&
        !(event.target instanceof HTMLInputElement)
      ) {
        event.preventDefault();
        removeAnnotation(selectedAnnotationId);
        clearAnnotationSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeTool,
    clearAnnotationSelection,
    closeTextEditor,
    dragState,
    removeAnnotation,
    selectedAnnotationId,
    setInteractionMode,
    textEditor,
  ]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = viewportSize;
    if (!width || !height) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.clearRect(0, 0, width, height);

    for (const ann of renderedAnnotations) {
      ctx.save();
      const isSelected = ann.id === selectedAnnotationId;

      if (ann.type === "draw" && ann.points && ann.points.length > 1) {
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = isSelected ? 4 : 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        const first = toAbsolutePoint(ann.points[0], viewportSize);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < ann.points.length; i++) {
          const p = toAbsolutePoint(ann.points[i], viewportSize);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      if (ann.type === "arrow" && ann.start && ann.end) {
        const s = toAbsolutePoint(ann.start, viewportSize);
        const e = toAbsolutePoint(ann.end, viewportSize);
        ctx.strokeStyle = ann.color;
        ctx.fillStyle = ann.color;
        ctx.lineWidth = isSelected ? 4 : 3;
        ctx.lineCap = "round";

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(e.x, e.y);
        ctx.stroke();

        const angle = Math.atan2(e.y - s.y, e.x - s.x);
        const headLen = 14;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(
          e.x - headLen * Math.cos(angle - Math.PI / 6),
          e.y - headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          e.x - headLen * Math.cos(angle + Math.PI / 6),
          e.y - headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      }

      if (ann.type === "marker" && ann.position) {
        const p = toAbsolutePoint(ann.position, viewportSize);
        ctx.fillStyle = ann.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, isSelected ? 10 : 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (ann.type === "focus" && ann.position) {
        const p = toAbsolutePoint(ann.position, viewportSize);
        const r = isSelected ? 44 : 40;
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = isSelected ? 4 : 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = `${ann.color}15`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (ann.type === "text" && ann.position && ann.text) {
        const p = toAbsolutePoint(ann.position, viewportSize);
        ctx.font = "13px sans-serif";
        ctx.textBaseline = "middle";
        const metrics = ctx.measureText(ann.text);
        const padding = 6;
        const bgW = metrics.width + padding * 2;
        const bgH = 22;

        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.beginPath();
        drawRoundedRect(ctx, p.x - 2, p.y - bgH + 2, bgW, bgH, 4);
        ctx.fill();

        ctx.fillStyle = ann.color;
        ctx.fillText(ann.text, p.x + padding - 2, p.y - bgH / 2 + 2);
      }

      if (ann.anchorLabel) {
        const anchorPoint = getAnnotationAnchorPoint(ann);
        if (anchorPoint) {
          const anchor = toAbsolutePoint(anchorPoint, viewportSize);
          ctx.fillStyle = "rgba(236, 72, 153, 0.16)";
          ctx.beginPath();
          drawRoundedRect(
            ctx,
            anchor.x - 4,
            anchor.y + 10,
            ann.anchorLabel.length * 6 + 16,
            18,
            6
          );
          ctx.fill();
          ctx.fillStyle = "#f9a8d4";
          ctx.font = "11px sans-serif";
          ctx.fillText(ann.anchorLabel, anchor.x + 4, anchor.y + 19);
        }
      }

      if (isSelected) {
        const bounds = getAnnotationBounds(ann, viewportSize);
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(bounds.left, bounds.top, bounds.width, bounds.height);
        ctx.setLineDash([]);
      }

      ctx.restore();
    }

    // Draw in-progress strokes
    if (isDrawing && activeTool === "draw" && currentPoints.length > 1) {
      ctx.strokeStyle = "#ec4899";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      const first = toAbsolutePoint(currentPoints[0], viewportSize);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < currentPoints.length; i++) {
        const p = toAbsolutePoint(currentPoints[i], viewportSize);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    if (isDrawing && activeTool === "arrow" && startPoint) {
      const s = toAbsolutePoint(startPoint, viewportSize);
      const last = currentPoints.length
        ? toAbsolutePoint(currentPoints[currentPoints.length - 1], viewportSize)
        : s;
      ctx.strokeStyle = "#ec489980";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(last.x, last.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [
    viewportSize,
    renderedAnnotations,
    selectedAnnotationId,
    currentPoints,
    isDrawing,
    activeTool,
    startPoint,
  ]);

  // Track mouse for arrow preview
  const handleMouseMoveForArrow = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      handleCanvasMouseMove(e);
      if (isDrawing && activeTool === "arrow") {
        const pos = getRelativePosFromClient(e.clientX, e.clientY);
        setCurrentPoints([pos]);
      }
    },
    [handleCanvasMouseMove, isDrawing, activeTool, getRelativePosFromClient]
  );

  const cursorStyle =
    activeTool === "draw"
      ? "crosshair"
      : activeTool === "arrow"
        ? "crosshair"
        : activeTool === "gesture"
          ? "none"
        : activeTool === "marker"
          ? "crosshair"
          : activeTool === "text"
            ? "text"
            : activeTool === "focus"
              ? "crosshair"
              : activeTool === "select" && interactionMode === "dragging_annotation"
                ? "grabbing"
                : "default";

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-10">
      <canvas
        ref={canvasRef}
        className="pointer-events-auto absolute inset-0 h-full w-full"
        style={{
          cursor: cursorStyle,
          pointerEvents: isAnnotationTool ? "auto" : "none",
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMoveForArrow}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={() => {
          if (isDrawing) {
            setIsDrawing(false);
            setCurrentPoints([]);
            setStartPoint(null);
            setInteractionMode("idle");
          }
        }}
      />

      {activeTool === "select" &&
        viewportSize.width > 0 &&
        renderedAnnotations.map((annotation) => {
          const bounds = getAnnotationBounds(annotation, viewportSize);
          const annotationLabel =
            annotation.type === "text" && annotation.text
              ? annotation.text
              : `${annotation.type} annotation`;

          return (
            <div
              key={annotation.id}
              className="pointer-events-auto absolute z-20 rounded-md"
              style={{
                left: `${bounds.left}px`,
                top: `${bounds.top}px`,
                width: `${Math.max(bounds.width, 22)}px`,
                height: `${Math.max(bounds.height, 22)}px`,
                cursor:
                  selectedAnnotationId === annotation.id &&
                  interactionMode === "dragging_annotation"
                    ? "grabbing"
                    : "grab",
              }}
              title={annotationLabel}
              onPointerDown={(e) => {
                e.stopPropagation();
                beginAnnotationDrag(annotation.id, e.clientX, e.clientY);
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (dragState?.annotationId !== annotation.id) return;
                updateAnnotationDrag(annotation.id, e.clientX, e.clientY);
              }}
              onPointerUp={(e) => {
                if (dragState?.annotationId !== annotation.id) return;
                e.currentTarget.releasePointerCapture(e.pointerId);
                commitAnnotationDrag(annotation.id);
              }}
            />
          );
        })}

      {activeTool === "select" && selectedAnnotation && selectedBounds && (
        <div
          className="pointer-events-auto absolute z-30 flex gap-1"
          style={{
            left: `${selectedBounds.left}px`,
            top: `${Math.max(selectedBounds.top - 34, 8)}px`,
          }}
        >
          {selectedAnnotation.type === "text" && selectedAnnotation.position && (
            <button
              type="button"
              onClick={() => openTextEditor(selectedAnnotation.position!, selectedAnnotation)}
              className="rounded border border-pink-500/40 bg-black/80 px-2 py-1 text-[11px] text-pink-300 hover:bg-pink-500/10"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              removeAnnotation(selectedAnnotation.id);
              clearAnnotationSelection();
            }}
            className="rounded border border-red-500/40 bg-black/80 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/10"
          >
            Delete
          </button>
        </div>
      )}

      {textEditor && (
        <div
          className="pointer-events-auto absolute z-20"
          style={{
            left: `${textEditor.position.x * 100}%`,
            top: `${textEditor.position.y * 100}%`,
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTextSubmit();
            }}
            className="flex gap-1"
          >
            <input
              autoFocus
              type="text"
              value={textEditor.value}
              onChange={(e) =>
                setTextEditor((current) =>
                  current ? { ...current, value: e.target.value } : current
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  closeTextEditor();
                }
              }}
              placeholder="Type annotation..."
              className="rounded border border-pink-500/50 bg-black/80 px-2 py-1 text-xs text-pink-400 outline-none placeholder:text-pink-400/40"
            />
            <button
              type="submit"
              className="rounded border border-pink-500/40 bg-pink-500/10 px-2 py-1 text-[11px] text-pink-400 hover:bg-pink-500/20"
            >
              Add
            </button>
            <button
              type="button"
              onClick={closeTextEditor}
              className="rounded border border-border bg-black/80 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
