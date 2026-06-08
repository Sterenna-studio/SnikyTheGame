# SnikyTheGame

Prototype **pré-alpha web** de SnikyTheGame orienté **runner**.

La cible active du dépôt est la version web à la racine (`index.html`,
`styles.css`, `app.js`, `assets/`). Les dossiers `Sniky*`, `Sniky_mob_vers`
et `PIRATES_chronicles` sont conservés comme historiques/prototypes Pygame.

## Analyse du repository actuel

Historique Git disponible dans ce repo local:

- `faee0c1` : commit initial du projet.
- `85bd688` : première pré-alpha web runner (UI + logique de base).

Cette version améliore la pré-alpha en intégrant un rendu **sprite-like**,
plusieurs obstacles, et une boucle de jeu plus lisible pour les tests gameplay.

## Lancer le projet

```bash
python3 -m http.server 4173
```

Puis ouvrir: `http://localhost:4173`

## Fonctionnalités de la pré-alpha

- Runner 2D web jouable au clavier (saut, tir, pause, reset).
- Sprites du joueur (run frame A/B + jump) et obstacles (rocher, pics, drone).
- Niveaux courts avec progression, déblocage local et difficulté croissante.
- Obstacles et ennemis variés (sol + aérien + comportements spéciaux).
- Bonus de munitions, tir et collisions projectile/ennemi.
- Défilement avec parallax simple pour perception de vitesse.
- Score + distance + vitesse + combo d’esquive.
- Sauvegarde locale du meilleur score via `localStorage`.

## Contrôles

- `Espace` / `Flèche haut` / `Z` / `W` : sauter.
- `F` / `X` / clic sur le canvas : tirer si des munitions sont disponibles.
- `P` : pause.
- Boutons UI: démarrer / pause / recommencer.

## Direction unification

La version web à la racine est la cible unique. Les mécaniques utiles des
prototypes Pygame doivent être portées progressivement vers `app.js` plutôt que
maintenues en parallèle dans de nouvelles variantes. Les dossiers historiques
restent consultables comme référence tant que la version web n’a pas récupéré
les fonctionnalités nécessaires.

## Prochaines étapes suggérées

- Ajouter des animations plus fluides (sprite-sheet / interpolation).
- Ajouter des bonus temporaires (shield, dash) et patterns d’obstacles.
- Intégrer son/SFX (jump, hit, dodge combo).
- Ajouter écran titre + menu difficulté + best times.
