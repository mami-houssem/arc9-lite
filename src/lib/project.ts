// État du projet (séquences et dessins) avec annuler / rétablir.
import type { Drawing, Project, Sequence } from "../types";
import { uid } from "./db";

export type Action =
  | { type: "load"; project: Project }
  | { type: "addSequence"; start: number; end: number; name?: string }
  | { type: "updateSequence"; id: string; patch: Partial<Omit<Sequence, "id" | "drawings">> }
  | { type: "deleteSequence"; id: string }
  | { type: "moveSequence"; id: string; dir: -1 | 1 }
  | { type: "addDrawing"; seqId: string; drawing: Drawing }
  | { type: "updateDrawing"; seqId: string; id: string; patch: Partial<Drawing> }
  | { type: "deleteDrawing"; seqId: string; id: string }
  | { type: "undo" }
  | { type: "redo" };

export interface State {
  project: Project | null;
  past: Project[];
  future: Project[];
}

export const initial: State = { project: null, past: [], future: [] };

function apply(p: Project, a: Action): Project {
  const seqs = p.sequences;
  const mapSeq = (id: string, f: (s: Sequence) => Sequence) => seqs.map((s) => (s.id === id ? f(s) : s));
  switch (a.type) {
    case "addSequence": {
      const start = Math.min(a.start, a.end);
      const end = Math.max(a.start, a.end);
      return { ...p, sequences: [...seqs, { id: uid(), name: a.name ?? `Séquence ${seqs.length + 1}`, start, end, comment: "", drawings: [] }] };
    }
    case "updateSequence":
      return { ...p, sequences: mapSeq(a.id, (s) => {
        const n = { ...s, ...a.patch };
        if (n.end < n.start) [n.start, n.end] = [n.end, n.start];
        return n;
      }) };
    case "deleteSequence":
      return { ...p, sequences: seqs.filter((s) => s.id !== a.id) };
    case "moveSequence": {
      const i = seqs.findIndex((s) => s.id === a.id);
      const j = i + a.dir;
      if (i < 0 || j < 0 || j >= seqs.length) return p;
      const copy = [...seqs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return { ...p, sequences: copy };
    }
    case "addDrawing":
      return { ...p, sequences: mapSeq(a.seqId, (s) => ({ ...s, drawings: [...s.drawings, a.drawing] })) };
    case "updateDrawing":
      return { ...p, sequences: mapSeq(a.seqId, (s) => ({ ...s, drawings: s.drawings.map((d) => (d.id === a.id ? { ...d, ...a.patch } : d)) })) };
    case "deleteDrawing":
      return { ...p, sequences: mapSeq(a.seqId, (s) => ({ ...s, drawings: s.drawings.filter((d) => d.id !== a.id) })) };
    default:
      return p;
  }
}

export function reducer(state: State, a: Action): State {
  if (a.type === "load") return { project: a.project, past: [], future: [] };
  if (!state.project) return state;
  if (a.type === "undo") {
    const prev = state.past[state.past.length - 1];
    return prev ? { project: prev, past: state.past.slice(0, -1), future: [state.project, ...state.future] } : state;
  }
  if (a.type === "redo") {
    const [next, ...rest] = state.future;
    return next ? { project: next, past: [...state.past, state.project], future: rest } : state;
  }
  const project = { ...apply(state.project, a), updatedAt: Date.now() };
  return { project, past: [...state.past.slice(-99), state.project], future: [] };
}
