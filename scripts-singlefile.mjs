// Fabrique arc9-lite.html : toute l'application dans un seul fichier, à ouvrir directement
// dans Chrome (double-clic), sans serveur ni connexion.
import { readFileSync, writeFileSync } from "node:fs";
const dist = new URL("./dist/", import.meta.url);
let html = readFileSync(new URL("index.html", dist), "utf8");
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/, (_, p) => `<style>${readFileSync(new URL(p, dist), "utf8")}</style>`);
html = html.replace(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/, (_, p) => {
  const js = readFileSync(new URL(p, dist), "utf8").replace(/<\/script/gi, "<\\/script");
  return `<script type="module">${js}</script>`;
});
const svg = readFileSync(new URL("favicon.svg", dist));
const icon = `data:image/svg+xml;base64,${svg.toString("base64")}`;
html = html.replace('href="./favicon.svg"', `href="${icon}"`).replace(/<link rel="manifest"[^>]*>\s*/, "").replace(/<link rel="apple-touch-icon"[^>]*>\s*/, "");
html = html.replaceAll('src="favicon.svg"', `src="${icon}"`).replaceAll("\"favicon.svg\"", `"${icon}"`);
if (/src="\.\/assets|href="\.\/assets/.test(html)) throw new Error("ressource non intégrée");
writeFileSync(new URL("arc9-lite.html", dist), html);
console.log("dist/arc9-lite.html", (html.length / 1024).toFixed(0), "Ko");
