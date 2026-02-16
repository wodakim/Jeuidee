
# ARCADE EVOLUTION SIMULATOR (SPORE-LIKE) - PROJECT ROADMAP

## PROJECT VISION
To create a high-fidelity, offline-capable "Arcade Evolution Simulator" that captures the **fluidity, depth, and tactile joy** of *Spore*'s cell stage, but optimized for mobile browsers. The core experience centers on **"The Jelly Feel"**—a custom soft-body physics engine that makes movement and combat feel organic and visceral.

**Constraints:**
*   **No Frameworks:** Pure Vanilla JS (ES6+) + HTML5 Canvas. No Phaser, No React, No NPM.
*   **Offline First:** All assets procedural (Canvas API). No external images.
*   **Mobile First:** Touch-optimized controls, responsive UI, portrait/landscape support.
*   **Performance:** Optimized for low-end mobile WebViews (60fps target).

---

## CHAPTER 1: THE JELLY ENGINE (FOUNDATION)
*Focus: Physics, Fluidity, and Code Architecture*

**Objective:** Establish a robust, modular codebase and implement the core "Soft Body" physics that define the game's feel.

*   **1.1 Architecture Split:**
    *   [x] Refactor `index.html` into `index.html`, `style.css`, and `js/` modules.
    *   [x] Create `GameLoop.js`, `Physics.js`, `Renderer.js`, `Input.js`.
*   **1.2 Soft Body Physics (Verlet Integration):**
    *   [x] Implement a `VerletPoint` and `VerletConstraint` system for the creature's spine.
    *   [x] Implement "Hydrodynamics": Drag, inertia, and rotational smoothing (angular damping).
    *   [x] Create the "Skinning" algorithm: Metaballs or Spline-based hull generation around the spine.
*   **1.3 "The Juice" (Movement):**
    *   [x] Implement "Squash and Stretch" based on acceleration.
    *   [x] Add procedural "Wobble" for idle animation (breathing effect).

## CHAPTER 2: THE LIVING WORLD (ATMOSPHERE)
*Focus: Visuals, Camera, and Immersion*

**Objective:** Transform the black void into a deep, thriving abyss using procedural visuals and smart camera work.

*   **2.1 The Smart Camera:**
    *   [x] Implement `Lookahead`: Camera pans slightly in the direction of movement.
    *   [x] Implement `Dynamic Zoom`: Zoom out as speed/size increases, zoom in when idle.
    *   [x] Add `Smooth Damping`: Eliminate jitter with lerp/spring physics for the camera target.
*   **2.2 Parallax & Environment:**
    *   [x] Create a multi-layer parallax system (Background, Midground, Foreground).
    *   [x] Procedural Particles: "Plankton" dust, rising bubbles, drifting "marine snow".
    *   [ ] "God Rays": Gradient-based light shafts that rotate slowly.
    *   [x] Background "Giants": Massive, blurred shapes moving slowly in the deep layer (non-interactive).

## CHAPTER 3: THE EVOLUTIONARY WORKBENCH (EDITOR)
*Focus: UX, Customization, and Tactics*

**Objective:** Create a tactile, satisfying editor where players feel like bio-engineers.

*   **3.1 Canvas UI Integration:**
    *   [x] Replace HTML overlays with a custom Canvas-based UI for seamless transitions.
    *   [x] Implement "Blueprint Mode": A stylized grid background for the editor.
*   **3.2 Direct Manipulation:**
    *   [x] Drag & Drop parts (Fins, Spikes, Eyes) directly onto the creature's spine.
    *   [x] "Snap-to-Spine": Parts automatically orient to the spine's curvature.
    *   [ ] Mirroring: Automatically place symmetric parts.
*   **3.3 Procedural Stats:**
    *   [x] Visual feedback for stats (Speed, Damage, Defense) based on attached parts.

## CHAPTER 4: THE PREDATOR'S ECOSYSTEM (AI & GAMEPLAY)
*Focus: Conflict, Growth, and Life*

**Objective:** Populate the world with intelligent entities that interact with each other, not just the player.

*   **4.1 Entity Architecture:**
    *   [x] Refactor `Enemy` to use the same `Vertebra/SoftBody` system as the player (but simplified for performance).
    *   [x] Implement `Behavior Trees` or `State Machines` for AI (Idle, Wander, Flee, Chase, Mate).
*   **4.2 Combat 2.0 (Visceral):**
    *   [x] "Hitstop": Freeze the game for 3-4 frames on impact to emphasize force.
    *   [x] "Recoil": Physics-based knockback when colliding with spikes/shields.
    *   [x] "Gore" (Family Friendly): Bursts of colorful particles/bubbles on damage.
*   **4.3 Growth Stages:**
    *   [x] Implement distinct visual scales: `Micro` (eat plankton), `Macro` (eat others), `Titan` (apex predator).
    *   [x] Dynamic spawning: The world populates with larger enemies as the player grows.

## CHAPTER 4.5: CRITIQUE & POLISH (CURRENT)
*Focus: Addressing Feedback - Movement, Death, and UX*

**Objective:** Fix critical flaws in game feel and flow.

*   **4.5.1 Movement Tuning:**
    *   [ ] Reduce drag/inertia for a "snappier" response.
    *   [ ] Increase base speed and turning capability.
*   **4.5.2 Death Logic:**
    *   [ ] Implement proper "Game Over" state when health <= 0.
    *   [ ] Prevent health regen bug.
    *   [ ] Add Respawn functionality.
*   **4.5.3 Main Menu:**
    *   [ ] Create a Start Screen overlay.
    *   [ ] Pause game loop (or run in background mode) until Start.

## CHAPTER 5: POLISH & JUICE (THE "FUN" FACTOR)
*Focus: Feedback Loops and "Game Feel"*

**Objective:** Add the sensory details that make the game addictive.

*   **5.1 Sensory Feedback:**
    *   [ ] "Pulse" effect on the HUD when gaining DNA.
    *   [ ] Procedural Animation: Fins flap faster with speed; Eyes track nearest threats/food.
    *   [ ] Flash effects: White flash on level up/evolution.
*   **5.2 Mobile Controls 2.0:**
    *   [x] Dynamic Virtual Joystick: Appears wherever the finger touches.
    *   [ ] Visual feedback for touch (ripples, glow under finger).
*   **5.3 Sound (Optional/Stretch):**
    *   [x] Implement a simple synthesized audio engine (Oscillators) for blips and ambient drones (No external MP3s).
