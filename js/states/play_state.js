import Physics from '../physics.js';
import Debris from '../debris.js';

export default class PlayState {
    constructor(game) {
        this.game = game;
        this.hud = document.getElementById('game-hud');
        this.paused = false;
    }

    enter(params) {
        this.hud.style.display = 'block';
        this.paused = false;
        if (params && params.load) {
            this.game.saveManager.load();
        } else if (params && params.reset) {
            this.game.resetCreature();
        }

        // If resuming, don't reset
    }

    exit() {
        this.hud.style.display = 'none';
    }

    update(dt) {
        if (this.paused) return;

        // Editor Mode Check
        if (this.game.editor.active) {
            return;
        }

        const game = this.game;
        const creature = game.creature;

        // Game Over Check
        if (creature.gameStats.health <= 0) {
            game.stateMachine.change('gameover');
            return;
        }

        // --- Physics & Gameplay Logic (Extracted from GameLoop) ---
        const scale = Math.sqrt(creature.gameStats.mass / 10);
        creature.points.forEach(p => { if(p.baseRadius) p.radius = p.baseRadius * scale; });
        creature.constraints.forEach(c => { if(c.baseLength) c.length = c.baseLength * scale; });

        const head = creature.points[0];

        // Input & Movement
        const inputVec = game.input.getVector();
        const swimForce = (creature.stats.speed + 1000) * scale;
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
                const dashForce = 5000 * scale;
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

        // Spawn Logic (Scale Shift check included here or in spawnEnemies)
        game.spawnEnemies();
        game.boidManager.update(dt, game.enemies);

        // Update Mate
        if (game.mate) {
            game.mate.update(dt, head, head.radius);
            // Check Collision for Love
            const dist = Math.hypot(head.x - game.mate.points[0].x, head.y - game.mate.points[0].y);
            if (dist < head.radius + game.mate.points[0].radius + 20) {
                // EVOLUTION TIME
                if (game.settings.audioEnabled) game.audio.playTone(600, 'sine', 1.0); // Happy sound
                game.editor.toggle(true);
            }
        }

        // Allies Update
        for (let i = game.allies.length - 1; i >= 0; i--) {
             const ally = game.allies[i];
             ally.update(dt, game.enemies, head);
             Physics.checkSoftBodyCollision(creature.points, ally.points);

             // Ally Combat
             for (let e of game.enemies) {
                 const res = game.resolveCombat(ally, e);
                 if (res.hit) {
                     if (res.playerHit) {
                         const dmg = Math.max(0, e.stats.damage - ally.stats.defense);
                         ally.gameStats.health -= dmg;
                         const angle = Math.atan2(ally.points[0].y - e.points[0].y, ally.points[0].x - e.points[0].x);
                         ally.points[0].vx += Math.cos(angle) * 500;
                         ally.points[0].vy += Math.sin(angle) * 500;
                     }
                     if (res.enemyHit) {
                         const dmg = Math.max(0, ally.stats.damage - e.stats.defense);
                         e.health -= dmg;
                         if(e.onHit) e.onHit();
                         const angle = Math.atan2(e.points[0].y - ally.points[0].y, e.points[0].x - ally.points[0].x);
                         e.points[0].vx += Math.cos(angle) * 500;
                         e.points[0].vy += Math.sin(angle) * 500;
                     }
                     const mx = (ally.points[0].x + e.points[0].x) / 2;
                     const my = (ally.points[0].y + e.points[0].y) / 2;
                     game.spawnParticles(mx, my, '#ff00ff', 3, 100);
                 }
             }

             if (ally.gameStats.health <= 0) {
                 game.spawnParticles(ally.points[0].x, ally.points[0].y, '#00ffff', 10, 300);
                 game.allies.splice(i, 1);
             }
        }

        game.skillManager.update(dt);
        game.distortion.update(dt);
        game.sonar.update(dt);

        // Enemies Interaction
        const playerRadius = head.radius;
        for (let i = game.enemies.length - 1; i >= 0; i--) {
            const e = game.enemies[i];
            e.update(dt, head, playerRadius);

            Physics.checkSoftBodyCollision(creature.points, e.points);
            const result = game.resolveCombat(creature, e);

            if (result.hit) {
                if (result.playerHit) {
                     const dmg = Math.max(0, e.stats.damage - creature.stats.defense);
                     creature.gameStats.health -= dmg;
                     creature.lastDamageTime = Date.now();
                     if (dmg > 0 && navigator.vibrate) navigator.vibrate(100);

                     const angle = Math.atan2(head.y - e.points[0].y, head.x - e.points[0].x);
                     head.vx += Math.cos(angle) * 500;
                     head.vy += Math.sin(angle) * 500;
                }
                if (result.enemyHit) {
                     const dmg = Math.max(0, creature.stats.damage - e.stats.defense);
                     e.health -= dmg;
                     if(e.onHit) e.onHit();

                     const angle = Math.atan2(e.points[0].y - head.y, e.points[0].x - head.x);
                     e.points[0].vx += Math.cos(angle) * 500;
                     e.points[0].vy += Math.sin(angle) * 500;
                }

                game.hitstop = 0.05;
                const mx = (head.x + e.points[0].x) / 2;
                const my = (head.y + e.points[0].y) / 2;
                game.spawnParticles(mx, my, '#ff0044', 5, 200);

                game.camera.x += (Math.random()-0.5) * 10;
                game.camera.y += (Math.random()-0.5) * 10;
                if(game.settings.audioEnabled) game.audio.playTone(100, 'sawtooth', 0.1, mx, my, game.camera);

                if (e.health <= 0) {
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

            // Despawn Distance Logic (Scale Shift)
            const dist = Math.hypot(head.x - e.points[0].x, head.y - e.points[0].y);
            const maxDist = 3000 * scale; // Dynamic despawn distance

            if (dist > maxDist && e.bossType !== 'Leviathan') {
                game.enemies.splice(i, 1);
            }
            if (e.bossType && e.health <= 0) game.bossActive = false;
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

                if (f.type !== 'meat') {
                    const angle = Math.random() * Math.PI * 2;
                    const d = 500 * scale + Math.random() * 1000 * scale;
                    game.food.push({
                        x: head.x + Math.cos(angle) * d,
                        y: head.y + Math.sin(angle) * d,
                        radius: 5 * scale, color: '#0f0'
                    });
                }
                continue;
            }

            if (dist > 3000 * scale) {
                game.food.splice(i, 1);
            }
        }

        if (game.food.length < 50) {
            game.spawnFood(10);
        }

        // Evolve Button Visibility (Optional now since Mate system replaces it, but keep as fallback?)
        // The user said: "Appel sonar" ... "Interaction: Une autre cellule" ... "Transition".
        // The button "Evolve" was the old way.
        // Let's hide the Evolve button if we are using the new system.
        // But for safety, keep it hidden.
        // Actually, Sonar button is the key now.
        const sonarBtn = document.getElementById('sonar-btn');
        if (sonarBtn) {
            sonarBtn.style.opacity = (creature.gameStats.dna >= 10) ? 1.0 : 0.3;
        }

        // Camera Update
        game.camera.update(head.x, head.y, head.vx, head.vy, dt, creature.gameStats.mass);

        // Biome Update
        game.biomeManager.update(dt, creature);

        // Debris & Particles
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

    render(ctx) {
        if (this.game.editor.active) {
            this.game.editor.render(ctx);
            return;
        }

        const game = this.game;

        // Lighting Update
        if (game.settings.fxEnabled) {
            game.lighting.update(game.camera, {
                player: game.creature,
                enemies: game.enemies,
                food: game.food
            });
        }

        // Background
        const head = game.creature.points[0];
        const biome = game.biomeManager.getCurrentBiome(head ? head.x : 0, head ? head.y : 0);

        const bgGrad = ctx.createLinearGradient(0, 0, 0, game.height);
        bgGrad.addColorStop(0, '#000000');
        bgGrad.addColorStop(1, biome.color);
        ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, game.width, game.height);

        // Render Background Layers
        game.renderBackgroundLayers(ctx);

        // Game Entities (Using Camera)
        game.camera.apply(ctx);

        if(game.settings.fxEnabled) ctx.globalCompositeOperation = 'lighter';
        game.food.forEach(f => {
            ctx.fillStyle = f.color;
            if(game.settings.fxEnabled) { ctx.shadowColor = f.color; ctx.shadowBlur = 10; }
            ctx.beginPath(); ctx.arc(f.x, f.y, f.radius, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
        });
        ctx.globalCompositeOperation = 'source-over';

        game.debris.forEach(d => d.render(ctx));

        game.particles.forEach(p => {
            ctx.globalAlpha = p.life * 2;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        game.enemies.forEach(e => e.render(ctx));

        if (game.mate) {
            game.renderer.drawCreature(game.mate, 0); // Draw mate
        }

        game.allies.forEach(a => {
            game.renderer.drawCreature(a, a.headAngle || 0);
        });

        game.renderer.drawCreature(game.creature, game.headAngle);

        game.camera.restore(ctx);

        // Foreground
        ctx.save();
        ctx.translate(game.width/2, game.height/2);
        ctx.scale(game.camera.zoom, game.camera.zoom);
        ctx.translate(-game.camera.x * 1.5, -game.camera.y * 1.5);
        ctx.fillStyle = '#ffffff';
        game.bgFore.forEach(p => { ctx.globalAlpha = p.alpha; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });
        ctx.restore();
        ctx.globalAlpha = 1.0;

        // Post Process
        game.lighting.render(ctx);
        game.distortion.render(ctx, game.camera);
        game.sonar.render(ctx, game.camera);

        // HUD
        game.drawHUD();

        // Input Debug
        if (game.input.active && !game.editor.active) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(game.input.startX, game.input.startY, 50, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(game.input.currX, game.input.currY, 20, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
