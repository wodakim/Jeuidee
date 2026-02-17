import Stats from './stats.js';
import Physics from './physics.js';

export default class Ally {
    constructor(data, x, y, physics) {
        this.physics = physics;
        this.active = true;
        this.type = 'ally';

        // Reconstruct from Data (Old Player State)
        this.points = [];
        this.constraints = [];
        this.parts = JSON.parse(JSON.stringify(data.parts));
        this.color = data.color;

        // Stats
        this.stats = new Stats();
        // Ensure gameStats exists and has health
        this.gameStats = {
            health: data.gameStats ? data.gameStats.maxHealth : 100,
            maxHealth: data.gameStats ? data.gameStats.maxHealth : 100,
            mass: data.gameStats ? data.gameStats.mass : 10
        };

        // Rebuild Body at X, Y
        this.rebuildBody(data.points, x, y);

        this.stats.calculate(this.parts);

        // AI State
        this.state = 'follow'; // follow, attack
        this.headAngle = 0;
    }

    rebuildBody(sourcePoints, startX, startY) {
        if (!sourcePoints || sourcePoints.length === 0) return;

        // Calculate offset based on the first point (Head)
        const headSource = sourcePoints[0];
        const offsetX = startX - headSource.x;
        const offsetY = startY - headSource.y;

        sourcePoints.forEach((p, i) => {
            // Create new point with offset
            const newP = Physics.createPoint(p.x + offsetX, p.y + offsetY, p.baseRadius || 20, p.mass || 1);
            newP.baseRadius = p.baseRadius || 20;
            newP.radius = newP.baseRadius; // Init radius

            this.points.push(newP);

            if (i > 0) {
                 const prev = this.points[i-1];
                 const dist = Math.hypot(newP.x - prev.x, newP.y - prev.y);
                 const c = Physics.createConstraint(prev, newP, 0.5, dist);
                 c.baseLength = dist;
                 this.constraints.push(c);
            }
        });
    }

    update(dt, enemies, playerHead) {
        const head = this.points[0];
        if (!head) return;

        // 1. Find Closest Enemy
        let closest = null;
        let minDist = 800; // Aggro range

        for(let e of enemies) {
            if (!e.active) continue;
            const dist = Math.hypot(e.points[0].x - head.x, e.points[0].y - head.y);
            if (dist < minDist) {
                minDist = dist;
                closest = e;
            }
        }

        let targetX = playerHead.x;
        let targetY = playerHead.y;
        let speedMult = 1.0;

        if (closest) {
            this.state = 'attack';
            targetX = closest.points[0].x;
            targetY = closest.points[0].y;
            speedMult = 1.2; // Move faster when attacking
        } else {
            this.state = 'follow';
            // Follow player but maintain distance (flocking-ish)
            const dx = playerHead.x - head.x;
            const dy = playerHead.y - head.y;
            const d = Math.hypot(dx, dy);

            if (d < 300) {
                 // Too close? Move Away
                 targetX = head.x - dx;
                 targetY = head.y - dy;
                 speedMult = 0.8;
            } else if (d > 600) {
                 // Too far? Catch up
                 targetX = playerHead.x;
                 targetY = playerHead.y;
                 speedMult = 1.1;
            } else {
                 // Just right? Orbit/Wander near player
                 targetX = head.x + (Math.random()-0.5)*100;
                 targetY = head.y + (Math.random()-0.5)*100;
                 speedMult = 0.5;
            }
        }

        // Movement
        const dx = targetX - head.x;
        const dy = targetY - head.y;
        const dist = Math.hypot(dx, dy);

        // Update Head Angle
        if (dist > 1) {
             let targetAngle = Math.atan2(dy, dx);
             let diff = targetAngle - this.headAngle;
             while (diff > Math.PI) diff -= Math.PI * 2;
             while (diff < -Math.PI) diff += Math.PI * 2;
             this.headAngle += diff * 5.0 * dt; // Turn speed
        }

        if (dist > 20) {
            const speed = (this.stats.speed || 300) * speedMult;
            const force = speed * dt * dt;

            // Apply impulse to head in direction of headAngle
            head.x += Math.cos(this.headAngle) * force;
            head.y += Math.sin(this.headAngle) * force;
        }

        this.physics.update(this.points, this.constraints, dt);
    }
}
