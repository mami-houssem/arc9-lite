// Arc9 Lite : couper des séquences, dessiner, commenter et exporter en MP4, 100 % dans le
// navigateur (aucun serveur). Les projets sont gardés dans IndexedDB, liés à la vidéo par son
// nom et sa taille ; la poignée du fichier est mémorisée quand Chrome le permet, pour reprendre
// un projet en un clic.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { del, get, set } from "./lib/db";
import { fmt } from "./lib/draw";
import { initial, reducer } from "./lib/project";
import type { Project, Sequence, Tool } from "./types";
import { ExportDialog } from "./components/ExportDialog";
import { Home, type Recent } from "./components/Home";
import { Icon } from "./components/Icon";
import { SequencePanel, type DrawStyle } from "./components/SequencePanel";
import { Stage } from "./components/Stage";
import { Timeline } from "./components/Timeline";

const FRAME = 1 / 25;
type Picker = (o: object) => Promise<FileSystemFileHandle[]>;

export default function App() {
  const [state, dispatch] = useReducer(reducer, initial);
  const project = state.project;
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [recents, setRecents] = useState<Recent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool | "select">("select");
  const [style, setStyle] = useState<DrawStyle>({ color: "#facc15", width: 2, dashed: false, freeze: 0 });
  const [selectedDrawing, setSelectedDrawing] = useState<string | null>(null);
  const [markIn, setMarkIn] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [frozen, setFrozen] = useState(false);
  const [exporting, setExporting] = useState<Sequence[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const review = useRef<{ seq: Sequence; done: Set<string> } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => project?.sequences.find((s) => s.id === selectedId) ?? null, [project, selectedId]);
  const say = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 2500); };

  // ---------------------------------------------------------------- projets récents
  const loadRecents = useCallback(async () => setRecents((await get<Recent[]>("recents")) ?? []), []);
  useEffect(() => { void loadRecents(); }, [loadRecents]);

  // sauvegarde automatique
  useEffect(() => {
    if (!project) return;
    const id = window.setTimeout(async () => {
      await set(`project:${project.key}`, project);
      const list = ((await get<Recent[]>("recents")) ?? []).filter((r) => r.key !== project.key);
      const hasHandle = !!(await get(`handle:${project.key}`));
      await set("recents", [{ key: project.key, fileName: project.fileName, updatedAt: project.updatedAt, count: project.sequences.length, hasHandle }, ...list].slice(0, 12));
    }, 400);
    return () => window.clearTimeout(id);
  }, [project]);

  const openFile = async (file: File, handle?: FileSystemFileHandle) => {
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(file.name)) { say("Ce fichier n'est pas une vidéo"); return; }
    const key = `${file.name}|${file.size}`;
    if (handle) await set(`handle:${key}`, handle).catch(() => undefined);
    const saved = await get<Project>(`project:${key}`);
    dispatch({ type: "load", project: saved ?? { key, fileName: file.name, sequences: [], updatedAt: Date.now() } });
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file));
    setSelectedId(saved?.sequences[0]?.id ?? null);
    setMarkIn(null);
    if (saved?.sequences.length) say(`Projet retrouvé : ${saved.sequences.length} séquence(s)`);
  };

  const pick = async () => {
    const picker = (window as unknown as { showOpenFilePicker?: Picker }).showOpenFilePicker;
    if (picker) {
      try {
        const [h] = await picker({ types: [{ description: "Vidéos", accept: { "video/*": [".mp4", ".mov", ".m4v", ".webm", ".mkv"] } }] });
        await openFile(await h.getFile(), h);
      } catch { /* annulé */ }
    } else fileInput.current?.click();
  };

  const reopen = async (r: Recent) => {
    const h = await get<FileSystemFileHandle & { requestPermission?: (o: object) => Promise<string> }>(`handle:${r.key}`);
    if (h) {
      try {
        if (h.requestPermission && (await h.requestPermission({ mode: "read" })) !== "granted") throw new Error();
        const f = await h.getFile();
        if (`${f.name}|${f.size}` === r.key) return void openFile(f, h);
      } catch { /* fichier déplacé ou accès refusé : on redemande */ }
    }
    say(`Choisissez le fichier « ${r.fileName} »`);
    void pick();
  };

  const forget = async (r: Recent) => {
    if (!confirm(`Oublier le projet « ${r.fileName} » ? (la vidéo n'est pas supprimée)`)) return;
    await del(`project:${r.key}`);
    await del(`handle:${r.key}`);
    await set("recents", recents.filter((x) => x.key !== r.key));
    void loadRecents();
  };

  const home = () => {
    videoRef.current?.pause();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    dispatch({ type: "load", project: null as unknown as Project });
    void loadRecents();
  };

  // ---------------------------------------------------------------- lecture
  const v = () => videoRef.current;
  const seek = (t: number) => { const el = v(); if (el) { el.currentTime = Math.max(0, Math.min(el.duration || t, t)); } };
  const toggle = () => { const el = v(); if (!el) return; review.current = null; if (el.paused) void el.play(); else el.pause(); };

  useEffect(() => {
    const el = v();
    if (!el) return;
    const on = () => setPlaying(!el.paused);
    const meta = () => setDuration(el.duration || 0);
    el.addEventListener("play", on); el.addEventListener("pause", on); el.addEventListener("loadedmetadata", meta);
    return () => { el.removeEventListener("play", on); el.removeEventListener("pause", on); el.removeEventListener("loadedmetadata", meta); };
  }, [videoUrl]);

  useEffect(() => { if (v()) v()!.playbackRate = rate; }, [rate, videoUrl]);

  // revoir une séquence comme dans l'export : arrêts sur image puis arrêt à la fin
  const playSequence = (s: Sequence) => {
    const el = v();
    if (!el) return;
    setSelectedId(s.id);
    review.current = { seq: s, done: new Set() };
    el.currentTime = s.start;
    void el.play();
  };
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = v();
      const r = review.current;
      if (el && r && !el.paused) {
        const f = r.seq.drawings.find((d) => d.freeze > 0 && !r.done.has(d.id) && el.currentTime >= d.t - 0.03);
        if (f) {
          r.done.add(f.id);
          el.pause();
          setFrozen(true);
          window.setTimeout(() => { setFrozen(false); if (review.current === r) void el.play(); }, f.freeze * 1000);
        } else if (el.currentTime >= r.seq.end) {
          el.pause();
          review.current = null;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---------------------------------------------------------------- découpe
  const markStart = () => { const t = v()?.currentTime ?? 0; setMarkIn(t); say(`Début marqué à ${fmt(t)} — placez la vidéo à la fin de l'action puis « Fin »`); };
  const markEnd = () => {
    const t = v()?.currentTime ?? 0;
    const start = markIn ?? Math.max(0, t - 8);
    if (Math.abs(t - start) < 0.3) { say("La séquence est trop courte"); return; }
    dispatch({ type: "addSequence", start, end: t });
    setMarkIn(null);
    say(markIn === null ? "Séquence créée (8 s avant la fin, à ajuster si besoin)" : "Séquence créée");
  };
  // sélectionne la séquence qui vient d'être créée
  const count = project?.sequences.length ?? 0;
  const lastCount = useRef(count);
  useEffect(() => {
    if (project && count > lastCount.current) setSelectedId(project.sequences[project.sequences.length - 1].id);
    lastCount.current = count;
  }, [count, project]);

  // ---------------------------------------------------------------- clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!project || exporting) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const el = v();
      if (e.key === " ") { e.preventDefault(); toggle(); }
      else if (e.key === "i" || e.key === "I") markStart();
      else if (e.key === "o" || e.key === "O") markEnd();
      else if (e.key === "ArrowLeft") { e.preventDefault(); el?.pause(); seek((el?.currentTime ?? 0) - (e.shiftKey ? 5 : FRAME)); }
      else if (e.key === "ArrowRight") { e.preventDefault(); el?.pause(); seek((el?.currentTime ?? 0) + (e.shiftKey ? 5 : FRAME)); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); dispatch({ type: e.shiftKey ? "redo" : "undo" }); }
      else if ((e.key === "Delete" || e.key === "Backspace") && selectedDrawing && selected) {
        dispatch({ type: "deleteDrawing", seqId: selected.id, id: selectedDrawing }); setSelectedDrawing(null);
      } else if (e.key === "Escape") { setTool("select"); setSelectedDrawing(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---------------------------------------------------------------- rendu
  const input = (
    <input ref={fileInput} type="file" accept="video/*" hidden data-testid="file-input"
      onChange={(e) => { const f = e.target.files?.[0]; if (f) void openFile(f); e.target.value = ""; }} />
  );
  if (!project || !videoUrl) {
    return <>{input}<Home recents={recents} onOpen={(f, h) => void openFile(f, h)} onPick={pick} onReopen={reopen} onForget={forget} />{toast && <div className="toast" role="status">{toast}</div>}</>;
  }

  return (
    <div className="app">
      {input}
      <header className="topbar">
        <button className="btn ghost icon" onClick={home} aria-label="Accueil" title="Accueil"><Icon name="home" /></button>
        <span className="title grow">{project.fileName}</span>
        <button className="btn ghost icon" onClick={() => dispatch({ type: "undo" })} disabled={!state.past.length} aria-label="Annuler" title="Annuler (Ctrl+Z)"><Icon name="undo" /></button>
        <button className="btn ghost icon" onClick={() => dispatch({ type: "redo" })} disabled={!state.future.length} aria-label="Rétablir" title="Rétablir (Ctrl+Maj+Z)"><Icon name="redo" /></button>
      </header>
      <div className="main">
        <div className="left">
          <Stage videoRef={videoRef} src={videoUrl} sequence={selected} tool={tool} style={style}
            selectedDrawing={selectedDrawing} onSelectDrawing={setSelectedDrawing}
            onAddDrawing={(d) => { if (selected) { dispatch({ type: "addDrawing", seqId: selected.id, drawing: d }); setSelectedDrawing(d.id); } }}
            frozen={frozen} showCaption />
          <div className="controls" role="toolbar" aria-label="Lecture">
            <button className="btn icon" onClick={() => seek((v()?.currentTime ?? 0) - 5)} aria-label="Reculer de 5 s" title="−5 s (Maj+←)"><Icon name="back5" /></button>
            <button className="btn icon" onClick={() => { v()?.pause(); seek((v()?.currentTime ?? 0) - FRAME); }} aria-label="Image précédente" title="Image précédente (←)"><Icon name="frameBack" /></button>
            <button className="btn primary icon" onClick={toggle} aria-label={playing ? "Pause" : "Lecture"} title="Lecture / pause (Espace)" data-testid="play"><Icon name={playing ? "pause" : "play"} /></button>
            <button className="btn icon" onClick={() => { v()?.pause(); seek((v()?.currentTime ?? 0) + FRAME); }} aria-label="Image suivante" title="Image suivante (→)"><Icon name="frameFwd" /></button>
            <button className="btn icon" onClick={() => seek((v()?.currentTime ?? 0) + 5)} aria-label="Avancer de 5 s" title="+5 s (Maj+→)"><Icon name="fwd5" /></button>
            <select className="input" style={{ width: 76 }} value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label="Vitesse">
              {[0.25, 0.5, 1, 1.5, 2].map((r) => <option key={r} value={r}>{r}×</option>)}
            </select>
            <Clock video={v()} duration={duration} />
            <span className="grow" />
            <button className={`btn ${markIn !== null ? "on" : ""}`} onClick={markStart} title="Début de la séquence (I)" data-testid="mark-in"><Icon name="in" /> Début</button>
            <button className="btn primary" onClick={markEnd} title="Fin de la séquence (O)" data-testid="mark-out"><Icon name="out" /> Fin</button>
          </div>
          <Timeline duration={duration} video={v()} sequences={project.sequences} selected={selectedId} markIn={markIn}
            onSeek={(t) => { review.current = null; seek(t); }} onSelect={(id) => { setSelectedId(id); const s = project.sequences.find((x) => x.id === id); if (s) seek(s.start); }} />
        </div>
        <SequencePanel sequences={project.sequences} selected={selected} onSelect={setSelectedId} dispatch={dispatch}
          tool={tool} setTool={setTool} style={style} setStyle={setStyle}
          selectedDrawing={selectedDrawing} setSelectedDrawing={setSelectedDrawing}
          onSeek={(t) => { v()?.pause(); seek(t); }} onPlaySequence={playSequence} onExport={(s) => { v()?.pause(); setExporting(s); }} />
      </div>
      {exporting && <ExportDialog videoUrl={videoUrl} sequences={exporting} title={exporting.length > 1 ? project.fileName.replace(/\.[^.]+$/, "") : exporting[0].name} onClose={() => setExporting(null)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function Clock({ video, duration }: { video: HTMLVideoElement | null; duration: number }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => { setT(video?.currentTime ?? 0); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [video]);
  return <span className="tc small" data-testid="clock">{fmt(t)} / {fmt(duration)}</span>;
}
