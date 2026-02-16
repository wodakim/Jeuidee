import Enemy from './enemy.js';

export default class BoidManager {
    constructor(physics) {
        this.physics = physics;
        this.flocks = [];
    }

    createFlock(x, y, count, difficulty, type = 'grazer') {
        const flock = [];
        const flockId = Math.floor(Math.random() * 10000);
        for (let i = 0; i < count; i++) {
            // Spawn close to center
            const ex = x + (Math.random() - 0.5) * 200;
            const ey = y + (Math.random() - 0.5) * 200;
            const enemy = new Enemy(ex, ey, difficulty, this.physics, type);
            enemy.flockId = flockId;
            flock.push(enemy);
        }
        this.flocks.push(flock);
        return flock;
    }

    update(dt, enemies) {
        const separationDist = 80;
        const cohesionDist = 200;

        enemies.forEach(e => {
            if (e.type !== 'grazer') return;

            let sepX = 0, sepY = 0;
            let cohX = 0, cohY = 0;
            let count = 0;

            const head = e.points[0];

            enemies.forEach(other => {
                if (e === other || other.type !== 'grazer') return;
                // Only flock with same flockId? Or all grazers? Let's say all grazers for now, or use flockId if we want distinct groups.
                // Using flockId makes them stay in their spawn groups.
                if (e.flockId !== other.flockId) return;

                const otherHead = other.points[0];
                const dist = Math.hypot(head.x - otherHead.x, head.y - otherHead.y);

                if (dist < cohesionDist) {
                    // Separation
                    if (dist < separationDist && dist > 0) {
                        sepX += (head.x - otherHead.x) / dist; // Push away
                        sepY += (head.y - otherHead.y) / dist;
                    }

                    // Cohesion
                    cohX += otherHead.x;
                    cohY += otherHead.y;

                    count++;
                }
            });

            if (count > 0) {
                // Apply forces (Soft Body impulse)
                const sepForce = 8000; // Strong separation
                head.x += sepX * sepForce * dt * dt;
                head.y += sepY * sepForce * dt * dt;

                // Cohesion
                cohX /= count;
                cohY /= count;
                const cohDirX = cohX - head.x;
                const cohDirY = cohY - head.y;
                const cohForce = 200;

                head.x += cohDirX * cohForce * dt * dt;
                head.y += cohDirY * cohForce * dt * dt;
            }
        });
    }
}
