import Stats from './stats.js';

export default class Enemy {
    constructor(x, y, tier, physics, type = 'hunter') {
        this.physics = physics;
        this.active = true;
        this.tier = tier; // 1, 2, 3...
        this.type = type; // 'hunter', 'grazer', 'titan'

        // Procedural Generation
        // Scale Factor: Roughly 3x per tier to match Mass 10x (Sqrt(10) ~ 3.16)
        this.scale = Math.pow(3, this.tier - 1);
        this.mass = 10 * this.scale * this.scale; // Mass = Scale^2 * 10

        this.persistent = false;

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

        // Stats Scaling
        // Speed shouldn't scale linearly with size, big things move slower relatively?
        // But in absolute terms faster.
        // Let's keep speed manageable.
        this.stats.speed = (200 + this.tier * 50) * (type === 'grazer' ? 0.8 : 1.0);

        // Damage scales with Mass
        this.stats.damage = 5 * this.scale;

        // Health scales with Mass
        this.health = 20 * this.scale * (type === 'titan' ? 5 : 1);
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
        const segs = this.type === 'titan' ? 8 : (3 + Math.floor(this.tier / 2));
        // Cap segments to avoid physics explosion
        const actualSegs = Math.min(10, segs);

        const baseRad = 15 * this.scale * (this.type === 'titan' ? 2 : 1);

        for (let i = 0; i < actualSegs; i++) {
            // Taper body
            const r = baseRad * (1 - i * 0.1);
            const p = this.physics.constructor.createPoint(x, y + i * baseRad, r, this.scale); // Mass scaled
            p.baseRadius = r;
            p.radius = r; // Important for renderer
            this.points.push(p);

            if (i > 0) {
                const prev = this.points[i-1];
                this.constraints.push(this.physics.constructor.createConstraint(prev, p, 0.5, baseRad));
            }
        }
    }

    generateParts() {
        if (this.type === 'grazer') {
            this.parts.push({ type: 'Fin', boneIndex: 1, side: 1 });
            this.parts.push({ type: 'Fin', boneIndex: 1, side: -1 });
            return;
        }

        const partCount = 1 + Math.floor(this.tier);
        // Don't add too many parts
        const maxParts = 5;
        const count = Math.min(maxParts, partCount);

        let hasWeapon = false;

        if (this.type !== 'grazer' && Math.random() > 0.6) {
             this.parts.push({ type: 'Jaws', boneIndex: 0, side: 0 });
             hasWeapon = true;
        }

        for(let i=0; i<count; i++) {
            let type = Math.random() > 0.5 ? 'Fin' : 'Spike';
            if (!hasWeapon && i === count - 1) type = 'Spike';
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

    update(dt, playerHead, playerMass = 10) {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.pickState(playerHead, playerMass);

        let head = this.points[0];
        let dx = 0, dy = 0;

        if (this.state === 'chase') {
            dx = playerHead.x - head.x;
            dy = playerHead.y - head.y;
        } else if (this.state === 'flee') {
            dx = head.x - playerHead.x;
            dy = head.y - playerHead.y;
        } else {
            dx = this.targetX - head.x;
            dy = this.targetY - head.y;
            if (Math.hypot(dx, dy) < 50 * this.scale) this.pickState(playerHead, playerMass);
        }

        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
            const force = this.stats.speed * dt * dt * 50; // Mass is high, need more force?
            // Physics: F = ma. a = F/m.
            // If mass scales by Scale^2, and we want similar acceleration, Force must scale by Scale^2.
            // But we want bigger things to feel heavier (slower accel).
            // Let's scale force by Scale.

            const massFactor = this.scale * 20; // Heavier feel
            head.x += (dx / dist) * (this.stats.speed / massFactor) * dt;
            head.y += (dy / dist) * (this.stats.speed / massFactor) * dt;
        }

        this.physics.update(this.points, this.constraints, dt);
    }

    pickState(playerHead, playerMass) {
        this.stateTimer = 1.0 + Math.random();

        const head = this.points[0];
        const dist = Math.hypot(playerHead.x - head.x, playerHead.y - head.y);
        const aggroRange = (this.persistent ? 2000 : 800) * this.scale;

        if (this.health < this.maxHealth * 0.3 && !this.persistent) {
            this.state = 'flee';
            return;
        }

        if (dist < aggroRange || this.persistent) {
            if (this.type === 'grazer') {
                this.state = 'flee';
            } else if (this.type === 'titan' || this.persistent) {
                this.state = 'chase';
            } else {
                if (playerMass > this.mass * 1.5) {
                    this.state = 'flee';
                } else if (playerMass < this.mass * 0.8) {
                    this.state = 'chase';
                } else {
                    if (Math.random() > 0.5) this.state = 'chase';
                    else this.state = 'wander';
                }
            }
        } else {
            this.state = 'wander';
            const wanderDist = 1000 * this.scale;
            this.targetX = head.x + (Math.random()-0.5) * wanderDist;
            this.targetY = head.y + (Math.random()-0.5) * wanderDist;
        }
    }

    onHit(sourceX, sourceY) {
        this.health -= 10;
        if (this.health > 0 && this.type !== 'grazer') {
            this.state = 'chase';
            this.stateTimer = 5.0;
        }
    }

    render(ctx) {
        if (!this.active) return;
        ctx.save();

        // Use new organic rendering for enemies too?
        // Basic organic: fill circles with soft color

        // Body
        for (let i = this.points.length - 1; i >= 0; i--) {
            const p = this.points[i];

            // Soft Gradient
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            grad.addColorStop(0, 'rgba(255,255,255,0.5)');
            grad.addColorStop(0.5, this.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 1.2, 0, Math.PI*2);
            ctx.fill();

            // Core
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI*2);
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

             // Scale part by creature scale
             const pScale = this.scale;
             ctx.scale(pScale, pScale);

             if(part.type === 'Fin') {
                 ctx.fillStyle = 'rgba(255,255,255,0.2)';
                 ctx.strokeStyle = '#fff';
                 ctx.lineWidth = 1;
                 ctx.beginPath();
                 ctx.moveTo(0,0); ctx.quadraticCurveTo(15, -10, 30, 0); ctx.quadraticCurveTo(15, 10, 0, 0);
                 ctx.fill(); ctx.stroke();
             } else if (part.type === 'Spike') {
                 ctx.fillStyle = '#f00';
                 ctx.beginPath();
                 ctx.moveTo(0, -5); ctx.lineTo(20, 0); ctx.lineTo(0, 5);
                 ctx.fill();
             } else if (part.type === 'Jaws') {
                 ctx.fillStyle = '#eee';
                 ctx.beginPath();
                 ctx.moveTo(0, -5); ctx.lineTo(15, -2); ctx.lineTo(0, 0);
                 ctx.moveTo(0, 5); ctx.lineTo(15, 2); ctx.lineTo(0, 0);
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
