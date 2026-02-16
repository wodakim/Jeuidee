import Camera from './camera.js';
import Physics from './physics.js';
import Input from './input.js';
import Editor from './editor.js';
import Enemy from './enemy.js';
import AudioSystem from './audio.js';
import Stats from './stats.js';

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

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Base Spine
        const spineLength = 12;
        const startX = 0;
        const startY = 0;

        for (let i = 0; i < spineLength; i++) {
            // Radius scales with Mass
            const baseRad = 20 - i * 1.2;
            const p = Physics.createPoint(startX, startY + i * 20, baseRad, 1);
            // Store base radius for scaling
            p.baseRadius = baseRad;
            this.creature.points.push(p);

            if (i > 0) {
                const prev = this.creature.points[i - 1];
                const link = Physics.createConstraint(prev, p, 0.3, 15);
                // Store base length
                link.baseLength = 15;
                this.creature.constraints.push(link);
            }
        }

        this.creature.stats.calculate(this.creature.parts);
        this.initBackground();
        this.spawnEnemies();
        this.spawnFood(50);
        this.start();
    }

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
        for(let i=0; i<5; i++) {
            this.enemies.push(new Enemy((Math.random()-0.5)*1000, (Math.random()-0.5)*1000, 'grazer', this.physics));
        }
        this.enemies.push(new Enemy((Math.random()-0.5)*1000, (Math.random()-0.5)*1000, 'hunter', this.physics));
    }

    initBackground() {
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

        this.update(dt);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        if (this.editor.active) {
            this.physics.update(this.creature.points, this.creature.constraints, dt * 0.1);
            const head = this.creature.points[0];
            this.camera.update(head.x, head.y, 0, 0, dt);
            return;
        }

        // GROWTH LOGIC
        // Scale Factor: mass 10 = scale 1.0, mass 100 = scale 2.0 (Sqrt curve)
        const scale = Math.sqrt(this.creature.gameStats.mass / 10);

        // Apply Scale to SoftBody
        // Update Radii and Constraint Lengths smoothly
        // Ideally done only on change, but lerping every frame is smooth
        this.creature.points.forEach(p => {
            if(p.baseRadius) p.radius = p.baseRadius * scale;
        });
        this.creature.constraints.forEach(c => {
            if(c.baseLength) c.length = c.baseLength * scale;
        });

        const head = this.creature.points[0];
        const inputVec = this.input.getVector();

        // Speed adjusted by scale (Larger = Slower acceleration?)
        // Force should scale with mass to maintain agility, or reduce for "heavy" feel.
        // Let's keep agility high for fun.
        const swimForce = this.creature.stats.speed * scale; // More force for bigger body
        const turnSpeed = this.creature.stats.turnSpeed; // Slower turn?

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
            // Eat range scales
            if (dist < head.radius + f.radius) {
                this.food.splice(i, 1);
                this.creature.gameStats.dna += 1;
                this.creature.gameStats.mass += 0.5;
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

        // Camera Logic Updated for Size
        // If huge, zoom out more.
        // Base Zoom logic in Camera class might fight this.
        // Let's pass scale as a hint to Camera update?
        // Or manually adjust camera.targetZoom here if we want overrides.
        // Camera.js handles speed zoom. Let's add size zoom.
        // We can modify Camera to accept a "baseZoom" param.
        // For now, let's just let the camera be.

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

        const points = this.creature.points;
        for (let i = points.length - 1; i >= 0; i--) {
            const p = points[i];
            const grad = this.ctx.createRadialGradient(p.x, p.y, p.radius * 0.2, p.x, p.y, p.radius * 2);
            grad.addColorStop(0, '#aaffff');
            grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#00ffff';
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius * 0.8, 0, Math.PI * 2);
            this.ctx.fill();
        }

        const head = points[0];
        const scale = head.radius / head.baseRadius; // Derive scale for rendering eyes size?

        this.ctx.save();
        this.ctx.translate(head.x, head.y);
        this.ctx.rotate(this.headAngle);
        this.ctx.scale(scale, scale); // Scale eyes

        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(10, -8, 6, 0, Math.PI*2);
        this.ctx.arc(10, 8, 6, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(13, -8, 3, 0, Math.PI*2);
        this.ctx.arc(13, 8, 3, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.restore();

        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(head.x - 20 * scale, head.y - 40 * scale, 40 * scale, 5 * scale);
        this.ctx.fillStyle = '#0f0';
        this.ctx.fillRect(head.x - 20 * scale, head.y - 40 * scale, 40 * scale * (this.creature.gameStats.health / 100), 5 * scale);

        this.camera.restore(this.ctx);

        if (this.input.active && !this.editor.active) {
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
