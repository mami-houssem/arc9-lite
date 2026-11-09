import { useState } from "react";
import { Icon } from "./Icon";

export interface Recent { key: string; fileName: string; updatedAt: number; count: number; hasHandle: boolean }

export function Home({ recents, onOpen, onPick, onReopen, onForget }: {
  recents: Recent[]; onOpen: (f: File, handle?: FileSystemFileHandle) => void; onPick: () => void;
  onReopen: (r: Recent) => void; onForget: (r: Recent) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <main className="home">
      <div className="logo"><img src="favicon.svg" width={34} height={34} alt="" /> Arc<b>9</b> Lite</div>
      <section className="card hero">
        <h1>Découpez, annotez, partagez</h1>
        <p className="muted" style={{ margin: 0 }}>Vos vidéos de match restent sur votre appareil : rien n'est envoyé sur Internet.</p>
        <div className={`drop ${over ? "over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onOpen(f); }}>
          <button className="btn primary" style={{ minHeight: 52, fontSize: 17, padding: "0 24px" }} onClick={onPick} data-testid="open-video">
            <Icon name="folder" /> Ouvrir une vidéo
          </button>
          <p className="muted small" style={{ marginBottom: 0 }}>ou glissez le fichier ici (MP4, MOV, WebM)</p>
        </div>
        <div className="steps">
          <div className="step"><strong>1. Couper</strong>Début et Fin de chaque action</div>
          <div className="step"><strong>2. Dessiner</strong>Flèches, cercles, zones, texte, arrêt sur image</div>
          <div className="step"><strong>3. Commenter</strong>Le texte s'affiche en bas de la vidéo</div>
          <div className="step"><strong>4. Partager</strong>Vidéo MP4 pour WhatsApp, ou enregistrée</div>
        </div>
      </section>
      {recents.length > 0 && (
        <section className="card recent">
          <h2 style={{ margin: 0, padding: "12px 12px 4px", fontSize: 15 }}>Projets récents</h2>
          <ul>
            {recents.map((r) => (
              <li key={r.key}>
                <Icon name="film" />
                <div className="grow">
                  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.fileName}</div>
                  <div className="small muted">{r.count} séquence(s) · {new Date(r.updatedAt).toLocaleString("fr-CH", { dateStyle: "short", timeStyle: "short" })}</div>
                </div>
                <button className="btn sm" onClick={() => onReopen(r)}>{r.hasHandle ? "Reprendre" : "Rouvrir la vidéo"}</button>
                <button className="btn ghost icon sm" aria-label="Oublier ce projet" onClick={() => onForget(r)}><Icon name="trash" size={16} /></button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="muted small" style={{ textAlign: "center", marginTop: 24 }}>
        Fonctionne sans connexion une fois ouverte. Astuce : dans Chrome, menu ⋮ puis « Installer Arc9 Lite » pour l'avoir comme une application.
      </p>
    </main>
  );
}
