import Camera from './camera.js';
import Physics from './physics.js';
import Input from './input.js';
import Editor from './editor.js';
import Enemy from './enemy.js';
import AudioSystem from './audio.js';
import Stats from './stats.js';
import Renderer from './renderer.js';
import SaveManager from './save_manager.js';

class GameLoop {
    constructor() {
        this.running = false;
        this.lastTime = 0;
        this.fps = 60;
        this.step = 1 / this.fps;

        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 0;
        this.height = 0;

        this.input = new Input();
        this.physics = new Physics();
        this.camera = new Camera(window.innerWidth, window.innerHeight);
        this.audio = new AudioSystem();
        this.renderer = new Renderer(this.ctx, this.camera);

        // --- JELLY CREATURE (Soft Body) ---
        this.creature = {
            points: [],
            constraints: [],
            parts: [],
            stats: new Stats(),
            gameStats: { dna: 0, mass: 10, health: 100, maxHealth: 100 },
            color: '#00ffff'
        };

        this.saveManager = new SaveManager(this);
        this.headAngle = 0;
        this.editor = new Editor(this);

        // Ecosystem
        this.bgAbyssal = []; // Layer 0: Giants
        this.bgDeep = [];    // Layer 1: Distant particles
        this.bgMid = [];     // Layer 2: Midground
        this.bgFore = [];    // Layer 3: Foreground dust

        this.enemies = [];
        this.food = [];
        this.particles = [];
        this.hitstop = 0;
        this.gameState = 'menu'; // menu, playing, gameover

        // UI Layers
        this.createUI();
        this.init();
    }

    createUI() {
        // AD SPACE
        const adSpace = document.createElement('div');
        adSpace.id = 'ad-space';
        // Style is handled in CSS mostly, but specific inline for functionality
        adSpace.style = `position:absolute; bottom:0; left:0; width:100%; height:50px; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:1000; color:#444; font-family:Orbitron; pointer-events:none; border-top:1px solid #333;`;
        adSpace.innerText = 'AD SPACE';
        document.body.appendChild(adSpace);

        // Main Menu
        const menu = document.createElement('div');
        menu.id = 'main-menu';
        // Using classes from style.css?
        // Let's replace inline styles with proper structure, but for simplicity in JS creation, some inline is retained or we rely on ID selectors in CSS.
        // Actually, style.css targets #main-menu, so we can clean this up.
        menu.innerHTML = `
            <h1>NEON ABYSS</h1>
            <div style="margin-top:20px;">
                <button id="play-btn" class="btn-neon">EVOLVE</button>
            </div>
            <p style="margin-top:20px; font-size:0.8em; opacity:0.7;">Touch & Drag to Move</p>
        `;
        document.body.appendChild(menu);

        // Game Over Screen
        const gameOver = document.createElement('div');
        gameOver.id = 'game-over';
        gameOver.style.display = 'none'; // Initial state
        gameOver.innerHTML = `
            <h1 style="color:var(--danger); text-shadow:0 0 20px var(--danger);">EXTINCT</h1>
            <div style="margin-top:20px;">
                <button id="respawn-btn" class="btn-neon btn-danger">REBIRTH</button>
            </div>
        `;
        document.body.appendChild(gameOver);

        // HUD - Evolve Button
        const hud = document.createElement('div');
        hud.id = 'game-hud';
        hud.style = `position:absolute; top:20px; right:20px; z-index:90; pointer-events:auto;`;
        hud.innerHTML = `
            <button id="evolve-btn" style="display:none;">EVOLVE (10 DNA)</button>
        `;
        document.body.appendChild(hud);

        document.getElementById('play-btn').onclick = () => this.startGame();
        document.getElementById('respawn-btn').onclick = () => this.respawn();
        document.getElementById('evolve-btn').onclick = () => {
            this.editor.toggle(true);
            document.getElementById('evolve-btn').style.display = 'none';
        };
    }
    // ... (rest of the file is identical)

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.resetCreature();

        // Try Load
        this.saveManager.load();

        this.initBackground();
        this.spawnEnemies();
        this.spawnFood(50);
        this.start();

        // Auto-Save Interval (30s)
        setInterval(() => {
            if (this.gameState === 'playing') this.saveManager.save();
        }, 30000);
    }

    resetCreature() {
        this.creature.points = [];
        this.creature.constraints = [];
        this.creature.gameStats = this.creature.gameStats || { dna: 0, mass: 10, health: 100, maxHealth: 100 };
        this.headAngle = 0;

        const spineLength = 12;
        const startX = 0;
        const startY = 0;

        for (let i = 0; i < spineLength; i++) {
            const baseRad = 20 - i * 1.2;
            const p = Physics.createPoint(startX, startY + i * 20, baseRad, 1);
            p.baseRadius = baseRad;
            this.creature.points.push(p);

            if (i > 0) {
                const prev = this.creature.points[i - 1];
                const link = Physics.createConstraint(prev, p, 0.3, 15);
                link.baseLength = 15;
                this.creature.constraints.push(link);
            }
        }
        this.creature.stats.calculate(this.creature.parts);
    }

    startGame() {
        document.getElementById('main-menu').style.display = 'none';
        this.gameState = 'playing';
        this.audio.ctx.resume();
    }

    respawn() {
        document.getElementById('game-over').style.display = 'none';
        this.creature.gameStats.health = this.creature.gameStats.maxHealth;
        this.creature.gameStats.mass = Math.max(10, this.creature.gameStats.mass * 0.5); // Penalty
        this.saveManager.save();

        this.resetCreature();
        this.camera.x = 0;
        this.camera.y = 0;
        this.gameState = 'playing';
    }

    // ... (Spawn functions same as before)
    spawnFood(count) {
        for(let i=0; i<count; i++) {
            this.food.push({
                x: (Math.random()-0.5)*3000,
                y: (Math.random()-0.5)*3000,
                radius: 5,
                color: '#0f0'
            });
        }
    }

    spawnMeat(x, y, count) {
        for(let i=0; i<count; i++) {
            this.food.push({
                x: x + (Math.random()-0.5)*50,
                y: y + (Math.random()-0.5)*50,
                radius: 8,
                color: '#ff4444',
                type: 'meat',
                dnaValue: 5
            });
        }
    }

    spawnEnemies() {
        const targetCount = 6;
        if (this.enemies.length >= targetCount) return;

        const count = targetCount - this.enemies.length;
        const playerScale = Math.sqrt(this.creature.gameStats.mass / 10);
        const playerX = this.creature.points[0] ? this.creature.points[0].x : 0;
        const playerY = this.creature.points[0] ? this.creature.points[0].y : 0;

        for(let i=0; i<count; i++) {
            // Difficulty based on player scale
            const difficulty = Math.max(1, playerScale + (Math.random()-0.5)*2);

            // Spawn distance
            const angle = Math.random() * Math.PI * 2;
            const dist = 1000 + Math.random() * 1000;
            const ex = playerX + Math.cos(angle) * dist;
            const ey = playerY + Math.sin(angle) * dist;

            this.enemies.push(new Enemy(ex, ey, difficulty, this.physics));
        }
    }

    initBackground() {
        this.bgAbyssal = [];
        this.bgDeep = [];
        this.bgMid = [];
        this.bgFore = [];

        // 1. Abyssal Giants (Procedural Shapes)
        for(let i=0; i<5; i++) {
             // Create a chain of large circles to simulate a distant leviathan
             const giant = {
                 x: (Math.random() - 0.5) * 8000,
                 y: (Math.random() - 0.5) * 8000,
                 vx: (Math.random() - 0.5) * 2, // Slow
                 vy: (Math.random() - 0.5) * 2,
                 segments: []
             };
             const len = 10 + Math.random() * 10;
             for(let j=0; j<len; j++) {
                 giant.segments.push({
                     ox: j * 50, // Offset
                     oy: Math.sin(j * 0.5) * 50,
                     r: 100 + Math.random() * 100
                 });
             }
             this.bgAbyssal.push(giant);
        }

        // 2. Deep Layer (Small dots)
        for(let i=0; i<100; i++) {
            this.bgDeep.push({
                x: (Math.random() - 0.5) * 6000,
                y: (Math.random() - 0.5) * 6000,
                r: Math.random() * 4 + 2,
                alpha: Math.random() * 0.2
            });
        }

        // 3. Mid Layer (Existing)
        for(let i=0; i<200; i++) {
            this.bgMid.push({
                x: (Math.random() - 0.5) * 4000,
                y: (Math.random() - 0.5) * 4000,
                r: Math.random() * 3,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                alpha: Math.random() * 0.3
            });
        }

        // 4. Foreground (Dust/Snow - Fast)
        for(let i=0; i<50; i++) {
            this.bgFore.push({
                x: (Math.random() - 0.5) * 3000,
                y: (Math.random() - 0.5) * 3000,
                r: Math.random() * 2,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                alpha: Math.random() * 0.5 + 0.2
            });
        }
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        // Adjust for Ad Space (50px bottom)
        const adHeight = 50;
        this.height -= adHeight;

        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.camera.resize(this.width, this.height);
    }

    start() {
        if (!this.running) {
            this.running = true;
            this.lastTime = performance.now();
            requestAnimationFrame((t) => this.loop(t));
        }
    }

    loop(timestamp) {
        if (!this.running) return;

        let dt = (timestamp - this.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        this.lastTime = timestamp;

        if (this.hitstop > 0) {
            this.hitstop -= dt;
            this.render();
            requestAnimationFrame((t) => this.loop(t));
            return;
        }

        if (this.gameState === 'playing') {
            this.update(dt);
        } else if (this.gameState === 'menu') {
            this.updateBackgroundOnly(dt);
        }

        this.render();
        requestAnimationFrame((t) => this.loop(t));
    }

    updateBackgroundOnly(dt) {
        // Drift all layers
        this.bgAbyssal.forEach(g => {
            g.x += g.vx * dt;
            g.y += g.vy * dt;
        });
        this.bgMid.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
        });
        this.bgFore.forEach(p => {
             p.x += p.vx * dt;
             p.y += p.vy * dt;
        });
    }

    update(dt) {
        if (this.editor.active) {
            this.physics.update(this.creature.points, this.creature.constraints, dt * 0.1);
            const head = this.creature.points[0];
            this.camera.update(head.x, head.y, 0, 0, dt);
            return;
        }

        // CHECK DEATH
        if (this.creature.gameStats.health <= 0) {
            this.gameState = 'gameover';
            document.getElementById('game-over').style.display = 'flex';
            return;
        }

        const scale = Math.sqrt(this.creature.gameStats.mass / 10);

        this.creature.points.forEach(p => {
            if(p.baseRadius) p.radius = p.baseRadius * scale;
        });
        this.creature.constraints.forEach(c => {
            if(c.baseLength) c.length = c.baseLength * scale;
        });

        const head = this.creature.points[0];
        const inputVec = this.input.getVector();

        // TUNING
        const swimForce = (this.creature.stats.speed + 1000) * scale;
        const turnSpeed = this.creature.stats.turnSpeed * 2.0;

        if (this.input.active) {
            head.x += inputVec.x * swimForce * dt * dt;
            head.y += inputVec.y * swimForce * dt * dt;

            let targetAngle = Math.atan2(inputVec.y, inputVec.x);
            let diff = targetAngle - this.headAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.headAngle += diff * turnSpeed * dt;
        }

        this.physics.update(this.creature.points, this.creature.constraints, dt);

        // Background Updates
        this.updateBackgroundOnly(dt);

        // Respawn Enemies if needed
        this.spawnEnemies();

        // Enemies Update
        const playerRadius = head.radius; // Roughly

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(dt, head, playerRadius);

            // Check Collision
            const collision = Physics.checkSoftBodyCollision(this.creature.points, e.points);

            if (collision) {
                const enemyDmg = e.stats.damage;
                this.creature.gameStats.health -= Math.max(0, enemyDmg - this.creature.stats.defense);

                // Deal Damage to Enemy
                e.health -= Math.max(0, this.creature.stats.damage);

                const mx = (head.x + e.points[0].x) / 2;
                const my = (head.y + e.points[0].y) / 2;

                this.hitstop = 0.05;
                this.spawnParticles(mx, my, '#ff0044', 5, 200);

                // Enemy Death
                if (e.health <= 0) {
                     this.spawnParticles(mx, my, '#ffaa00', 20, 400); // Death explosion
                     this.spawnMeat(mx, my, 3 + Math.floor(e.scale)); // Drop meat
                     this.enemies.splice(i, 1);
                     continue;
                }

                this.camera.x += (Math.random()-0.5) * 10;
                this.camera.y += (Math.random()-0.5) * 10;
                this.audio.playTone(100, 'sawtooth', 0.1);
            }

            // Despawn far away enemies
            const dist = Math.hypot(head.x - e.points[0].x, head.y - e.points[0].y);
            if (dist > 3000) this.enemies.splice(i, 1);
        }

        for (let i = this.food.length - 1; i >= 0; i--) {
            const f = this.food[i];
            const dist = Math.hypot(head.x - f.x, head.y - f.y);
            if (dist < head.radius + f.radius) {
                this.food.splice(i, 1);

                const dnaValue = f.dnaValue || 1;
                this.creature.gameStats.dna += dnaValue;
                this.creature.gameStats.mass += 0.5 * dnaValue; // Meat gives more mass
                this.creature.gameStats.health = Math.min(this.creature.gameStats.maxHealth, this.creature.gameStats.health + 5);

                this.audio.playEat();
                this.spawnParticles(f.x, f.y, f.color, 5, 100);

                if (f.type !== 'meat') {
                    // Respawn Plant
                     this.food.push({
                        x: head.x + (Math.random()-0.5)*1000,
                        y: head.y + (Math.random()-0.5)*1000,
                        radius: 5,
                        color: '#0f0'
                    });
                }
            }
        }

        // Check Evolution
        if (this.creature.gameStats.dna >= 10 && !this.editor.active) {
            const btn = document.getElementById('evolve-btn');
            if (btn && btn.style.display === 'none') {
                 btn.style.display = 'block';
            }
        }

        this.camera.update(head.x, head.y, head.vx, head.vy, dt);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    spawnParticles(x, y, color, count, speedVar = 100) {
        for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * speedVar;
            this.particles.push({
                x: x, y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.3 + Math.random() * 0.2,
                color: color,
                radius: Math.random() * 4 + 1
            });
        }
    }

    render() {
        const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
        bgGrad.addColorStop(0, '#000510');
        bgGrad.addColorStop(1, '#001020');
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // --- LAYER 0: ABYSSAL GIANTS (Parallax 0.05) ---
        this.ctx.save();
        this.ctx.translate(this.width/2, this.height/2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x * 0.05, -this.camera.y * 0.05);
        this.ctx.fillStyle = '#000810'; // Very dark silhouette
        this.ctx.filter = 'blur(10px)'; // Blur effect for depth
        this.bgAbyssal.forEach(g => {
            this.ctx.beginPath();
            g.segments.forEach(s => {
                this.ctx.arc(g.x + s.ox, g.y + s.oy, s.r, 0, Math.PI * 2);
            });
            this.ctx.fill();
        });
        this.ctx.filter = 'none';
        this.ctx.restore();

        // --- LAYER 1: DEEP PARTICLES (Parallax 0.1) ---
        this.ctx.save();
        this.ctx.translate(this.width/2, this.height/2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x * 0.1, -this.camera.y * 0.1);
        this.ctx.fillStyle = '#fff';
        this.bgDeep.forEach(p => {
            this.ctx.globalAlpha = p.alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.restore();

        // --- LAYER 2: MIDGROUND (Parallax 0.5) ---
        this.ctx.save();
        this.ctx.translate(this.width/2, this.height/2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x * 0.5, -this.camera.y * 0.5);
        this.ctx.fillStyle = '#aaffff';
        this.bgMid.forEach(p => {
            this.ctx.globalAlpha = p.alpha;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.restore();

        // --- GAMEPLAY LAYER ---
        this.camera.apply(this.ctx);
        this.ctx.globalAlpha = 1.0;

        // Food
        this.ctx.globalCompositeOperation = 'lighter'; // Additive blend for glowing food
        this.food.forEach(f => {
            this.ctx.fillStyle = f.color;
            this.ctx.shadowColor = f.color;
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(f.x, f.y, f.radius, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
        this.ctx.globalCompositeOperation = 'source-over';

        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life * 2;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;

        this.enemies.forEach(e => e.render(this.ctx));

        if (this.gameState === 'playing') {
            this.renderer.drawCreature(this.creature, this.headAngle);

            const head = this.creature.points[0];
            const scale = head.radius / head.baseRadius;

            // Health Bar
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(head.x - 20 * scale, head.y - 40 * scale, 40 * scale, 5 * scale);
            this.ctx.fillStyle = this.creature.gameStats.health < 20 ? '#f00' : '#0f0';
            this.ctx.fillRect(head.x - 20 * scale, head.y - 40 * scale, 40 * scale * (Math.max(0, this.creature.gameStats.health) / 100), 5 * scale);
        }

        this.camera.restore(this.ctx);

        // --- LAYER 3: FOREGROUND DUST (Parallax 1.2) ---
        // Rendered on top of everything without camera transform (or with exaggerated one)
        // Actually, Foreground should be affected by camera but faster.
        this.ctx.save();
        this.ctx.translate(this.width/2, this.height/2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom); // Zoom affects it? Yes
        this.ctx.translate(-this.camera.x * 1.5, -this.camera.y * 1.5); // Faster parallax
        this.ctx.fillStyle = '#ffffff';
        this.bgFore.forEach(p => {
             this.ctx.globalAlpha = p.alpha;
             this.ctx.beginPath();
             this.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
             this.ctx.fill();
        });
        this.ctx.restore();
        this.ctx.globalAlpha = 1.0;

        // Joystick
        if (this.input.active && !this.editor.active && this.gameState === 'playing') {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.input.startX, this.input.startY, 50, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(this.input.currX, this.input.currY, 20, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.editor.render(this.ctx);
    }
}

window.game = new GameLoop();
