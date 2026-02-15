# AGENTS.md - Jelly Evolution Development Guide

## Project Overview
Jelly Evolution is a mobile-first web game built with Phaser 3 and Matter.js. The goal is to evolve a soft-body creature by eating food and growing.

## Architecture
- **Engine:** Phaser 3 (Rendering, Scene Management)
- **Physics:** Matter.js (Soft Body Simulation)
- **Build:** Vite

## Key Files
- `src/main.js`: Entry point.
- `src/scenes/GameScene.js`: Main game loop, handles infinite world and input.
- `src/objects/JellyPlayer.js`: The player entity. Manages the soft-body composite (Central Core + Outer Skin particles connected by springs). Handles growth logic.
- `src/objects/Food.js`: Simple sensor bodies for food.

## Physics Logic
- The player is a **Matter.js Composite**.
- Movement is applied via `applyForce` to the central body.
- Growth scales the physics bodies and constraint lengths.

## Infinite World Strategy
- No world bounds are set.
- Food is spawned dynamically around the player in `GameScene.update()`.
- Food far away is despawned to save performance.

## Testing
- Run `npm run dev` to start the local server.
- Use the browser's mobile emulation mode to test touch controls.
