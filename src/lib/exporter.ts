// Export MP4 entièrement dans le navigateur : la séquence est rejouée dans une vidéo cachée,
// chaque image est dessinée sur un canvas (vidéo + dessins + commentaire), et le canvas est
// enregistré avec MediaRecorder, son compris. L'export dure donc le temps réel de la séquence
// (plus les arrêts sur image) — c'est le prix d'un outil sans serveur ni installation.
import type { Sequence } from "../types";
import { drawCaption, drawOne, drawTitle, visible } from "./draw";

const TYPES = [
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/mp4;codecs=avc1,opus",
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm",
];

export function pickType(): string {
  return TYPES.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "video/webm";
}

export interface ExportOptions {
  titleCard: boolean;
  caption: boolean;
  maxWidth: number; // 1280 (WhatsApp) ou 1920
  onProgress?: (p: number, label: string) => void;
  signal?: AbortSignal;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function waitEvent(el: HTMLMediaElement, ev: string, timeout = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`La vidéo ne répond pas (${ev})`)), timeout);
    el.addEventListener(ev, () => { clearTimeout(t); resolve(); }, { once: true });
  });
}

/** Exporte une ou plusieurs séquences (montage) en un seul fichier vidéo. */
export async function exportSequences(videoUrl: string, sequences: Sequence[], opts: ExportOptions): Promise<Blob> {
  if (!sequences.length) throw new Error("Aucune séquence à exporter");
  const video = document.createElement("video");
  video.src = videoUrl;
  video.preload = "auto";
  video.playsInline = true;
  video.crossOrigin = "anonymous";
  await waitEvent(video, "loadedmetadata");
  const scale = Math.min(1, opts.maxWidth / video.videoWidth);
  const w = Math.round((video.videoWidth * scale) / 2) * 2;
  const h = Math.round((video.videoHeight * scale) / 2) * 2;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // son : la vidéo cachée passe par Web Audio vers le flux enregistré (et pas vers les haut-parleurs)
  const audio = new AudioContext();
  const dest = audio.createMediaStreamDestination();
  audio.createMediaElementSource(video).connect(dest);
  const stream = canvas.captureStream(30);
  dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

  const type = pickType();
  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: w > 1300 ? 6_000_000 : 3_000_000, audioBitsPerSecond: 128_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const stopped = new Promise<void>((r) => (recorder.onstop = () => r()));

  let current: Sequence | null = null;
  let title: { name: string; sub: string } | null = null;
  let running = true;
  const paint = () => {
    if (!running) return;
    if (title) drawTitle(ctx, title.name, title.sub, w, h);
    else {
      ctx.drawImage(video, 0, 0, w, h);
      if (current) {
        for (const d of visible(current.drawings, video.currentTime, current.start, current.end)) drawOne(ctx, d, w, h);
        if (opts.caption) drawCaption(ctx, current.comment, w, h);
      }
    }
    requestAnimationFrame(paint);
  };

  const total = sequences.reduce((a, s) => a + (s.end - s.start) + s.drawings.reduce((b, d) => b + d.freeze, 0) + (opts.titleCard ? 2 : 0), 0);
  let done = 0;
  const report = (label: string) => opts.onProgress?.(Math.min(0.99, done / Math.max(total, 0.1)), label);

  try {
    await audio.resume();
    video.currentTime = sequences[0].start;
    await waitEvent(video, "seeked");
    requestAnimationFrame(paint);
    recorder.start(250);
    for (const [i, seq] of sequences.entries()) {
      const label = sequences.length > 1 ? `Séquence ${i + 1}/${sequences.length} : ${seq.name}` : seq.name;
      if (opts.titleCard) {
        title = { name: seq.name || "Séquence", sub: sequences.length > 1 ? `${i + 1} / ${sequences.length}` : "" };
        for (let k = 0; k < 20; k++) { await sleep(100); done += 0.1; report(label); }
      }
      if (Math.abs(video.currentTime - seq.start) > 0.05) {
        video.currentTime = seq.start;
        await waitEvent(video, "seeked");
      }
      current = seq;
      title = null;
      const freezes = [...seq.drawings].filter((d) => d.freeze > 0).sort((a, b) => a.t - b.t);
      let next = 0;
      await video.play();
      while (video.currentTime < seq.end - 0.02 && !video.ended) {
        if (opts.signal?.aborted) throw new DOMException("Export annulé", "AbortError");
        // arrêt sur image : la vidéo se met en pause à l'apparition du dessin
        if (next < freezes.length && video.currentTime >= freezes[next].t - 0.03) {
          video.pause();
          const f = freezes[next++];
          for (let k = 0; k < f.freeze * 10; k++) { await sleep(100); done += 0.1; report(label); }
          await video.play();
          continue;
        }
        const before = video.currentTime;
        await sleep(40);
        done += Math.max(0, video.currentTime - before);
        report(label);
      }
      video.pause();
    }
    await sleep(150);
  } finally {
    running = false;
    if (recorder.state !== "inactive") recorder.stop();
    await stopped;
    stream.getTracks().forEach((t) => t.stop());
    await audio.close();
    video.removeAttribute("src");
    video.load();
  }
  opts.onProgress?.(1, "Terminé");
  return new Blob(chunks, { type: type.split(";")[0] });
}

export function fileName(name: string, type: string): string {
  const base = (name || "sequence").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "-") || "sequence";
  return `${base}.${type.includes("mp4") ? "mp4" : "webm"}`;
}

/** Partage (WhatsApp, etc.) si le navigateur le permet, sinon téléchargement. */
export async function shareOrDownload(blob: Blob, name: string, share: boolean): Promise<"shared" | "downloaded"> {
  const file = new File([blob], name, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (share && nav.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: name });
    return "shared";
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "downloaded";
}
