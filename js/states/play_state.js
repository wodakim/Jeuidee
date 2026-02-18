import Physics from '../physics.js';
import Debris from '../debris.js';
import Enemy from '../enemy.js';

export default class PlayState {
    constructor(game) {
        this.game = game;
        this.hud = document.getElementById('game-hud');
        this.paused = false;

        this.currentTier = 1;
        this.maxEntities = 15;
        this.apexTimer = 30.0;
        this.activeApex = null;
    }

    enter(params) {
        this.hud.style.display = 'block';
        this.paused = false;
        if (params && params.load) {
            this.game.saveManager.load();
        } else if (params && params.reset) {
            this.game.resetCreature();
        }
        this.calculateTier();
    }

    exit() {
        this.hud.style.display = 'none';
    }

    calculateTier() {
        // Infinite Scale Tier Logic
        const mass = this.game.creature.gameStats.mass;
        const newTier = Math.floor(Math.log10(Math.max(10, mass))) || 1;

        if (newTier > this.currentTier) {
            this.currentTier = newTier;
            // Trigger Evolutionary Leap (Brain State)
            if (this.currentTier > 1) {
                this.game.stateMachine.change('brain');
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

        this.calculateTier();

        // Scale Logic: Player radius grows with Mass
        const baseScale = Math.sqrt(creature.gameStats.mass / 10);
        creature.points.forEach(p => { if(p.baseRadius) p.radius = p.baseRadius * baseScale; });
        creature.constraints.forEach(c => { if(c.baseLength) c.length = c.baseLength * baseScale; });

        const head = creature.points[0];
        const inputVec = game.input.getVector();
        // Adjust physics force to feel consistent at scale
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

        if (game.input.checkDoubleTap()) {
            if (game.progression.isUnlocked('Booster')) {
                const dashForce = 5000 * baseScale;
                head.x += Math.cos(game.headAngle) * dashForce * dt;
                head.y += Math.sin(game.headAngle) * dashForce * dt;
                game.spawnParticles(head.x, head.y, '#fff', 20, 300 * baseScale);
                if(game.settings.audioEnabled) game.audio.playDash();
                if(navigator.vibrate) navigator.vibrate(50);
            }
        }

        game.physics.update(creature.points, creature.constraints, dt);

        // Background Update (Pass Camera)
        game.background.update(dt, game.camera);

        this.manageEntities(dt, head, baseScale);
        game.boidManager.update(dt, game.enemies);

        if (game.mate) {
            game.mate.update(dt, head, head.radius);
            const dist = Math.hypot(head.x - game.mate.points[0].x, head.y - game.mate.points[0].y);
            if (dist < head.radius + game.mate.points[0].radius + 20 * baseScale) {
                if (game.settings.audioEnabled) game.audio.playTone(600, 'sine', 1.0);
                game.editor.toggle(true);
            }
        }

        for (let i = game.allies.length - 1; i >= 0; i--) {
             const ally = game.allies[i];
             ally.update(dt, game.enemies, head);
             Physics.checkSoftBodyCollision(creature.points, ally.points);
        }

        game.skillManager.update(dt);
        game.distortion.update(dt);
        game.sonar.update(dt);

        for (let i = game.enemies.length - 1; i >= 0; i--) {
            const e = game.enemies[i];
            e.update(dt, head, creature.gameStats.mass);

            Physics.checkSoftBodyCollision(creature.points, e.points);
            const result = this.resolveCombat(creature, e);

            if (result.hit) {
                if (result.playerHit) {
                     const impact = result.impulse || 0;
                     const velocityDmg = Math.min(20, impact * 0.05);
                     const dmg = Math.max(0, e.stats.damage + velocityDmg - creature.stats.defense);
                     creature.gameStats.health -= dmg;
                     creature.lastDamageTime = Date.now();
                     if (dmg > 0 && navigator.vibrate) navigator.vibrate(100);
                     const angle = Math.atan2(head.y - e.points[0].y, head.x - e.points[0].x);
                     head.vx += Math.cos(angle) * 500; head.vy += Math.sin(angle) * 500;
                }
                if (result.enemyHit) {
                     const impact = result.impulse || 0;
                     const velocityDmg = Math.min(20, impact * 0.05);
                     const dmg = Math.max(0, creature.stats.damage + velocityDmg - e.stats.defense);
                     e.health -= dmg;
                     if(e.onHit) e.onHit();
                     const angle = Math.atan2(e.points[0].y - head.y, e.points[0].x - head.x);
                     e.points[0].vx += Math.cos(angle) * 500; e.points[0].vy += Math.sin(angle) * 500;
                }

                game.hitstop = 0.05;
                const mx = (head.x + e.points[0].x) / 2;
                const my = (head.y + e.points[0].y) / 2;
                game.spawnParticles(mx, my, '#ff0044', 5, 200 * baseScale);
                game.camera.x += (Math.random()-0.5) * 10; game.camera.y += (Math.random()-0.5) * 10;
                if(game.settings.audioEnabled) game.audio.playTone(100, 'sawtooth', 0.1, mx, my, game.camera);

                if (e.health <= 0) {
                     game.spawnParticles(mx, my, '#ffaa00', 10, 400 * baseScale);
                     // Meat scaling
                     game.spawnMeat(mx, my, 3 + Math.floor(e.scale));
                     game.debris.push(new Debris(e.points, e.constraints, e.color, 4));
                     game.distortion.addShockwave(mx, my);
                     if(navigator.vibrate) navigator.vibrate([50, 50, 50]);

                     // Boss Kill Logic
                     if (e.bossType === 'Leviathan') {
                         this.game.stateMachine.change('emergence');
                         return;
                     }

                     const drop = game.progression.checkDrop(null, e.tier * 2);
                     if (drop) game.triggerUnlock(drop);
                     if (e.persistent) this.activeApex = null;
                     game.enemies.splice(i, 1);
                     continue;
                }
            }
        }

        const hasJaws = creature.parts.some(p => p.type === 'Jaws');
        const hasFilter = creature.parts.some(p => p.type === 'FilterMouth');
        const isCarnivore = hasJaws;
        const isHerbivore = hasFilter || !hasJaws;

        for (let i = game.food.length - 1; i >= 0; i--) {
            const f = game.food[i];
            const dist = Math.hypot(head.x - f.x, head.y - f.y);
            if (dist < head.radius + f.radius) {
                let canEat = false;
                if (f.type === 'meat' && isCarnivore) canEat = true;
                if (f.type !== 'meat' && isHerbivore) canEat = true;

                if (canEat) {
                    game.food.splice(i, 1);
                    // Value scales with size? Usually yes, but keep it simple for now
                    const dnaValue = f.dnaValue || 0.2;
                    creature.gameStats.dna += dnaValue * 0.5;
                    creature.gameStats.mass += 0.2 * dnaValue;
                    creature.gameStats.health = Math.min(creature.gameStats.maxHealth, creature.gameStats.health + 5);
                    if(game.settings.audioEnabled) game.audio.playEat(f.x, f.y, game.camera);
                    if(navigator.vibrate) navigator.vibrate(20);
                    game.spawnParticles(f.x, f.y, f.color, 5, 100 * baseScale);
                }
            }
        }

        if (game.food.length < 50) {
            game.spawnFood(10);
        }

        const sonarBtn = document.getElementById('sonar-btn');
        if (sonarBtn) {
            sonarBtn.style.opacity = (creature.gameStats.dna >= 10) ? 1.0 : 0.3;
        }

        game.camera.update(head.x, head.y, head.vx, head.vy, dt, creature.gameStats.mass);
        game.biomeManager.update(dt, creature);

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

        // --- Boss Logic (Leviathan at Tier 5) ---
        if (this.currentTier >= 5 && !this.game.bossActive) {
            // Spawn Leviathan
            const angle = Math.random() * Math.PI * 2;
            const dist = 2000 * playerScale;
            const x = playerHead.x + Math.cos(angle) * dist;
            const y = playerHead.y + Math.sin(angle) * dist;

            // Leviathan is Tier 6 equivalent
            const leviathan = new Enemy(x, y, 6, game.physics, 'titan');
            leviathan.bossType = 'Leviathan';
            leviathan.color = '#ff00ff';
            leviathan.scale = 10; // Massive
            leviathan.health = 5000;
            leviathan.maxHealth = 5000;
            leviathan.persistent = true;
            leviathan.stats.damage = 50;
            // Add many weapons
            for(let i=0; i<10; i++) leviathan.parts.push({ type: 'Spike', boneIndex: i, side: 1 });

            game.enemies.push(leviathan);
            this.game.bossActive = true;

            const warning = document.createElement('div');
            warning.style = "position:absolute; top:20%; width:100%; text-align:center; color:#f0f; font-size:2rem; font-family:Orbitron; animation:pulse 0.5s infinite;";
            warning.innerText = "WARNING: LEVIATHAN DETECTED";
            document.body.appendChild(warning);
            setTimeout(() => warning.remove(), 4000);

            if(game.settings.audioEnabled) game.audio.playTone(50, 'sawtooth', 3.0);
        }

        // --- Apex Predator Logic ---
        this.apexTimer -= dt;
        if (this.apexTimer <= 0 && !this.activeApex && !this.game.bossActive) {
            this.apexTimer = 30.0;
            const angle = Math.random() * Math.PI * 2;
            const dist = 1200 * playerScale; // Spawn far away relative to size
            const x = playerHead.x + Math.cos(angle) * dist;
            const y = playerHead.y + Math.sin(angle) * dist;

            // Apex is always 1 tier higher
            const apexTier = this.currentTier + 1;
            const apex = new Enemy(x, y, apexTier, game.physics, 'hunter');
            apex.color = '#ff0000';
            apex.state = 'chase';
            apex.persistent = true;
            game.enemies.push(apex);
            this.activeApex = apex;

            game.distortion.addShockwave(x, y);
            const warning = document.createElement('div');
            warning.style = "position:absolute; top:20%; width:100%; text-align:center; color:red; font-family:Orbitron; animation:pulse 1s infinite;";
            warning.innerText = "APEX PREDATOR DETECTED";
            document.body.appendChild(warning);
            setTimeout(() => warning.remove(), 3000);
        }

        const cam = game.camera;
        // View Radius in World Units
        const viewRadiusW = (game.width / 2) / cam.zoom;
        const viewRadiusH = (game.height / 2) / cam.zoom;
        const viewRadius = Math.max(viewRadiusW, viewRadiusH);

        const spawnMin = viewRadius + (100 * playerScale);
        const spawnMax = spawnMin + (500 * playerScale);
        const despawnDist = spawnMax + (200 * playerScale);

        for (let i = game.enemies.length - 1; i >= 0; i--) {
            const e = game.enemies[i];
            const dist = Math.hypot(playerHead.x - e.points[0].x, playerHead.y - e.points[0].y);

            if (dist > despawnDist && e.bossType !== 'Leviathan' && !e.persistent) {
                game.enemies.splice(i, 1);
                continue;
            }
            // Logic: Despawn enemies that are too small (2 tiers below)
            if (e.tier < this.currentTier - 2 && !e.persistent) {
                game.enemies.splice(i, 1);
            }
        }

        if (game.enemies.length >= this.maxEntities) return;
        if (Math.random() > 0.05) return;

        const angle = Math.random() * Math.PI * 2;
        const dist = spawnMin + Math.random() * (spawnMax - spawnMin);
        const x = playerHead.x + Math.cos(angle) * dist;
        const y = playerHead.y + Math.sin(angle) * dist;

        // Weighted Spawn Tier
        // Mostly current tier, some lower, rare higher
        let spawnTier = this.currentTier;
        const r = Math.random();
        if (r < 0.6) spawnTier = this.currentTier;
        else if (r < 0.9 && this.currentTier > 1) spawnTier = this.currentTier - 1;
        else if (r < 1.0) spawnTier = this.currentTier + 1;

        const type = Math.random() > 0.5 ? 'grazer' : 'hunter';

        if (type === 'grazer') {
            const count = 3 + Math.floor(Math.random() * 3);
            if (game.enemies.length + count > this.maxEntities) return;
            const flock = game.boidManager.createFlock(x, y, count, spawnTier, 'grazer');
            game.enemies.push(...flock);
        } else {
            const e = new Enemy(x, y, spawnTier, game.physics, 'hunter');
            game.enemies.push(e);
        }
    }

    resolveCombat(player, enemy) {
        let result = { hit: false, playerHit: false, enemyHit: false, impulse: 0 };
        const weaponParts = player.parts.filter(p => p.type === 'Spike' || p.type === 'Jaws' || p.type === 'Poison');
        for (let part of weaponParts) {
            const bone = player.points[part.boneIndex];
            if (!bone) continue;
            const range = bone.radius + 20;
            for (let ePoint of enemy.points) {
                const dist = Math.hypot(bone.x - ePoint.x, bone.y - ePoint.y);
                if (dist < range + ePoint.radius) {
                    result.hit = true; result.enemyHit = true;
                    const relVx = (bone.vx || 0) - (ePoint.vx || 0);
                    const relVy = (bone.vy || 0) - (ePoint.vy || 0);
                    result.impulse = Math.hypot(relVx, relVy);
                    break;
                }
            }
            if (result.enemyHit) break;
        }

        const enemyWeapons = enemy.parts.filter(p => p.type === 'Spike' || p.type === 'Jaws');
        for (let part of enemyWeapons) {
            const bone = enemy.points[part.boneIndex];
            if (!bone) continue;
            const range = bone.radius + 20;
            for (let pPoint of player.points) {
                const dist = Math.hypot(bone.x - pPoint.x, bone.y - pPoint.y);
                if (dist < range + pPoint.radius) {
                    result.hit = true; result.playerHit = true;
                    const relVx = (bone.vx || 0) - (pPoint.vx || 0);
                    const relVy = (bone.vy || 0) - (pPoint.vy || 0);
                    result.impulse = Math.hypot(relVx, relVy);
                    break;
                }
            }
            if (result.playerHit) break;
        }
        return result;
    }

    render(ctx) {
        if (this.game.editor.active) {
            this.game.editor.render(ctx);
            return;
        }

        const game = this.game;

        // Update Lighting Map
        if (game.settings.fxEnabled) game.lighting.update(game.camera, { player: game.creature, enemies: game.enemies, food: game.food });

        const head = game.creature.points[0];
        const biome = game.biomeManager.getCurrentBiome(head ? head.x : 0, head ? head.y : 0);

        // Background Rendering (Deep Blue + Particles)
        game.background.render(ctx, biome.color);

        game.camera.apply(ctx);

        // Creatures & Objects
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

        game.enemies.forEach(e => {
            e.render(ctx);
        });

        if (game.mate) game.renderer.drawCreature(game.mate, 0);

        // Player
        game.renderer.drawCreature(game.creature, game.headAngle);

        game.camera.restore(ctx);

        // Overlays
        game.lighting.render(ctx);
        game.distortion.render(ctx, game.camera);
        game.sonar.render(ctx, game.camera);

        this.drawHUD(ctx);
        this.drawApexWarning(ctx);
    }

    drawApexWarning(ctx) {
        if (!this.activeApex) return;

        const game = this.game;
        const cam = game.camera;
        const target = this.activeApex.points[0];
        const screenPos = cam.worldToScreen(target.x, target.y);
        const w = game.width;
        const h = game.height;

        if (screenPos.x < 0 || screenPos.x > w || screenPos.y < 0 || screenPos.y > h) {
            const cx = w/2;
            const cy = h/2;
            const angle = Math.atan2(screenPos.y - cy, screenPos.x - cx);
            const r = Math.min(w, h)/2 - 40;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;

            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);
            ctx.fillStyle = '#f00';
            ctx.beginPath();
            ctx.moveTo(10, 0); ctx.lineTo(-10, 10); ctx.lineTo(-10, -10);
            ctx.fill();
            ctx.restore();

            const pulse = (Date.now() % 1000) / 1000;
            if (pulse < 0.5) {
                ctx.fillStyle = '#f00';
                ctx.font = '20px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText("DANGER", px, py + 30);
            }
        }
    }

    drawHUD(ctx) {
        const game = this.game;
        const dna = Math.floor(game.creature.gameStats.dna);
        const w = game.width;

        const evolveBtn = document.getElementById('evolve-btn');
        if (evolveBtn) {
            if (dna >= 10 && !game.editor.active) {
                evolveBtn.style.display = 'block';
                evolveBtn.innerText = `EVOLVE (10 DNA)`;
                const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1.0;
                evolveBtn.style.transform = `scale(${pulse})`;
            } else {
                evolveBtn.style.display = 'none';
            }
        }

        ctx.save();
        // Transparent HUD top bar
        const grad = ctx.createLinearGradient(0,0,0,60);
        grad.addColorStop(0, 'rgba(0,0,0,0.8)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, 60);

        // Text
        ctx.fillStyle = '#00aaff';
        ctx.font = '20px Orbitron';
        ctx.shadowColor = '#00aaff';
        ctx.shadowBlur = 5;
        ctx.textAlign = 'left';
        ctx.fillText(`DNA: ${dna} / 10`, 20, 38);

        ctx.textAlign = 'right';
        ctx.fillText(`TIER: ${this.currentTier}`, w - 20, 38);
        ctx.shadowBlur = 0;

        // Progress Bar
        const progress = Math.min(1.0, dna / 10.0);
        ctx.fillStyle = 'rgba(0, 100, 100, 0.5)';
        ctx.fillRect(20, 45, 200, 4);
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.fillRect(20, 45, 200 * progress, 4);
        ctx.shadowBlur = 0;

        ctx.restore();
    }
}
