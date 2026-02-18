import Physics from '../physics.js';
import Debris from '../debris.js';
import Enemy from '../enemy.js';

export default class PlayState {
    constructor(game) {
        this.game = game;
        this.hud = document.getElementById('game-hud');
        this.paused = false;

        // Tier Tracking
        this.currentTier = 1;
        this.maxEntities = 15;

        // Apex Predator Timer
        this.apexTimer = 30.0; // Seconds
        this.activeApex = null; // Track current apex
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
        const mass = this.game.creature.gameStats.mass;
        let newTier = 1;
        if (mass >= 500) newTier = 3;
        else if (mass >= 50) newTier = 2;

        if (newTier !== this.currentTier) {
            this.currentTier = newTier;
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

        const baseScale = Math.sqrt(creature.gameStats.mass / 10);
        creature.points.forEach(p => { if(p.baseRadius) p.radius = p.baseRadius * baseScale; });
        creature.constraints.forEach(c => { if(c.baseLength) c.length = c.baseLength * baseScale; });

        const head = creature.points[0];

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

        game.physics.update(creature.points, creature.constraints, dt);
        game.updateBackgroundOnly(dt);
        this.manageEntities(dt, head, baseScale);
        game.boidManager.update(dt, game.enemies);

        if (game.mate) {
            game.mate.update(dt, head, head.radius);
            const dist = Math.hypot(head.x - game.mate.points[0].x, head.y - game.mate.points[0].y);
            if (dist < head.radius + game.mate.points[0].radius + 20) {
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
                game.spawnParticles(mx, my, '#ff0044', 5, 200);
                game.camera.x += (Math.random()-0.5) * 10; game.camera.y += (Math.random()-0.5) * 10;
                if(game.settings.audioEnabled) game.audio.playTone(100, 'sawtooth', 0.1, mx, my, game.camera);

                if (e.health <= 0) {
                     game.spawnParticles(mx, my, '#ffaa00', 10, 400);
                     game.spawnMeat(mx, my, 3 + Math.floor(e.scale));
                     game.debris.push(new Debris(e.points, e.constraints, e.color, 4));
                     game.distortion.addShockwave(mx, my);
                     if(navigator.vibrate) navigator.vibrate([50, 50, 50]);
                     const drop = game.progression.checkDrop(null, e.difficulty);
                     if (drop) game.triggerUnlock(drop);

                     if (e.persistent) this.activeApex = null; // Apex died
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
                    const dnaValue = f.dnaValue || 0.2;
                    // Reduced growth speed (Balance)
                    creature.gameStats.dna += dnaValue * 0.5; // Half DNA gain
                    creature.gameStats.mass += 0.2 * dnaValue; // Slower mass gain
                    creature.gameStats.health = Math.min(creature.gameStats.maxHealth, creature.gameStats.health + 5);
                    if(game.settings.audioEnabled) game.audio.playEat(f.x, f.y, game.camera);
                    if(navigator.vibrate) navigator.vibrate(20);
                    game.spawnParticles(f.x, f.y, f.color, 5, 100);
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

        // --- Apex Predator Logic ---
        this.apexTimer -= dt;
        if (this.apexTimer <= 0 && !this.activeApex) {
            this.apexTimer = 30.0; // Reset
            const angle = Math.random() * Math.PI * 2;
            const dist = 1200 * playerScale;
            const x = playerHead.x + Math.cos(angle) * dist;
            const y = playerHead.y + Math.sin(angle) * dist;

            const apex = new Enemy(x, y, (this.currentTier + 1) * 3, game.physics, 'hunter');
            apex.scale = (this.currentTier + 1) * 1.5;
            apex.color = '#ff0000';
            apex.state = 'chase';
            apex.health = 100 * this.currentTier;
            apex.parts.push({type: 'Jaws', boneIndex: 0, side: 0});
            apex.persistent = true; // Important!
            game.enemies.push(apex);
            this.activeApex = apex;

            // Warning
            game.distortion.addShockwave(x, y);
            const warning = document.createElement('div');
            warning.style = "position:absolute; top:20%; width:100%; text-align:center; color:red; font-family:Orbitron; animation:pulse 1s infinite;";
            warning.innerText = "APEX PREDATOR DETECTED";
            document.body.appendChild(warning);
            setTimeout(() => warning.remove(), 3000);
        }

        const cam = game.camera;
        const viewRadiusW = (game.width / 2) / cam.zoom;
        const viewRadiusH = (game.height / 2) / cam.zoom;
        const viewRadius = Math.max(viewRadiusW, viewRadiusH);

        const spawnMin = viewRadius + 100;
        const spawnMax = spawnMin + 500;
        const despawnDist = spawnMax + 200;

        for (let i = game.enemies.length - 1; i >= 0; i--) {
            const e = game.enemies[i];
            const dist = Math.hypot(playerHead.x - e.points[0].x, playerHead.y - e.points[0].y);

            if (dist > despawnDist && e.bossType !== 'Leviathan' && !e.persistent) {
                game.enemies.splice(i, 1);
                continue;
            }
            if (e.tier < this.currentTier - 1 && !e.persistent) {
                game.enemies.splice(i, 1);
            }
        }

        if (game.enemies.length >= this.maxEntities) return;
        if (Math.random() > 0.05) return;

        const angle = Math.random() * Math.PI * 2;
        const dist = spawnMin + Math.random() * (spawnMax - spawnMin);
        const x = playerHead.x + Math.cos(angle) * dist;
        const y = playerHead.y + Math.sin(angle) * dist;

        let spawnTier = this.currentTier;
        const r = Math.random();
        if (r < 0.6) spawnTier = this.currentTier;
        else if (r < 0.9 && this.currentTier > 1) spawnTier = this.currentTier - 1;
        else if (r < 1.0) spawnTier = this.currentTier + 1;

        if (spawnTier > 3) spawnTier = 3;

        const type = Math.random() > 0.5 ? 'grazer' : 'hunter';

        if (type === 'grazer') {
            const count = 3 + Math.floor(Math.random() * 3);
            if (game.enemies.length + count > this.maxEntities) return;
            const flock = game.boidManager.createFlock(x, y, count, spawnTier, 'grazer');
            flock.forEach(e => {
                e.tier = spawnTier; e.scale = spawnTier;
                e.health *= spawnTier; e.stats.damage *= spawnTier;
            });
            game.enemies.push(...flock);
        } else {
            const e = new Enemy(x, y, spawnTier * 2, game.physics, 'hunter');
            e.tier = spawnTier; e.scale = spawnTier;
            e.health *= spawnTier; e.stats.damage *= spawnTier;
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
                    result.hit = true;
                    result.enemyHit = true;
                    // Calculate Impulse
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
                    result.hit = true;
                    result.playerHit = true;
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
        if (game.settings.fxEnabled) game.lighting.update(game.camera, { player: game.creature, enemies: game.enemies, food: game.food });

        const head = game.creature.points[0];
        const biome = game.biomeManager.getCurrentBiome(head ? head.x : 0, head ? head.y : 0);
        const bgGrad = ctx.createLinearGradient(0, 0, 0, game.height);
        bgGrad.addColorStop(0, '#000000');
        bgGrad.addColorStop(1, biome.color);
        ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, game.width, game.height);

        this.renderParallax(ctx);

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

        game.enemies.forEach(e => {
            e.render(ctx);
        });

        if (game.mate) game.renderer.drawCreature(game.mate, 0);
        game.renderer.drawCreature(game.creature, game.headAngle);
        game.camera.restore(ctx);

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

        // Check if offscreen
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

            // Text Pulse
            const pulse = (Date.now() % 1000) / 1000;
            if (pulse < 0.5) {
                ctx.fillStyle = '#f00';
                ctx.font = '20px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText("DANGER", px, py + 30);
            }
        }
    }

    renderParallax(ctx) {
        const game = this.game;
        const cam = game.camera;
        const cx = game.width / 2;
        const cy = game.height / 2;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1.0, 1.0);
        ctx.translate(-cam.x * 0.05, -cam.y * 0.05);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        game.bgDeep.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
        });
        ctx.restore();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(cam.zoom * 0.5, cam.zoom * 0.5);
        ctx.translate(-cam.x * 0.2, -cam.y * 0.2);
        ctx.fillStyle = 'rgba(100, 255, 255, 0.1)';
        game.bgMid.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2, 0, Math.PI*2); ctx.fill();
        });
        ctx.restore();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(cam.zoom * 1.5, cam.zoom * 1.5);
        ctx.translate(-cam.x * 1.5, -cam.y * 1.5);
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

        // Ensure Evolve Button Visibility Logic
        const evolveBtn = document.getElementById('evolve-btn');
        if (evolveBtn) {
            if (dna >= 10 && !game.editor.active) {
                evolveBtn.style.display = 'block';
                evolveBtn.innerText = `EVOLVE (10 DNA)`;
                // Pulse effect
                const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 1.0;
                evolveBtn.style.transform = `scale(${pulse})`;
            } else {
                evolveBtn.style.display = 'none';
            }
        }

        ctx.save();
        ctx.fillStyle = 'rgba(0, 10, 30, 0.8)';
        ctx.fillRect(0, 0, w, 60);
        ctx.beginPath();
        ctx.moveTo(0, 60); ctx.lineTo(w, 60);
        ctx.strokeStyle = '#00aaff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Text
        ctx.fillStyle = '#00aaff';
        ctx.font = '20px Orbitron';
        ctx.textAlign = 'left';
        ctx.fillText(`DNA: ${dna} / 10`, 20, 38); // Show target

        ctx.textAlign = 'right';
        ctx.fillText(`TIER: ${this.currentTier}`, w - 20, 38);

        // Progress Bar
        const progress = Math.min(1.0, dna / 10.0);
        ctx.fillStyle = '#004444';
        ctx.fillRect(20, 45, 200, 5);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(20, 45, 200 * progress, 5);

        ctx.restore();
    }
}
