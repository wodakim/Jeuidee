import Camera from './camera.js';
import Physics from './physics.js';
import Input from './input.js';
import Editor from './editor.js';
import Enemy from './enemy.js';
import AudioSystem from './audio.js';
import Stats from './stats.js';
import Renderer from './renderer.js';

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
            gameStats: { dna: 0, mass: 10, health: 100, maxHealth: 100 }
        };

        this.headAngle = 0;
        this.editor = new Editor(this);

        // Ecosystem
        this.bgDeep = [];
        this.bgMid = [];
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
        // Main Menu
        const menu = document.createElement('div');
        menu.id = 'main-menu';
        menu.style = `position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,5,16,0.9); display:flex; flex-direction:column; justify-content:center; align-items:center; z-index:100; pointer-events:auto; font-family:Orbitron; color:#0ff;`;
        menu.innerHTML = `
            <h1 style="font-size:3em; text-shadow:0 0 20px #0ff;">NEON ABYSS</h1>
            <div style="margin-top:20px;">
                <button id="play-btn" style="padding:15px 40px; background:linear-gradient(45deg, #0ff, #00f); border:none; border-radius:30px; font-size:1.5em; font-weight:bold; color:#fff; cursor:pointer; box-shadow:0 0 15px #0ff;">EVOLVE</button>
            </div>
            <p style="margin-top:20px; font-size:0.8em; opacity:0.7;">Touch & Drag to Move</p>
        `;
        document.body.appendChild(menu);

        // Game Over Screen
        const gameOver = document.createElement('div');
        gameOver.id = 'game-over';
        gameOver.style = `position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(20,0,0,0.9); display:none; flex-direction:column; justify-content:center; align-items:center; z-index:100; pointer-events:auto; font-family:Orbitron; color:#f00;`;
        gameOver.innerHTML = `
            <h1 style="font-size:3em; text-shadow:0 0 20px #f00;">EXTINCT</h1>
            <div style="margin-top:20px;">
                <button id="respawn-btn" style="padding:15px 40px; background:linear-gradient(45deg, #f00, #500); border:none; border-radius:30px; font-size:1.5em; font-weight:bold; color:#fff; cursor:pointer; box-shadow:0 0 15px #f00;">REBIRTH</button>
            </div>
        `;
        document.body.appendChild(gameOver);

        // HUD - Evolve Button
        const hud = document.createElement('div');
        hud.id = 'game-hud';
        hud.style = `position:absolute; top:20px; right:20px; z-index:90; pointer-events:auto;`;
        hud.innerHTML = `
            <button id="evolve-btn" style="display:none; padding:10px 20px; background:linear-gradient(45deg, #f0f, #00f); border:none; border-radius:20px; font-family:Orbitron; font-weight:bold; color:#fff; cursor:pointer; box-shadow:0 0 10px #f0f;">EVOLVE (10 DNA)</button>
        `;
        document.body.appendChild(hud);

        document.getElementById('play-btn').onclick = () => this.startGame();
        document.getElementById('respawn-btn').onclick = () => this.respawn();
        document.getElementById('evolve-btn').onclick = () => {
            this.editor.toggle(true);
            document.getElementById('evolve-btn').style.display = 'none';
        };
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.resetCreature();
        this.initBackground();
        this.spawnEnemies();
        this.spawnFood(50);
        this.start();
    }

    resetCreature() {
        this.creature.points = [];
        this.creature.constraints = [];
        this.creature.gameStats = { dna: 0, mass: 10, health: 100, maxHealth: 100 };
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

    spawnEnemies() {
        this.enemies = []; // Reset
        for(let i=0; i<5; i++) {
            this.enemies.push(new Enemy((Math.random()-0.5)*1000, (Math.random()-0.5)*1000, 'grazer', this.physics));
        }
        this.enemies.push(new Enemy((Math.random()-0.5)*1000, (Math.random()-0.5)*1000, 'hunter', this.physics));
    }

    initBackground() {
        this.bgDeep = [];
        this.bgMid = [];
        for(let i=0; i<50; i++) {
            this.bgDeep.push({
                x: (Math.random() - 0.5) * 5000,
                y: (Math.random() - 0.5) * 5000,
                r: Math.random() * 100 + 50,
                alpha: Math.random() * 0.05
            });
        }
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
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
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
            // Background Animation?
            this.updateBackgroundOnly(dt);
        }

        this.render();
        requestAnimationFrame((t) => this.loop(t));
    }

    updateBackgroundOnly(dt) {
        // Just drift logic
        this.bgMid.forEach(p => {
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

        // TUNING: Improved Speed & Turn
        // Increased Base Speed (Snappier)
        const swimForce = (this.creature.stats.speed + 1000) * scale;
        const turnSpeed = this.creature.stats.turnSpeed * 2.0; // Faster turning

        if (this.input.active) {
            // Apply Force
            head.x += inputVec.x * swimForce * dt * dt;
            head.y += inputVec.y * swimForce * dt * dt;

            let targetAngle = Math.atan2(inputVec.y, inputVec.x);
            let diff = targetAngle - this.headAngle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            this.headAngle += diff * turnSpeed * dt;
        }

        this.physics.update(this.creature.points, this.creature.constraints, dt);

        // Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(dt, head);

            const collision = Physics.checkSoftBodyCollision(this.creature.points, e.points);

            if (collision) {
                const enemyDmg = 5;
                this.creature.gameStats.health -= Math.max(0, enemyDmg - this.creature.stats.defense);

                const mx = (head.x + e.points[0].x) / 2;
                const my = (head.y + e.points[0].y) / 2;

                this.hitstop = 0.05;
                this.spawnParticles(mx, my, '#ff0044', 8, 300);
                this.spawnParticles(mx, my, '#ffffff', 2, 500);

                this.camera.x += (Math.random()-0.5) * 10;
                this.camera.y += (Math.random()-0.5) * 10;
                this.audio.playTone(100, 'sawtooth', 0.1);
            }
        }

        for (let i = this.food.length - 1; i >= 0; i--) {
            const f = this.food[i];
            const dist = Math.hypot(head.x - f.x, head.y - f.y);
            if (dist < head.radius + f.radius) {
                this.food.splice(i, 1);
                this.creature.gameStats.dna += 1;
                this.creature.gameStats.mass += 0.5;
                this.creature.gameStats.health = Math.min(this.creature.gameStats.maxHealth, this.creature.gameStats.health + 5); // Heal on eat
                this.audio.playEat();
                this.spawnParticles(f.x, f.y, '#00ff00', 5, 100);
                this.food.push({
                    x: head.x + (Math.random()-0.5)*1000,
                    y: head.y + (Math.random()-0.5)*1000,
                    radius: 5,
                    color: '#0f0'
                });
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

        this.bgMid.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
        });

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

        this.camera.apply(this.ctx);
        this.ctx.globalAlpha = 1.0;

        this.food.forEach(f => {
            this.ctx.fillStyle = f.color;
            this.ctx.shadowColor = f.color;
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(f.x, f.y, f.radius, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });

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
