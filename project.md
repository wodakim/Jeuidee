# Jelly Evolution - Mobile Web Game (Capacitor Ready)

## 1. Concept & Vibe
- **Genre:** Action / Simulation Arcade.
- **Platform:** Android (via Capacitor/WebView), playable offline.
- **Vibe:** "Brainless", colorful, "jelly" physics, comedic sounds.
- **Gameplay:** Similar to Spore's Cell Stage but with a focus on physics and procedural generation.
- **Core Loop:** Eat -> Grow -> Evolve (add parts) -> Repeat.

## 2. Technical Stack
- **Engine:** Phaser 3 (Robust scene management, mobile input).
- **Physics:** Matter.js (Soft body physics, constraints).
- **Build Tool:** Vite (Fast, optimized for modern web).
- **Storage:** LocalStorage (Save creature JSON for offline persistence).
- **Audio:** Lightweight MP3/OGG files.

## 3. Architecture
### File Structure
- `src/main.js`: Entry point. Initializes Phaser game instance.
- `src/scenes/`:
  - `BootScene.js`: Preloads assets (if any) and sets up global registry.
  - `MenuScene.js`: Main menu (Start, Settings).
  - `GameScene.js`: The main gameplay loop (Physics world, Camera).
  - `EditorScene.js`: Creature editor (UI, Drag & Drop).
- `src/objects/`:
  - `JellyPlayer.js`: The player entity. Handles soft body physics, input forces, and growth.
  - `Food.js`: Consumables.
  - `Enemy.js`: AI creatures.
- `src/utils/`: Helper functions (Math, Random generation).
- `assets/`: Audio files, minimal textures (if needed).

### Key Systems
#### A. Soft Body Physics (Jelly)
- The creature is a **Composite** body in Matter.js.
- A central circle connected to outer circles via **Springs (Constraints)**.
- **Rendering:** Use `Phaser.GameObjects.Graphics` to draw the shape by connecting the outer bodies with curves, filling with a "jelly" color.
- **Growth:** Scale the constraint lengths and body radii as the player eats.

#### B. Infinite World
- **Procedural Generation:** The world is generated around the player.
- **Chunk System or Radius Spawning:** As the player moves, new food/enemies spawn in the direction of movement. Old entities far behind are destroyed.
- **Parallax Background:** Simple shapes/particles on a lower layer moving slower than the camera.

#### C. Input (Mobile First)
- **Virtual Joystick:**
  - Touch anywhere on screen -> Center of joystick.
  - Drag -> Vector for movement force.
  - Release -> Stop applying force.
- **Auto-Attack:** Collision with "edible" objects triggers eating automatically.

#### D. Editor
- **Snap-to-Surface:** Dragging a part (Eye, Spike) calculates the nearest point on the main body's hull and attaches it.
- **Symmetry:** Automatically adds a mirrored part if enabled.

## 4. Requirements for "Jelly Prototype" (Step 1)
- [ ] Initialize Phaser + Matter.js.
- [ ] Create the Jelly Player (Soft Body Composite).
- [ ] Implement Soft Body Rendering (Graphics).
- [ ] Implement Virtual Joystick Control.
- [ ] Implement Camera Follow (Smooth Lerp + Zoom).
