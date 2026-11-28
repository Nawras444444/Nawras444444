# White Motion 3D — HyperFrames

Vidéo verticale 1080×1920, 30 fps, 198,27 s, montée sur la voix off ElevenLabs (arabe).
Elle reprend l'histoire « White Motion Story » (Pixar / Red Bull / Nokia) avec le style des planches d'icônes 3D (verre, or et cyan).

## Structure

- `index.html` : composition racine (fond, 5 chapitres, sous-titres, voix off)
- `compositions/bg.html` : sol 3D en perspective, particules, formes de verre flottantes, flashs entre chapitres, barre de progression
- `compositions/intro|pixar|redbull|nokia|outro.html` : icônes 3D animées avec effets de montage (rotoscopie, generative expand, tracking, cube 3D, étalonnage chaud→froid, 120 FPS, égaliseur audio…)
- `compositions/captions.html` : sous-titres arabe + anglais (cartes en verre, cartes « SKILL » blanches)
- `assets/icons/` : icônes découpées dans les planches de référence (fond rendu transparent)

## Modifier

Les timings, icônes, effets et textes sont dans `tools/build.mjs` (tableaux `VIS` et `CAPS`), puis :

```bash
node tools/build.mjs
npx hyperframes check
npx hyperframes render -o renders/white-motion-3d.mp4 --quality delivery
```

Pour redécouper les icônes : `tools/crop_icons.py`, puis conversion en JPEG et `tools/alpha_icons.py`.
