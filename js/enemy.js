import Stats from './stats.js';

export default class Enemy {
    constructor(x, y, difficulty, physics, type = 'hunter') {
        this.physics = physics;
        this.active = true;
        this.difficulty = difficulty; // 1 to 10+
        this.type = type; // 'hunter', 'grazer', 'titan'

        // Procedural Generation
        this.scale = 1 + (difficulty * 0.2); // Growth
        this.color = type === 'grazer' ? `hsl(${100 + Math.random() * 50}, 70%, 50%)` : `hsl(${Math.random() * 360}, 70%, 50%)`;

        // Body
        this.points = [];
        this.constraints = [];
        this.parts = [];

        // Stats
        this.stats = new Stats();
        this.createBody(x, y);
        this.generateParts();
        this.stats.calculate(this.parts);

        // Base stats scaling
        this.stats.speed = (300 + difficulty * 50) * (type === 'grazer' ? 0.8 : 1.0);
        this.stats.damage = 5 + difficulty * 2;
        this.health = (20 + difficulty * 10) * (type === 'titan' ? 5 : 1);
        this.maxHealth = this.health;

        // AI State
        this.state = 'wander';
        this.targetX = x;
        this.targetY = y;
        this.stateTimer = 0;

        // Flocking
        this.flockId = -1;
    }

    createBody(x, y) {
        const segs = this.type === 'titan' ? 10 : (3 + Math.floor(this.difficulty / 3));
        const rad = 15 * this.scale * (this.type === 'titan' ? 2 : 1);

        for (let i = 0; i < segs; i++) {
            const p = this.physics.constructor.createPoint(x, y + i * rad, rad * (1 - i*0.1), 1 + this.difficulty * 0.5);
            p.baseRadius = rad * (1 - i*0.1);
            this.points.push(p);

            if (i > 0) {
                const prev = this.points[i-1];
                this.constraints.push(this.physics.constructor.createConstraint(prev, p, 0.5, rad));
            }
        }
    }

    generateParts() {
        if (this.type === 'grazer') {
            // Grazers have fins mostly
            this.parts.push({ type: 'Fin', boneIndex: 1, side: 1 });
            this.parts.push({ type: 'Fin', boneIndex: 1, side: -1 });
            return;
        }

        const partCount = Math.floor(this.difficulty);
        let hasWeapon = false;

        // Jaws Chance (Frontal Weapon)
        if (this.type !== 'grazer' && Math.random() > 0.6) {
             this.parts.push({ type: 'Jaws', boneIndex: 0, side: 0 }); // Center head
             hasWeapon = true;
        }

        for(let i=0; i<partCount; i++) {
            let type = Math.random() > 0.5 ? 'Fin' : 'Spike';

            // Force weapon if none yet and last part
            if (!hasWeapon && i === partCount - 1) {
                type = 'Spike';
            }
            if (type === 'Spike') hasWeapon = true;

            const boneIndex = Math.floor(Math.random() * (this.points.length));
            const side = Math.random() > 0.5 ? 1 : -1;

            this.parts.push({ type, boneIndex, side });
        }

        if (Math.random() > 0.3) {
             this.parts.push({ type: 'Eye', boneIndex: 0, side: 1 });
             this.parts.push({ type: 'Eye', boneIndex: 0, side: -1 });
        }
    }

    update(dt, playerHead) {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.pickState(playerHead);

        // Steering
        let head = this.points[0];
        let dx = 0, dy = 0;

        // Boids Logic overrides standard steering if in a flock and type is grazer
        // This is handled by BoidManager, but we need to respect the result.
        // Actually, let's allow BoidManager to modify position/velocity directly,
        // and here we add the "Goal" steering (Chase/Flee/Wander).

        if (this.state === 'chase') {
            dx = playerHead.x - head.x;
            dy = playerHead.y - head.y;
        } else if (this.state === 'flee') {
            dx = head.x - playerHead.x;
            dy = head.y - playerHead.y;
        } else {
            dx = this.targetX - head.x;
            dy = this.targetY - head.y;
            if (Math.hypot(dx, dy) < 50) this.pickState(playerHead);
        }

        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
            const force = this.stats.speed * dt * dt; // Apply as impulse
            // If grazer, reduce individual steering influence to let flocking work better
            const weight = this.type === 'grazer' ? 0.3 : 1.0;

            head.x += (dx / dist) * force * weight;
            head.y += (dy / dist) * force * weight;
        }

        // Physics
        this.physics.update(this.points, this.constraints, dt);
    }

    pickState(playerHead) {
        this.stateTimer = Math.random() * 3 + 1;

        const dist = Math.hypot(playerHead.x - this.points[0].x, playerHead.y - this.points[0].y);
        const aggroRange = this.type === 'grazer' ? 200 : 400 * this.scale;

        if (dist < aggroRange) {
             // Aggressive if difficulty is high
             if (this.type !== 'grazer' && this.difficulty > 3) this.state = 'chase';
             else this.state = 'flee';
        } else {
            this.state = 'wander';
            this.targetX = this.points[0].x + (Math.random()-0.5) * 500;
            this.targetY = this.points[0].y + (Math.random()-0.5) * 500;
        }
    }

    render(ctx) {
        if (!this.active) return;

        ctx.save();

        // Body
        for (let i = this.points.length - 1; i >= 0; i--) {
            const p = this.points[i];
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
            ctx.fill();
        }

        // Parts
        this.parts.forEach(part => {
             const bone = this.points[part.boneIndex];
             if(!bone) return;

             ctx.save();
             ctx.translate(bone.x, bone.y);

             const prev = this.points[part.boneIndex-1] || this.points[part.boneIndex+1];
             let ang = 0;
             if (prev) {
                 ang = Math.atan2(bone.y - prev.y, bone.x - prev.x);
                 if (part.boneIndex === 0) ang += Math.PI;
             }

             let sideAngle = 0;
             if (part.side === 1) sideAngle = Math.PI/2;
             else if (part.side === -1) sideAngle = -Math.PI/2;

             ctx.rotate(ang + sideAngle);
             ctx.translate(bone.radius, 0);

             if(part.type === 'Fin') {
                 ctx.fillStyle = '#fff';
                 ctx.globalAlpha = 0.5;
                 ctx.beginPath();
                 ctx.moveTo(0,0); ctx.lineTo(15, -10); ctx.lineTo(30, 0);
                 ctx.fill();
             } else if (part.type === 'Spike') {
                 ctx.fillStyle = '#f00';
                 ctx.beginPath();
                 ctx.moveTo(0, -5); ctx.lineTo(20, 0); ctx.lineTo(0, 5);
                 ctx.fill();
             } else if (part.type === 'Jaws') {
                 ctx.fillStyle = '#ccc';
                 ctx.beginPath();
                 ctx.moveTo(0, -10); ctx.lineTo(20, -5); ctx.lineTo(0, 0);
                 ctx.moveTo(0, 10); ctx.lineTo(20, 5); ctx.lineTo(0, 0);
                 ctx.fill();
             } else if (part.type === 'Eye') {
                 ctx.fillStyle = '#fff';
                 ctx.beginPath();
                 ctx.arc(5, 0, 4, 0, Math.PI*2);
                 ctx.fill();
                 ctx.fillStyle = '#000';
                 ctx.beginPath();
                 ctx.arc(6, 0, 2, 0, Math.PI*2);
                 ctx.fill();
             }
             ctx.restore();
        });

        ctx.restore();
    }
}
