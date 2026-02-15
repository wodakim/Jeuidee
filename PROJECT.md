# PROJECT: JELLY EVOLUTION (Spore-Like Web Game)

## Overview
A high-performance, single-file HTML5/JS game simulating cellular evolution. The goal is to recreate the immersive "Cell Stage" experience from Spore, focusing on organic movement, bioluminescent aesthetics, and a seamless sense of scale.

## Philosophy
*   **Zero Dependencies:** Pure Vanilla JS + HTML5 Canvas only. No external libraries (Phaser removed).
*   **Mobile-First:** Touch controls, responsive layout, optimized for WebView/Capacitor.
*   **Procedural Generation:** All graphics drawn via code (Canvas API) for infinite variety and small file size.
*   **Performance:** Custom game loop using `requestAnimationFrame` and optimized rendering techniques.

## Roadmap

### Phase 1: The "Playable Skeleton" (Current Goal)
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

### Phase 2: Advanced "Bio-Engine" Visuals
*   **Soft-Body Physics:**
    *   Replace static circles with dynamic polygons (vertices).
    *   Implement mass-spring systems for "jelly" wobble on movement and impact.
*   **Lighting:**
    *   Use `shadowBlur` for neon glow.
    *   Implement additive color blending (`globalCompositeOperation = 'lighter'`).
*   **Particles:**
    *   Trail effects for player movement.
    *   Burst effects on eating/damage.
*   **Procedural Textures:**
    *   Generate internal cell details (nucleus, organelles) via noise/patterns.

### Phase 3: Evolution & Complexity
*   **Editor:** A simple UI to spend DNA points on parts (Spikes, Fins, Mouths).
*   **Parts System:**
    *   Modular attachment system (parent/child hierarchy in JS objects).
    *   Functional stats (Speed, Damage, Sight Radius).
*   **Layered World:**
    *   Parallax backgrounds with varying depth.
    *   Transition logic: As player grows past a threshold, the background shifts to imply deeper/larger ocean layers.

### Phase 4: Audio & Polish
*   **Procedural Audio:** (Optional) Web Audio API to generate simple ambient sounds and SFX.
*   **Optimization:** Object pooling for particles and food to maintain 60FPS on mobile.
*   **Save System:** Robust `localStorage` implementation for game state persistence.

## Architecture (Technical)
*   **`Game` Class:** Manages the loop, state, and high-level systems.
*   **`Renderer` Class:** Handles the Canvas context and drawing primitives.
*   **`Input` Class:** Abstraction for Mouse/Touch events.
*   **`Entity` Class:** Base class for all game objects (Position, Velocity, Radius).
    *   `Player` extends `Entity`
    *   `Food` extends `Entity`
*   **`Vector2` Utility:** Simple math helper for physics calculations.
