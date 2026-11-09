// Fenêtre d'export : options, progression, puis Partager (WhatsApp…) ou Télécharger.
import { useEffect, useRef, useState } from "react";
import type { Sequence } from "../types";
import { exportSequences, fileName, pickType, shareOrDownload } from "../lib/exporter";
import { Icon } from "./Icon";

export function ExportDialog({ videoUrl, sequences, title, onClose }: { videoUrl: string; sequences: Sequence[]; title: string; onClose: () => void }) {
  const [titleCard, setTitleCard] = useState(true);
  const [caption, setCaption] = useState(true);
  const [hd, setHd] = useState(false);
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [progress, setProgress] = useState({ p: 0, label: "" });
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;
  const duration = sequences.reduce((a, s) => a + s.end - s.start + s.drawings.reduce((b, d) => b + d.freeze, 0) + (titleCard ? 2 : 0), 0);
  const name = fileName(title, pickType());

  useEffect(() => () => abort.current?.abort(), []);

  const run = async () => {
    setState("running");
    setError(null);
    abort.current = new AbortController();
    try {
      const b = await exportSequences(videoUrl, sequences, {
        titleCard, caption, maxWidth: hd ? 1920 : 1280, signal: abort.current.signal,
        onProgress: (p, label) => setProgress({ p, label }),
      });
      setBlob(b);
      setState("done");
    } catch (e) {
      if ((e as Error).name === "AbortError") { setState("idle"); return; }
      setError((e as Error).message);
      setState("error");
    }
  };

  const send = async (share: boolean) => {
    if (!blob) return;
    try {
      const r = await shareOrDownload(blob, name, share);
      setMsg(r === "shared" ? "Partagé." : `Enregistré dans Téléchargements : ${name}`);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setMsg((e as Error).message);
    }
  };

  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-labelledby="export-title">
      <div className="modal card" data-testid="export-dialog">
        <div className="row">
          <h2 id="export-title" className="grow">Exporter en vidéo</h2>
          <button className="btn ghost icon" onClick={() => { abort.current?.abort(); onClose(); }} aria-label="Fermer"><Icon name="x" /></button>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          {sequences.length > 1 ? `${sequences.length} séquences à la suite` : `« ${sequences[0].name} »`} · environ {Math.ceil(duration)} s de vidéo
        </p>
        {state === "idle" || state === "error" ? (
          <>
            <label className="check"><input type="checkbox" checked={titleCard} onChange={(e) => setTitleCard(e.target.checked)} /> Titre au début (2 s)</label>
            <label className="check"><input type="checkbox" checked={caption} onChange={(e) => setCaption(e.target.checked)} /> Commentaire incrusté en bas de l'image</label>
            <label className="check"><input type="checkbox" checked={hd} onChange={(e) => setHd(e.target.checked)} /> Haute définition 1080p (fichier plus lourd ; sinon 720p, idéal pour WhatsApp)</label>
            {error && <p style={{ color: "var(--bad)", margin: 0 }}>{error}</p>}
            <p className="muted small" style={{ margin: 0 }}>L'export se fait en temps réel : gardez cet onglet ouvert et visible jusqu'à la fin.</p>
            <button className="btn primary" onClick={run} data-testid="export-start"><Icon name="film" /> Créer la vidéo</button>
          </>
        ) : state === "running" ? (
          <>
            <div className="progress" aria-label="Progression"><div style={{ width: `${Math.round(progress.p * 100)}%` }} /></div>
            <p className="small muted" style={{ margin: 0 }}>{progress.label} · {Math.round(progress.p * 100)} %</p>
            <button className="btn" onClick={() => abort.current?.abort()}>Annuler</button>
          </>
        ) : (
          <>
            <p style={{ margin: 0 }} data-testid="export-done"><Icon name="check" className="" /> Vidéo prête · {(blob!.size / 1e6).toFixed(1)} Mo</p>
            <div className="row wrap">
              {canShare && <button className="btn primary grow" onClick={() => send(true)}><Icon name="share" /> Partager (WhatsApp…)</button>}
              <button className={`btn grow ${canShare ? "" : "primary"}`} onClick={() => send(false)} data-testid="export-download"><Icon name="download" /> Télécharger</button>
            </div>
            {msg && <p className="small" style={{ margin: 0 }}>{msg}</p>}
            <p className="muted small" style={{ margin: 0 }}>
              Pas de WhatsApp dans la liste ? Téléchargez la vidéo, puis envoyez-la depuis web.whatsapp.com (trombone, puis « Photos et vidéos »).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
