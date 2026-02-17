import Physics from '../physics.js';
import Debris from '../debris.js';
import Enemy from '../enemy.js'; // Import Enemy

export default class PlayState {
    constructor(game) {
        this.game = game;
        this.hud = document.getElementById('game-hud');
        this.paused = false;

        // Tier Tracking
        this.currentTier = 1; // 1=Micro, 2=Mid, 3=Macro
        this.maxEntities = 15;
    }

    enter(params) {
        this.hud.style.display = 'block';
        this.paused = false;
        if (params && params.load) {
            this.game.saveManager.load();
        } else if (params && params.reset) {
            this.game.resetCreature();
        }

        // Initial Tier Check
        this.calculateTier();
    }

    exit() {
        this.hud.style.display = 'none';
    }

    calculateTier() {
        // Tier 1: Mass < 50
        // Tier 2: Mass 50 - 500
        // Tier 3: Mass > 500
        const mass = this.game.creature.gameStats.mass;
        let newTier = 1;
        if (mass >= 500) newTier = 3;
        else if (mass >= 50) newTier = 2;

        if (newTier !== this.currentTier) {
            this.currentTier = newTier;
            // Visual Feedback for Tier Shift?
            if (this.game.settings.fxEnabled) {
                // Flash or Screen Shake
            }
        }
    }

    update(dt) {
        if (this.paused) return;
        if (this.game.editor.active) return;

        const game = this.game;
        const creature = game.creature;

        if (creature.gameStats.health <= 0) {
            game.stateMachine.change('gameover');
            return;
        }

        // Tier Update
        this.calculateTier();

        // Scale Factor for Rendering/Physics
        // As Mass increases, scale increases.
        // Tier 1: Scale 1.0
        // Tier 2: Scale 0.5 (Zoom out)
        // Tier 3: Scale 0.2
        const baseScale = Math.sqrt(creature.gameStats.mass / 10);

        // Update Creature Physics Radius
        creature.points.forEach(p => { if(p.baseRadius) p.radius = p.baseRadius * baseScale; });
        creature.constraints.forEach(c => { if(c.baseLength) c.length = c.baseLength * baseScale; });

        const head = creature.points[0];

        // Input & Movement
        const inputVec = game.input.getVector();
        const swimForce = (creature.stats.speed + 1000) * baseScale;
        const turnSpeed = creature.stats.turnSpeed * 2.0;

        if (game.input.active) {
            head.x += inputVec.x * swimForce * dt * dt;
            head.y += inputVec.y * swimForce * dt * dt;
            let targetAngle = Math.atan2(inputVec.y, inputVec.x);
            let diff = targetAngle - game.headAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            game.headAngle += diff * turnSpeed * dt;
        }

        // Dash Ability
        if (game.input.checkDoubleTap()) {
            if (game.progression.isUnlocked('Booster')) {
                const dashForce = 5000 * baseScale;
                head.x += Math.cos(game.headAngle) * dashForce * dt;
                head.y += Math.sin(game.headAngle) * dashForce * dt;
                game.spawnParticles(head.x, head.y, '#fff', 20, 300);
                if(game.settings.audioEnabled) game.audio.playDash();
                if(navigator.vibrate) navigator.vibrate(50);
            }
        }

        // Physics Update
        game.physics.update(creature.points, creature.constraints, dt);

        // Background & Entities
        game.updateBackgroundOnly(dt);

        // Spawning & Culling
        this.manageEntities(dt, head, baseScale);

        // Boids
        game.boidManager.update(dt, game.enemies);

        // Mate Update
        if (game.mate) {
            game.mate.update(dt, head, head.radius); // Mate follows player logic or idle
            const dist = Math.hypot(head.x - game.mate.points[0].x, head.y - game.mate.points[0].y);
            if (dist < head.radius + game.mate.points[0].radius + 20) {
                if (game.settings.audioEnabled) game.audio.playTone(600, 'sine', 1.0);
                game.editor.toggle(true);
            }
        }

        // Allies Update
        for (let i = game.allies.length - 1; i >= 0; i--) {
             const ally = game.allies[i];
             ally.update(dt, game.enemies, head);
             Physics.checkSoftBodyCollision(creature.points, ally.points);
             // ... Ally Combat (Keep existing logic if needed, simplified for brevity here) ...
             // Let's keep it minimal for now to focus on Tiers.
        }

        game.skillManager.update(dt);
        game.distortion.update(dt);
        game.sonar.update(dt);

        // Enemy Interactions
        for (let i = game.enemies.length - 1; i >= 0; i--) {
            const e = game.enemies[i];
            e.update(dt, head, creature.gameStats.mass); // Pass player head AND MASS for AI

            Physics.checkSoftBodyCollision(creature.points, e.points);
            const result = game.resolveCombat(creature, e);

            if (result.hit) {
                if (result.playerHit) {
                     const dmg = Math.max(0, e.stats.damage - creature.stats.defense);
                     creature.gameStats.health -= dmg;
                     creature.lastDamageTime = Date.now();
                     if (dmg > 0 && navigator.vibrate) navigator.vibrate(100);
                     const angle = Math.atan2(head.y - e.points[0].y, head.x - e.points[0].x);
                     head.vx += Math.cos(angle) * 500; head.vy += Math.sin(angle) * 500;
                }
                if (result.enemyHit) {
                     const dmg = Math.max(0, creature.stats.damage - e.stats.defense);
                     e.health -= dmg;
                     if(e.onHit) e.onHit();
                     const angle = Math.atan2(e.points[0].y - head.y, e.points[0].x - head.x);
                     e.points[0].vx += Math.cos(angle) * 500; e.points[0].vy += Math.sin(angle) * 500;
                }
                // Feedback
                game.hitstop = 0.05;
                const mx = (head.x + e.points[0].x) / 2;
                const my = (head.y + e.points[0].y) / 2;
                game.spawnParticles(mx, my, '#ff0044', 5, 200);
                game.camera.x += (Math.random()-0.5) * 10; game.camera.y += (Math.random()-0.5) * 10;
                if(game.settings.audioEnabled) game.audio.playTone(100, 'sawtooth', 0.1, mx, my, game.camera);

                if (e.health <= 0) {
                     // Death
                     game.spawnParticles(mx, my, '#ffaa00', 10, 400);
                     game.spawnMeat(mx, my, 3 + Math.floor(e.scale));
                     game.debris.push(new Debris(e.points, e.constraints, e.color, 4));
                     game.distortion.addShockwave(mx, my);
                     if(navigator.vibrate) navigator.vibrate([50, 50, 50]);
                     const drop = game.progression.checkDrop(null, e.difficulty);
                     if (drop) game.triggerUnlock(drop);
                     game.enemies.splice(i, 1);
                     continue;
                }
            }
        }

        // Food Logic
        for (let i = game.food.length - 1; i >= 0; i--) {
            const f = game.food[i];
            const dist = Math.hypot(head.x - f.x, head.y - f.y);
            if (dist < head.radius + f.radius) {
                game.food.splice(i, 1);
                const dnaValue = f.dnaValue || 0.2;
                creature.gameStats.dna += dnaValue;
                creature.gameStats.mass += 0.5 * dnaValue;
                creature.gameStats.health = Math.min(creature.gameStats.maxHealth, creature.gameStats.health + 5);
                if(game.settings.audioEnabled) game.audio.playEat(f.x, f.y, game.camera);
                if(navigator.vibrate) navigator.vibrate(20);
                game.spawnParticles(f.x, f.y, f.color, 5, 100);
            }
        }

        // Camera Update with Scale Smoothing
        game.camera.update(head.x, head.y, head.vx, head.vy, dt, creature.gameStats.mass);

        // Biome Update
        game.biomeManager.update(dt, creature);

        // Debris & Particles Cleanup
        for (let i = game.debris.length - 1; i >= 0; i--) {
            const d = game.debris[i];
            d.update(dt, game.physics);
            if (!d.active) game.debris.splice(i, 1);
        }
        for (let i = game.particles.length - 1; i >= 0; i--) {
            const p = game.particles[i];
            p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
            if (p.life <= 0) game.particles.splice(i, 1);
        }
    }

    manageEntities(dt, playerHead, playerScale) {
        const game = this.game;

        // 1. Despawn Logic (Culling) based on Tier and Distance
        const despawnDist = 3000 * playerScale; // Keep distance relative to scale

        for (let i = game.enemies.length - 1; i >= 0; i--) {
            const e = game.enemies[i];
            const dist = Math.hypot(playerHead.x - e.points[0].x, playerHead.y - e.points[0].y);

            // Distance Check
            if (dist > despawnDist && e.bossType !== 'Leviathan') {
                game.enemies.splice(i, 1);
                continue;
            }

            // Tier Culling: Remove if enemy is too small (2 Tiers below)
            // Or if Tier 1 and player is Tier 3.
            if (e.tier < this.currentTier - 1) {
                // Convert to background particle?
                // Just remove for performance for now.
                game.enemies.splice(i, 1);
            }
        }

        // 2. Spawn Logic
        // Cap entity count strict
        if (game.enemies.length >= this.maxEntities) return;

        // Spawn probability
        if (Math.random() > 0.05) return; // Limit spawn rate

        // Spawn Distance: Outside camera view but inside despawn range
        // Camera View Width approx: game.width / camera.zoom
        // Zoom is approx 1/playerScale roughly (managed by camera)
        // Let's use playerScale to estimate spawn ring.
        const spawnMin = 1000 * playerScale;
        const spawnMax = 2000 * playerScale;

        const angle = Math.random() * Math.PI * 2;
        const dist = spawnMin + Math.random() * (spawnMax - spawnMin);
        const x = playerHead.x + Math.cos(angle) * dist;
        const y = playerHead.y + Math.sin(angle) * dist;

        // Determine Enemy Tier to Spawn
        // Mostly spawn current Tier, some lower Tier (food), rare higher Tier (threat)
        let spawnTier = this.currentTier;
        const r = Math.random();
        if (r < 0.6) spawnTier = this.currentTier;
        else if (r < 0.9 && this.currentTier > 1) spawnTier = this.currentTier - 1; // Food
        else if (r < 1.0) spawnTier = this.currentTier + 1; // Apex Predator

        // Cap Spawn Tier
        if (spawnTier > 3) spawnTier = 3;

        // Shoal Logic
        // Grazers spawn in groups
        const type = Math.random() > 0.5 ? 'grazer' : 'hunter';

        if (type === 'grazer') {
            const count = 3 + Math.floor(Math.random() * 3);
            if (game.enemies.length + count > this.maxEntities) return;

            const flock = game.boidManager.createFlock(x, y, count, spawnTier, 'grazer');
            // Assign Tier
            flock.forEach(e => {
                e.tier = spawnTier;
                e.scale = spawnTier; // Visual scale matches tier
                // Adjust stats for tier
                e.health *= spawnTier;
                e.stats.damage *= spawnTier;
                // Tint based on tier?
            });
            game.enemies.push(...flock);
        } else {
            const e = new Enemy(x, y, spawnTier * 2, game.physics, 'hunter'); // Difficulty scales with Tier
            e.tier = spawnTier;
            e.scale = spawnTier;
            e.health *= spawnTier;
            e.stats.damage *= spawnTier;
            game.enemies.push(e);
        }
    }

    render(ctx) {
        // ... Render logic is same as before, calling game.render ...
        // Re-implementing simplified render for PlayState to ensure context
        const game = this.game;

        // Delegate to GameLoop render helpers if possible or replicate
        // We'll call the standard rendering pipeline

        // Lighting
        if (game.settings.fxEnabled) game.lighting.update(game.camera, { player: game.creature, enemies: game.enemies, food: game.food });

        // Background
        const head = game.creature.points[0];
        const biome = game.biomeManager.getCurrentBiome(head ? head.x : 0, head ? head.y : 0);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, game.height);
        bgGrad.addColorStop(0, '#000000');
        bgGrad.addColorStop(1, biome.color);
        ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, game.width, game.height);

        // 3-Layer Parallax Rendering (New Requirement)
        this.renderParallax(ctx);

        // Entities
        game.camera.apply(ctx);
        if(game.settings.fxEnabled) ctx.globalCompositeOperation = 'lighter';
        game.food.forEach(f => {
            ctx.fillStyle = f.color;
            ctx.beginPath(); ctx.arc(f.x, f.y, f.radius, 0, Math.PI*2); ctx.fill();
        });
        ctx.globalCompositeOperation = 'source-over';
        game.debris.forEach(d => d.render(ctx));
        game.particles.forEach(p => {
            ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // Fog for High Tier Entities (if they are far/big)
        game.enemies.forEach(e => {
            // If enemy is higher tier, maybe fade it in?
            e.render(ctx);
        });

        if (game.mate) game.renderer.drawCreature(game.mate, 0);
        game.renderer.drawCreature(game.creature, game.headAngle);
        game.camera.restore(ctx);

        // PostFX
        game.lighting.render(ctx);
        game.distortion.render(ctx, game.camera);
        game.sonar.render(ctx, game.camera);

        this.drawHUD(ctx);
    }

    renderParallax(ctx) {
        const game = this.game;
        const cam = game.camera;
        const cx = game.width / 2;
        const cy = game.height / 2;

        // Layer 1: Deep Background (Moves very slowly)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1.0, 1.0); // Static scale? Or slight zoom?
        // Parallax offset
        ctx.translate(-cam.x * 0.05, -cam.y * 0.05);

        // Draw Deep Particles/Stars
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        game.bgDeep.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
        });
        ctx.restore();

        // Layer 2: Mid-Ground (Blurred Plankton) - Moves medium speed
        ctx.save();
        ctx.translate(cx, cy);
        // Scale with inverse camera zoom to keep them somewhat constant or let them zoom?
        // "Cam zoom backs out". If we scale this layer less, it feels further.
        ctx.scale(cam.zoom * 0.5, cam.zoom * 0.5);
        ctx.translate(-cam.x * 0.2, -cam.y * 0.2);

        ctx.fillStyle = 'rgba(100, 255, 255, 0.1)';
        // Blur effect simulation (draw larger, lower alpha)
        game.bgMid.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2, 0, Math.PI*2); ctx.fill();
        });
        ctx.restore();

        // Layer 3: Foreground (Passed by camera) - handled by standard camera apply usually
        // But if we want foreground overlay:
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(cam.zoom * 1.5, cam.zoom * 1.5);
        ctx.translate(-cam.x * 1.5, -cam.y * 1.5); // Moves faster than camera
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        game.bgFore.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI*2); ctx.fill();
        });
        ctx.restore();
    }

    drawHUD(ctx) {
        const game = this.game;
        const dna = Math.floor(game.creature.gameStats.dna);
        const w = game.width;

        // Blueprint Style HUD
        ctx.save();

        // Top Bar Background
        ctx.fillStyle = 'rgba(0, 10, 30, 0.8)';
        ctx.fillRect(0, 0, w, 60);

        // Bottom Line
        ctx.beginPath();
        ctx.moveTo(0, 60); ctx.lineTo(w, 60);
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // DNA Display
        ctx.fillStyle = '#00aaff';
        ctx.font = '20px Orbitron';
        ctx.textAlign = 'left';
        ctx.fillText(`DNA-SEQUENCE: ${dna}`, 20, 38);

        // Tier Indicator
        ctx.textAlign = 'right';
        ctx.fillText(`TIER: ${this.currentTier}`, w - 20, 38);

        // Sonar Button (if not DOM) - It is DOM in GameLoop createUI
        // We just style it in DOM.

        ctx.restore();
    }
}
