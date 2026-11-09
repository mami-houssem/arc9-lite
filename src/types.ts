// Modèle de données d'un projet : une vidéo locale, ses séquences, leurs dessins.
// Les coordonnées des dessins sont normalisées (0..1) par rapport à l'image vidéo,
// pour rester justes quelle que soit la taille d'affichage ou d'export.

export type Tool = "arrow" | "curve" | "line" | "circle" | "rect" | "text";

export interface Drawing {
  id: string;
  type: Tool;
  points: number[]; // [x1, y1, x2, y2] (courbe : [x1, y1, cx, cy, x2, y2])
  t: number; // instant d'apparition (s, temps de la vidéo)
  freeze: number; // arrêt sur image à l'apparition (s), 0 = aucun
  color: string;
  width: number; // épaisseur relative (1 = fine, 2 = normale, 3 = épaisse)
  dashed: boolean;
  text?: string;
}

export interface Sequence {
  id: string;
  name: string;
  start: number;
  end: number;
  comment: string;
  drawings: Drawing[];
}

export interface Project {
  key: string; // nom + taille du fichier : retrouve le projet quand on rouvre la même vidéo
  fileName: string;
  sequences: Sequence[];
  updatedAt: number;
}

export const COLORS = ["#facc15", "#ef4444", "#22c55e", "#3b82f6", "#ffffff", "#f97316"];
