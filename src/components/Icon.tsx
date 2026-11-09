const P: Record<string, string> = {
  play: "M7 4.5v15l12-7.5z",
  pause: "M7 4h3.5v16H7zM13.5 4H17v16h-3.5z",
  back5: "M11 7 6 12l5 5M18 7l-5 5 5 5",
  fwd5: "M13 7l5 5-5 5M6 7l5 5-5 5",
  frameBack: "M18 6v12l-8-6zM6 6h2v12H6z",
  frameFwd: "M6 6v12l8-6zM16 6h2v12h-2z",
  arrow: "M5 19 19 5M10 5h9v9",
  curve: "M4 19c0-8 6-13 14-13M13 2l5 4-4 5",
  line: "M4 20 20 4",
  circle: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  rect: "M4 5h16v14H4z",
  text: "M5 6V4h14v2M12 4v16M9 20h6",
  select: "M5 3l13 8-6 1.5L9 19z",
  undo: "M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  redo: "M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  share: "M12 3v12M7 8l5-5 5 5M5 14v6h14v-6",
  download: "M12 4v12M7 11l5 5 5-5M5 20h14",
  film: "M4 4h16v16H4zM8 4v16M16 4v16M4 9h4M4 15h4M16 9h4M16 15h4",
  folder: "M3 6h6l2 2h10v11H3z",
  home: "M3 11l9-7 9 7v9h-6v-6H9v6H3z",
  up: "M6 15l6-6 6 6",
  down: "M6 9l6 6 6-6",
  x: "M6 6l12 12M18 6 6 18",
  in: "M8 4H5v16h3M14 8l4 4-4 4M18 12H9",
  out: "M16 4h3v16h-3M10 8l-4 4 4 4M6 12h9",
  snow: "M12 2v20M4 7l16 10M4 17 20 7",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  check: "M5 12l5 5L20 7",
  help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01",
};

export function Icon({ name, size = 20, className }: { name: keyof typeof P | string; size?: number; className?: string }) {
  const filled = name === "play" || name === "pause" || name === "frameBack" || name === "frameFwd";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true"
      fill={filled ? "currentColor" : "none"} stroke={filled ? "none" : "currentColor"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={P[name] ?? ""} />
    </svg>
  );
}
