// Rendu des dessins sur un canvas : utilisé à l'écran ET pour l'export MP4,
// pour que la vidéo exportée soit exactement ce qu'on voit.
import type { Drawing } from "../types";

/** Épaisseur en pixels, proportionnelle à la taille de l'image. */
export const strokePx = (d: Drawing, w: number) => Math.max(2, (w / 1280) * (2 + d.width * 2.5));

/** Dessins visibles à l'instant `t` (apparus, dans la séquence). */
export function visible(drawings: Drawing[], t: number, start: number, end: number): Drawing[] {
  return drawings.filter((d) => t >= d.t - 0.02 && t <= end + 0.05 && d.t >= start - 0.05);
}

function arrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size * Math.cos(angle - 0.45), y - size * Math.sin(angle - 0.45));
  ctx.lineTo(x - size * Math.cos(angle + 0.45), y - size * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
}

/** Point de contrôle par défaut d'une courbe : décalé perpendiculairement au milieu. */
export function curveControl(x1: number, y1: number, x2: number, y2: number): [number, number] {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return [mx - (y2 - y1) * 0.3, my + (x2 - x1) * 0.3];
}

export function drawOne(ctx: CanvasRenderingContext2D, d: Drawing, w: number, h: number, highlight = false) {
  const p = d.points.map((v, i) => (i % 2 === 0 ? v * w : v * h));
  const lw = strokePx(d, w);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = d.color;
  ctx.fillStyle = d.color;
  ctx.lineWidth = lw;
  ctx.setLineDash(d.dashed ? [lw * 2.5, lw * 2] : []);
  // contour sombre discret : lisible sur un sol clair comme sur un sol foncé
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = lw * 1.2;
  if (highlight) {
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = lw * 3;
  }
  const head = lw * 4.2;
  switch (d.type) {
    case "arrow":
    case "line": {
      const [x1, y1, x2, y2] = p;
      const a = Math.atan2(y2 - y1, x2 - x1);
      const back = d.type === "arrow" ? head * 0.6 : 0;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2 - back * Math.cos(a), y2 - back * Math.sin(a));
      ctx.stroke();
      ctx.setLineDash([]);
      if (d.type === "arrow") arrowHead(ctx, x2, y2, a, head);
      break;
    }
    case "curve": {
      const [x1, y1, cx, cy, x2, y2] = p;
      const a = Math.atan2(y2 - cy, x2 - cx);
      const back = head * 0.6;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2 - back * Math.cos(a), y2 - back * Math.sin(a));
      ctx.stroke();
      ctx.setLineDash([]);
      arrowHead(ctx, x2, y2, a, head);
      break;
    }
    case "circle": {
      const [x1, y1, x2, y2] = p;
      ctx.beginPath();
      ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2 || 1, Math.abs(y2 - y1) / 2 || 1, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "rect": {
      const [x1, y1, x2, y2] = p;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      ctx.globalAlpha = 1;
      ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      break;
    }
    case "text": {
      const [x, y] = p;
      const size = Math.round((w / 1280) * (22 + d.width * 8));
      ctx.font = `700 ${size}px system-ui, sans-serif`;
      ctx.textBaseline = "middle";
      const tw = ctx.measureText(d.text ?? "").width;
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(x - size * 0.3, y - size * 0.75, tw + size * 0.6, size * 1.5);
      ctx.fillStyle = d.color;
      ctx.fillText(d.text ?? "", x, y);
      break;
    }
  }
  ctx.restore();
}

/** Bandeau de commentaire en bas de l'image (texte sur plusieurs lignes si besoin). */
export function drawCaption(ctx: CanvasRenderingContext2D, text: string, w: number, h: number) {
  if (!text.trim()) return;
  const size = Math.round(Math.max(16, w / 42));
  ctx.save();
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  const maxW = w * 0.9;
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = word;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  const shown = lines.slice(0, 3);
  const lh = size * 1.3;
  const boxH = shown.length * lh + size * 0.8;
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fillRect(0, h - boxH, w, boxH);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  shown.forEach((l, i) => ctx.fillText(l, w / 2, h - boxH + size * 0.4 + lh * (i + 0.5)));
  ctx.restore();
}

/** Carton de titre (début d'un clip exporté). */
export function drawTitle(ctx: CanvasRenderingContext2D, title: string, sub: string, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = "#0e1014";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#ff7a1a";
  ctx.fillRect(w * 0.1, h * 0.58, w * 0.12, Math.max(4, h * 0.008));
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 ${Math.round(w / 22)}px system-ui, sans-serif`;
  ctx.fillText(title, w * 0.1, h * 0.52, w * 0.8);
  if (sub) {
    ctx.fillStyle = "#b8bfcc";
    ctx.font = `500 ${Math.round(w / 48)}px system-ui, sans-serif`;
    ctx.fillText(sub, w * 0.1, h * 0.67, w * 0.8);
  }
  ctx.restore();
}

/** Distance (en px écran) d'un point à un dessin, pour le sélectionner au clic. */
export function hitDistance(d: Drawing, x: number, y: number, w: number, h: number): number {
  const p = d.points.map((v, i) => (i % 2 === 0 ? v * w : v * h));
  const seg = (ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const l = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l));
    return Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
  };
  if (d.type === "text") return Math.hypot(x - p[0], y - p[1]) - 20;
  if (d.type === "curve") {
    let best = Infinity;
    let [px, py] = [p[0], p[1]];
    for (let i = 1; i <= 16; i++) {
      const t = i / 16;
      const qx = (1 - t) ** 2 * p[0] + 2 * (1 - t) * t * p[2] + t * t * p[4];
      const qy = (1 - t) ** 2 * p[1] + 2 * (1 - t) * t * p[3] + t * t * p[5];
      best = Math.min(best, seg(px, py, qx, qy));
      [px, py] = [qx, qy];
    }
    return best;
  }
  if (d.type === "circle" || d.type === "rect") {
    const [x1, y1, x2, y2] = p;
    const inside = x >= Math.min(x1, x2) && x <= Math.max(x1, x2) && y >= Math.min(y1, y2) && y <= Math.max(y1, y2);
    return inside ? 0 : Math.min(seg(x1, y1, x2, y1), seg(x2, y1, x2, y2), seg(x2, y2, x1, y2), seg(x1, y2, x1, y1));
  }
  return seg(p[0], p[1], p[2], p[3]);
}

export function fmt(t: number): string {
  if (!isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const cs = Math.floor((t % 1) * 10);
  return `${m}:${String(s).padStart(2, "0")}.${cs}`;
}
