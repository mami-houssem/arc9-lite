import { describe, expect, it } from "vitest";
import { curveControl, fmt, hitDistance, visible } from "./draw";
import { fileName } from "./exporter";
import { initial, reducer } from "./project";
import type { Drawing, Project } from "../types";

const project: Project = { key: "k", fileName: "match.mp4", sequences: [], updatedAt: 0 };
const drawing = (over: Partial<Drawing> = {}): Drawing => ({
  id: "d1", type: "arrow", points: [0.1, 0.1, 0.5, 0.5], t: 12, freeze: 0, color: "#fff", width: 2, dashed: false, ...over,
});

describe("projet", () => {
  it("séquences, dessins, annuler / rétablir", () => {
    let s = reducer(initial, { type: "load", project });
    s = reducer(s, { type: "addSequence", start: 20, end: 10 });
    const seq = s.project!.sequences[0];
    expect([seq.start, seq.end, seq.name]).toEqual([10, 20, "Séquence 1"]); // bornes remises dans l'ordre
    s = reducer(s, { type: "addDrawing", seqId: seq.id, drawing: drawing() });
    s = reducer(s, { type: "updateSequence", id: seq.id, patch: { comment: "Bien fixer le défenseur" } });
    expect(s.project!.sequences[0].drawings).toHaveLength(1);
    s = reducer(s, { type: "undo" });
    expect(s.project!.sequences[0].comment).toBe("");
    s = reducer(s, { type: "redo" });
    expect(s.project!.sequences[0].comment).toBe("Bien fixer le défenseur");
    s = reducer(s, { type: "deleteDrawing", seqId: seq.id, id: "d1" });
    expect(s.project!.sequences[0].drawings).toHaveLength(0);
  });

  it("ordre des séquences", () => {
    let s = reducer(initial, { type: "load", project });
    s = reducer(s, { type: "addSequence", start: 1, end: 2, name: "A" });
    s = reducer(s, { type: "addSequence", start: 3, end: 4, name: "B" });
    s = reducer(s, { type: "moveSequence", id: s.project!.sequences[1].id, dir: -1 });
    expect(s.project!.sequences.map((q) => q.name)).toEqual(["B", "A"]);
  });
});

describe("dessins", () => {
  it("visibles à partir de leur apparition, jusqu'à la fin de la séquence", () => {
    const ds = [drawing({ t: 12 }), drawing({ id: "d2", t: 15 })];
    expect(visible(ds, 11, 10, 20)).toHaveLength(0);
    expect(visible(ds, 13, 10, 20).map((d) => d.id)).toEqual(["d1"]);
    expect(visible(ds, 16, 10, 20)).toHaveLength(2);
  });

  it("sélection au clic près du trait", () => {
    const d = drawing();
    expect(hitDistance(d, 300, 300, 1000, 1000)).toBeLessThan(1);
    expect(hitDistance(d, 900, 100, 1000, 1000)).toBeGreaterThan(200);
    const [cx, cy] = curveControl(0, 0, 1, 0);
    expect([cx, cy]).toEqual([0.5, 0.3]);
  });

  it("formats", () => {
    expect(fmt(75.46)).toBe("1:15.4");
    expect(fileName("Contre-attaque 12' été", "video/mp4")).toBe("Contre-attaque-12-ete.mp4");
  });
});
