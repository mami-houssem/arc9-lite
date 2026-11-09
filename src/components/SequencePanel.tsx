import type { Dispatch } from "react";
import type { Action } from "../lib/project";
import { fmt } from "../lib/draw";
import { COLORS, type Sequence, type Tool } from "../types";
import { Icon } from "./Icon";

const TOOLS: { id: Tool | "select"; label: string }[] = [
  { id: "select", label: "Choisir" }, { id: "arrow", label: "Flèche" }, { id: "curve", label: "Courbe" },
  { id: "line", label: "Ligne" }, { id: "circle", label: "Cercle" }, { id: "rect", label: "Zone" },
];
const NAMES: Record<string, string> = { arrow: "Flèche", curve: "Flèche courbe", line: "Ligne", circle: "Cercle", rect: "Zone", text: "Texte" };

export interface DrawStyle { color: string; width: number; dashed: boolean; freeze: number }

export function SequencePanel({ sequences, selected, onSelect, dispatch, tool, setTool, style, setStyle, selectedDrawing, setSelectedDrawing, onSeek, onPlaySequence, onExport }: {
  sequences: Sequence[]; selected: Sequence | null; onSelect: (id: string | null) => void; dispatch: Dispatch<Action>;
  tool: Tool | "select"; setTool: (t: Tool | "select") => void; style: DrawStyle; setStyle: (s: DrawStyle) => void;
  selectedDrawing: string | null; setSelectedDrawing: (id: string | null) => void;
  onSeek: (t: number) => void; onPlaySequence: (s: Sequence) => void; onExport: (s: Sequence[]) => void;
}) {
  return (
    <aside className="side" aria-label="Séquences">
      <div className="side-scroll">
        <section>
          <div className="row" style={{ marginBottom: 6 }}>
            <h2 className="grow" style={{ margin: 0, fontSize: 15 }}>Séquences ({sequences.length})</h2>
            <button className="btn sm" disabled={!sequences.length} onClick={() => onExport(sequences)} title="Toutes les séquences dans une seule vidéo">
              <Icon name="film" size={16} /> Tout exporter
            </button>
          </div>
          {sequences.length === 0 && (
            <p className="muted small">Placez la vidéo au début de l'action et appuyez sur <b>Début</b> (touche <span className="kbd">I</span>), puis à la fin sur <b>Fin</b> (touche <span className="kbd">O</span>).</p>
          )}
          <ul className="seq-list" data-testid="seq-list">
            {sequences.map((s, i) => (
              <li key={s.id} className={s.id === selected?.id ? "sel" : ""} onClick={() => { onSelect(s.id); onSeek(s.start); }}>
                <span className="seq-name">{s.name}</span>
                <span className="tc small muted">{(s.end - s.start).toFixed(1)} s</span>
                <button className="btn ghost icon sm" aria-label="Monter" disabled={i === 0} onClick={(e) => { e.stopPropagation(); dispatch({ type: "moveSequence", id: s.id, dir: -1 }); }}><Icon name="up" size={16} /></button>
                <button className="btn ghost icon sm" aria-label="Descendre" disabled={i === sequences.length - 1} onClick={(e) => { e.stopPropagation(); dispatch({ type: "moveSequence", id: s.id, dir: 1 }); }}><Icon name="down" size={16} /></button>
              </li>
            ))}
          </ul>
        </section>

        {selected && (
          <section className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }} data-testid="seq-editor">
            <label>
              <span className="label">Nom</span>
              <input className="input" value={selected.name} onChange={(e) => dispatch({ type: "updateSequence", id: selected.id, patch: { name: e.target.value } })} />
            </label>
            <div className="row">
              <div className="grow">
                <span className="label">Début</span>
                <div className="row"><span className="tc">{fmt(selected.start)}</span>
                  <button className="btn ghost sm" title="Mettre le début ici" onClick={() => dispatch({ type: "updateSequence", id: selected.id, patch: { start: currentTime() } })}>ici</button></div>
              </div>
              <div className="grow">
                <span className="label">Fin</span>
                <div className="row"><span className="tc">{fmt(selected.end)}</span>
                  <button className="btn ghost sm" title="Mettre la fin ici" onClick={() => dispatch({ type: "updateSequence", id: selected.id, patch: { end: currentTime() } })}>ici</button></div>
              </div>
            </div>
            <label>
              <span className="label">Commentaire (affiché en bas de la vidéo)</span>
              <textarea className="input" rows={3} placeholder="Ex. : l'arrière gauche doit fixer son défenseur avant de passer"
                value={selected.comment} onChange={(e) => dispatch({ type: "updateSequence", id: selected.id, patch: { comment: e.target.value } })} />
            </label>

            <div>
              <span className="label">Dessiner sur l'image</span>
              <div className="tools" role="toolbar" aria-label="Outils de dessin">
                {TOOLS.map((t) => (
                  <button key={t.id} className={`btn ${tool === t.id ? "on" : ""}`} onClick={() => setTool(t.id)} aria-pressed={tool === t.id} title={t.label}>
                    <Icon name={t.id} size={18} />{t.label}
                  </button>
                ))}
              </div>
              <div className="row" style={{ marginTop: 4 }}>
                <button className={`btn sm grow ${tool === "text" ? "on" : ""}`} onClick={() => setTool("text")} aria-pressed={tool === "text"}><Icon name="text" size={16} /> Texte</button>
                <button className={`btn sm grow ${style.dashed ? "on" : ""}`} onClick={() => setStyle({ ...style, dashed: !style.dashed })} aria-pressed={style.dashed}>Pointillés</button>
              </div>
            </div>
            <div className="swatches" role="radiogroup" aria-label="Couleur">
              {COLORS.map((c) => (
                <button key={c} className={`swatch ${style.color === c ? "on" : ""}`} style={{ background: c }} onClick={() => setStyle({ ...style, color: c })} aria-label={`Couleur ${c}`} role="radio" aria-checked={style.color === c} />
              ))}
            </div>
            <div className="row">
              <label className="grow">
                <span className="label">Épaisseur</span>
                <select className="input" value={style.width} onChange={(e) => setStyle({ ...style, width: Number(e.target.value) })}>
                  <option value={1}>Fine</option><option value={2}>Normale</option><option value={3}>Épaisse</option>
                </select>
              </label>
              <label className="grow">
                <span className="label">Arrêt sur image</span>
                <select className="input" value={style.freeze} onChange={(e) => setStyle({ ...style, freeze: Number(e.target.value) })}>
                  <option value={0}>Aucun</option><option value={2}>2 s</option><option value={3}>3 s</option><option value={5}>5 s</option><option value={8}>8 s</option>
                </select>
              </label>
            </div>
            <p className="muted small" style={{ margin: 0 }}>Le dessin apparaît à l'instant où la vidéo est en pause. Avec un arrêt sur image, la vidéo s'arrête quelques secondes pour l'explication.</p>

            {selected.drawings.length > 0 && (
              <ul className="draw-list" aria-label="Dessins de la séquence">
                {[...selected.drawings].sort((a, b) => a.t - b.t).map((d) => (
                  <li key={d.id} className={d.id === selectedDrawing ? "sel" : ""}>
                    <span className="dot" style={{ background: d.color }} />
                    <button className="btn ghost sm grow" style={{ justifyContent: "flex-start" }} onClick={() => { setSelectedDrawing(d.id); onSeek(d.t); }}>
                      {NAMES[d.type]}{d.text ? ` « ${d.text} »` : ""} · <span className="tc">{fmt(d.t)}</span>
                    </button>
                    {d.freeze > 0 && <span className="small muted" title="Arrêt sur image"><Icon name="snow" size={14} /> {d.freeze} s</span>}
                    <button className="btn ghost icon sm" aria-label="Supprimer le dessin" onClick={() => dispatch({ type: "deleteDrawing", seqId: selected.id, id: d.id })}><Icon name="trash" size={16} /></button>
                  </li>
                ))}
              </ul>
            )}

            <div className="row wrap">
              <button className="btn grow" onClick={() => onPlaySequence(selected)}><Icon name="play" size={16} /> Revoir</button>
              <button className="btn primary grow" onClick={() => onExport([selected])} data-testid="export-one"><Icon name="share" size={16} /> Exporter / WhatsApp</button>
            </div>
            <button className="btn ghost danger sm" onClick={() => { if (confirm(`Supprimer « ${selected.name} » ?`)) { dispatch({ type: "deleteSequence", id: selected.id }); onSelect(null); } }}>
              <Icon name="trash" size={16} /> Supprimer la séquence
            </button>
          </section>
        )}
      </div>
    </aside>
  );
}

function currentTime(): number {
  return document.querySelector<HTMLVideoElement>(".stage video")?.currentTime ?? 0;
}
