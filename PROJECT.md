# PROJECT: JELLY EVOLUTION (Spore-Like Web Game)

## Overview
A high-performance, single-file HTML5/JS game simulating cellular evolution. The goal is to recreate the immersive "Cell Stage" experience from Spore, focusing on organic movement, bioluminescent aesthetics, and a seamless sense of scale.

## Philosophy
*   **Zero Dependencies:** Pure Vanilla JS + HTML5 Canvas only. No external libraries (Phaser removed).
*   **Mobile-First:** Touch controls, responsive layout, optimized for WebView/Capacitor.
*   **Procedural Generation:** All graphics drawn via code (Canvas API) for infinite variety and small file size.
*   **Performance:** Custom game loop using `requestAnimationFrame` and optimized rendering techniques.

## Roadmap

### Phase 1: The "Playable Skeleton" (COMPLETED)
*   **Core Engine:** Implement a robust `GameLoop` with delta time handling.
*   **Rendering:** Setup a flexible `CanvasRenderer` with support for camera transformations (Zoom/Pan).
*   **Input:** Multi-touch capable Virtual Joystick.
*   **Entities:**
    *   **Player:** Smooth velocity-based movement with friction.
    *   **Food:** Static collectibles that increase mass.
    *   **Enemies:** Basic AI (Wander/Seek) with collision detection.
*   **Mechanics:**
    *   Eat to grow (Scale increase).
    *   Camera Zoom-out on growth (The "Gigantism" effect foundation).
    *   Soft World Boundaries.

### Phase 2: Organic Life & Ecosystem (COMPLETED)
*   **Soft-Body Physics ("The Jelly Engine"):**
    *   Replace static circles with dynamic polygons (Spring-mass system).
    *   Deformation based on velocity and impact.
    *   Idle "breathing" animation.
*   **Advanced Rendering:**
    *   Additive color blending (`lighter`) for intense neon glow.
    *   Internal cell details (Nucleus, organelles) with parallax movement.
*   **Ecosystem (AI):**
    *   Distinct Enemy Types: Aggressors (Spiky) vs Grazers (Round).
    *   Steering Behaviors: Seek, Flee, Wander, Flock.
*   **Juiciness:**
    *   Particle system for eating/combat.
    *   Physics-based knockback (No Screen Shake).

### Phase 3: Deep Evolution & Atmosphere (Current Goal)
*   **Abyssal Atmosphere:**
    *   Multi-layer Parallax (Deep blur blobs, Midground bubbles).
    *   Removal of debug grid.
*   **Creature Editor Engine (The "Spore" Core):**
    *   **Vertebrae System:** Player is no longer a single circle but a spine of interconnected nodes (vertebrae).
    *   **Skinning:** Procedural hull generation around the spine (Metaballs/Convex Hull).
    *   **Parts Placement:** Drag-and-drop placement of parts (Spikes, Fins) onto the skin surface.
    *   **Mirror Mode:** Option to symmetry parts.
*   **Evolution UI:**
    *   Full-screen "Editor Mode" overlay.
    *   Sliders for vertebra size/position.
    *   Palette for parts.

### Phase 4: Audio & Polish
*   **Procedural Audio:** (Optional) Web Audio API to generate simple ambient sounds and SFX.
*   **Optimization:** Object pooling for particles and food to maintain 60FPS on mobile.
*   **Save System:** Robust `localStorage` implementation for complex creature data (spine + parts).

## Architecture (Technical)
*   **`Game` Class:** Manages the loop, state, and high-level systems.
*   **`Creature` Class:** Replaces simple `SoftBody`. Contains `spine[]` and `skin`.
*   **`Vertebra` Class:** A node in the spine with position and radius.
*   **`Renderer` Class:** Handles the Canvas context and drawing primitives.
*   **`Input` Class:** Abstraction for Mouse/Touch events.
*   **`Vector2` Utility:** Simple math helper for physics calculations.
