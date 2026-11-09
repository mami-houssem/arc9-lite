# Arc9 Lite — découpe et annotation vidéo

Application web pour entraîneurs (handball et autres sports) : **couper des séquences d'un match, dessiner dessus, ajouter un commentaire, et exporter chaque séquence en vidéo MP4 à partager sur WhatsApp**.

- **Rien à installer, rien à payer** : tout fonctionne dans Chrome (Chromebook, Windows, Mac, Android).
- **Vos vidéos restent sur votre appareil** : elles ne sont jamais envoyées sur Internet. Les séquences et dessins sont enregistrés dans le navigateur.
- **Fonctionne hors connexion** une fois la page ouverte une première fois ; installable comme une application (menu ⋮ de Chrome → « Installer Arc9 Lite »).

## Utilisation

1. **Ouvrir une vidéo** (MP4, MOV, WebM) depuis l'appareil.
2. **Couper** : placer la vidéo au début de l'action → **Début** (touche `I`), puis à la fin → **Fin** (touche `O`).
3. **Commenter** : nom de la séquence et commentaire (affiché en bas de la vidéo exportée).
4. **Dessiner** : mettre la vidéo en pause à l'instant voulu, choisir un outil (flèche, flèche courbe, ligne, cercle, zone, texte), une couleur, et glisser sur l'image. Option **arrêt sur image** : la vidéo s'arrête 2 à 8 s à l'apparition du dessin.
5. **Revoir** la séquence telle qu'elle sera exportée.
6. **Exporter / WhatsApp** : la vidéo MP4 (720p, ou 1080p) est créée en temps réel, puis **Partager** (WhatsApp, etc.) ou **Télécharger**. « Tout exporter » assemble toutes les séquences en une seule vidéo.

Raccourcis : `Espace` lecture/pause · `←` `→` image par image · `Maj+←/→` ±5 s · `I` / `O` début / fin · `Ctrl+Z` annuler · `Suppr` effacer le dessin sélectionné · `Échap` outil de sélection.

Le projet est retrouvé automatiquement en rouvrant la même vidéo (même nom et même taille de fichier), ou depuis **Projets récents**.

## Limites

- L'export dure le temps réel de la séquence (plus les arrêts sur image) ; garder l'onglet visible pendant l'export.
- Le format MP4 dépend du navigateur : Chrome récent produit du MP4 (H.264) ; à défaut, la vidéo est en WebM.
- Les données restent dans ce navigateur, sur cet appareil : effacer les données du site efface les séquences (pas les vidéos).

## Développement

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests unitaires
npm run build    # fichiers statiques dans dist/ (hébergement : GitHub Pages, ou tout serveur statique)
```

React + TypeScript + Vite, sans serveur. L'export dessine chaque image (vidéo + dessins + commentaire) sur un canvas enregistré par `MediaRecorder`, son compris (Web Audio).

Version allégée de [Arc9](https://github.com/mami-houssem/arc9) (analyse vidéo complète avec statistiques, IA et comptes, à héberger sur un serveur).
