import { useEffect, useRef, useState } from "react";
import type { Sequence } from "../types";
import { fmt } from "../lib/draw";

export function Timeline({ duration, video, sequences, selected, markIn, onSeek, onSelect }: {
  duration: number; video: HTMLVideoElement | null; sequences: Sequence[]; selected: string | null; markIn: number | null;
  onSeek: (t: number) => void; onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const dragging = useRef(false);

  useEffect(() => {
    let raf = 0;
    const loop = () => { setT(video?.currentTime ?? 0); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [video]);

  const pct = (x: number) => `${(100 * x) / Math.max(duration, 0.001)}%`;
  const at = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.max(0, Math.min(duration, ((e.clientX - r.left) / r.width) * duration));
  };
  const step = duration > 3600 ? 600 : duration > 1200 ? 300 : duration > 300 ? 60 : duration > 60 ? 15 : 5;
  const ticks = Array.from({ length: Math.floor(duration / step) + 1 }, (_, i) => i * step);

  return (
    <div className="timeline" ref={ref} role="slider" aria-label="Position dans la vidéo" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(t)}
      tabIndex={0}
      onPointerDown={(e) => { dragging.current = true; (e.target as HTMLElement).setPointerCapture(e.pointerId); onSeek(at(e)); }}
      onPointerMove={(e) => dragging.current && onSeek(at(e))}
      onPointerUp={() => (dragging.current = false)}>
      {ticks.map((x) => <span key={x} className="tick" style={{ left: pct(x) }}>{fmt(x).split(".")[0]}</span>)}
      {sequences.map((s) => (
        <div key={s.id} className={`seg ${s.id === selected ? "sel" : ""}`} style={{ left: pct(s.start), width: `max(4px, ${pct(s.end - s.start)})` }}
          title={s.name} onPointerDown={(e) => { e.stopPropagation(); onSelect(s.id); }} />
      ))}
      {markIn !== null && <div className="markin" style={{ left: pct(markIn) }} />}
      <div className="head" style={{ left: pct(t) }} />
    </div>
  );
}
