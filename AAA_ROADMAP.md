# PROPOSITIONS D'AMÉLIORATION "TRIPLE A" (MOBILE)

Voici 10 axes d'amélioration technique et ludique pour pousser le jeu vers une qualité studio, tout en respectant la contrainte "Single File / Canvas".

## 1. Moteur d'Éclairage Dynamique 2D (Raycasting)
**Concept :** Au lieu d'un simple `additive blending`, implémenter un système d'ombres portées 2D. Les créatures bioluminescentes projetteraient des ombres dynamiques sur les décors et les autres monstres.
**Technique :** Utiliser un shader simplifié (ou algorithme de raycasting 2D sur Canvas offscreen) pour calculer l'occlusion de la lumière. Cela donnerait une profondeur immense aux abysses.

## 2. Animation Procédurale Avancée (Inverse Kinematics)
**Concept :** Remplacer les animations sinusoïdales (vagues) des tentacules et colonnes vertébrales par de la **Cinématique Inverse (IK)**. Les membres réagiraient physiquement à l'inertie, aux courants et aux collisions (se replier lors d'un impact, s'étendre pour attraper une proie).
**Technique :** Algorithme FABRIK (Forward And Backward Reaching Inverse Kinematics) léger.

## 3. Écosystème Réactif & Vivant (Boids)
**Concept :** Les ennemis ne devraient pas juste errer. Implémenter des comportements de groupe (bancs de poissons) qui fuient ou attaquent en coordination.
**Technique :** Algorithme de Reynolds (Separation, Alignment, Cohesion). Ajouter des chaînes alimentaires : les gros mangent les moyens qui mangent les petits, indépendamment du joueur.

## 4. Destruction Soft-Body Viscérale
**Concept :** Quand un ennemi meurt, il ne devrait pas juste "pop" en particules. Il devrait se déchirer ou se diviser organiquement.
**Technique :** Utiliser la triangulation de Delaunay ou Voronoi pour découper le maillage physique de la créature en morceaux interactifs qui flottent et peuvent être mangés individuellement.

## 5. Audio Spatial & Adaptatif (Wwise-lite)
**Concept :** Une immersion totale via le son.
- **Spatialisation :** Le son change de volume et de "muffled" (filtre passe-bas) selon la distance et la direction.
- **Musique Dynamique :** La nappe sonore s'intensifie (couches supplémentaires, tempo) selon le niveau de danger ou la taille de la créature.

## 6. Biomes Infinis & Streaming
**Concept :** Casser la monotonie du fond bleu foncé. Créer des zones distinctes (Vents Thermaux Rouges, Forêts d'Algues Vertes, Fosses des Mariannes Noires) qui se chargent de manière fluide sans temps de chargement.
**Technique :** Génération de bruit de Perlin pour déterminer le biome en fonction des coordonnées (X, Y) du joueur.

## 7. Génétique Partagée (Asynchrone)
**Concept :** Permettre aux joueurs de rencontrer les créatures créées par d'autres joueurs.
**Technique :** Générer un "Code ADN" (String Base64) de la créature. Les joueurs peuvent copier/coller ce code pour faire apparaître la créature d'un ami comme un "Boss" dans leur propre partie.

## 8. Interface Diégétique & "Juice"
**Concept :** Supprimer les barres de vie classiques. La santé est représentée par l'intensité de la bioluminescence ou l'intégrité de la membrane cellulaire.
**UI 3D :** Utiliser des transformations CSS 3D pour que les menus semblent flotter dans l'eau (parallax souris/gyroscope).

## 9. Haptique Immersive (Vibration API)
**Concept :** Utiliser l'API `navigator.vibrate` avec des patterns complexes.
- **Battement de coeur :** Vibration légère et rythmique quand la santé est basse.
- **Impact lourd :** Vibration courte et forte lors d'un choc.
- **Cri de monstre :** Vibration longue et décroissante.

## 10. Mode "New Game+" Évolutif (Roguelite)
**Concept :** À la mort, une partie de l'ADN est conservée pour débloquer des "Mutations Permanentes" (Vitesse de base +10%, Vision nocturne, etc.). L'ancienne créature du joueur devient un "Titan" errant dans la prochaine partie, créant une légende personnelle.
