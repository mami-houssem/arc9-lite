// Lecteur vidéo + calque de dessin. Le calque est exactement superposé à l'image (hors bandes
// noires) : un dessin fait ici tombe au même endroit dans l'export.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Drawing, Sequence, Tool } from "../types";
import { curveControl, drawCaption, drawOne, hitDistance, visible } from "../lib/draw";
import { uid } from "../lib/db";

export interface StageProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  src: string;
  sequence: Sequence | null;
  tool: Tool | "select";
  style: { color: string; width: number; dashed: boolean; freeze: number };
  selectedDrawing: string | null;
  onSelectDrawing: (id: string | null) => void;
  onAddDrawing: (d: Drawing) => void;
  frozen: boolean;
  showCaption: boolean;
}

export function Stage({ videoRef, src, sequence, tool, style, selectedDrawing, onSelectDrawing, onAddDrawing, frozen, showCaption }: StageProps) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [rect, setRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const draft = useRef<Drawing | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  // zone réellement occupée par l'image dans le cadre (object-fit: contain)
  useLayoutEffect(() => {
    const update = () => {
      const el = box.current;
      const v = videoRef.current;
      if (!el || !v?.videoWidth) return;
      const s = Math.min(el.clientWidth / v.videoWidth, el.clientHeight / v.videoHeight);
      const w = v.videoWidth * s;
      const h = v.videoHeight * s;
      setRect({ x: (el.clientWidth - w) / 2, y: (el.clientHeight - h) / 2, w, h });
    };
    const ro = new ResizeObserver(update);
    if (box.current) ro.observe(box.current);
    const v = videoRef.current;
    v?.addEventListener("loadedmetadata", update);
    update();
    return () => {
      ro.disconnect();
      v?.removeEventListener("loadedmetadata", update);
    };
  }, [videoRef, src]);

  // rendu continu : dessins visibles à l'instant courant + brouillon en cours
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const c = canvas.current;
      const v = videoRef.current;
      if (c && v) {
        const dpr = window.devicePixelRatio || 1;
        const W = Math.round(rect.w * dpr);
        const H = Math.round(rect.h * dpr);
        if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
        const ctx = c.getContext("2d")!;
        ctx.clearRect(0, 0, W, H);
        if (sequence) {
          const t = v.currentTime;
          const inSeq = t >= sequence.start - 0.05 && t <= sequence.end + 0.05;
          // hors lecture, on montre tous les dessins de la séquence pour pouvoir les retoucher
          const shown = inSeq ? (v.paused ? sequence.drawings.filter((d) => d.t <= t + 0.05) : visible(sequence.drawings, t, sequence.start, sequence.end)) : [];
          for (const d of shown) drawOne(ctx, d, W, H, d.id === selectedDrawing);
          if (inSeq && showCaption) drawCaption(ctx, sequence.comment, W, H);
        }
        if (draft.current) drawOne(ctx, draft.current, W, H);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rect, sequence, selectedDrawing, videoRef, showCaption]);

  useEffect(() => {
    if (tool === "select") setHint(null);
    else if (!sequence) setHint("Créez ou choisissez d'abord une séquence pour dessiner");
    else setHint(tool === "text" ? "Touchez l'image à l'endroit du texte" : "Glissez sur l'image pour dessiner");
  }, [tool, sequence]);

  const norm = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  };

  const clampT = () => {
    const t = videoRef.current?.currentTime ?? 0;
    return sequence ? Math.min(sequence.end, Math.max(sequence.start, t)) : t;
  };

  const down = (e: React.PointerEvent) => {
    if (!sequence) return;
    const [x, y] = norm(e);
    if (tool === "select") {
      const r = canvas.current!.getBoundingClientRect();
      const t = videoRef.current?.currentTime ?? 0;
      const cands = sequence.drawings.filter((d) => d.t <= t + 0.05)
        .map((d) => [d, hitDistance(d, x * r.width, y * r.height, r.width, r.height)] as const)
        .sort((a, b) => a[1] - b[1]);
      onSelectDrawing(cands[0] && cands[0][1] < 18 ? cands[0][0].id : null);
      return;
    }
    videoRef.current?.pause();
    if (tool === "text") {
      const text = window.prompt("Texte à afficher :");
      if (text?.trim()) onAddDrawing({ id: uid(), type: "text", points: [x, y], t: clampT(), freeze: style.freeze, color: style.color, width: style.width, dashed: false, text: text.trim() });
      return;
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    draft.current = { id: uid(), type: tool, points: tool === "curve" ? [x, y, x, y, x, y] : [x, y, x, y], t: clampT(), freeze: style.freeze, color: style.color, width: style.width, dashed: style.dashed };
  };

  const move = (e: React.PointerEvent) => {
    const d = draft.current;
    if (!d) return;
    const [x, y] = norm(e);
    if (d.type === "curve") {
      const [cx, cy] = curveControl(d.points[0], d.points[1], x, y);
      d.points = [d.points[0], d.points[1], cx, cy, x, y];
    } else d.points = [d.points[0], d.points[1], x, y];
  };

  const up = () => {
    const d = draft.current;
    draft.current = null;
    if (!d) return;
    const [x1, y1] = d.points;
    const [x2, y2] = d.points.slice(-2);
    if (Math.hypot(x2 - x1, y2 - y1) < 0.01) return; // simple clic : rien
    onAddDrawing(d);
  };

  return (
    <div className="stage" ref={box} data-testid="stage">
      <video ref={videoRef} src={src} playsInline preload="auto" />
      <canvas ref={canvas} style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, cursor: tool === "select" ? "default" : "crosshair" }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} data-testid="draw-layer" />
      {hint && <div className="hint">{hint}</div>}
      {frozen && <div className="freeze-badge">Arrêt sur image</div>}
    </div>
  );
}
