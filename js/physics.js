export default class Physics {
    constructor() {
        this.gravity = 0;
        this.friction = 0.94; // Decreased friction from 0.92 for more "glide"
        this.elasticity = 0.5;
    }

    static createPoint(x, y, radius = 10, mass = 1) {
        return {
            x: x, y: y,
            oldX: x, oldY: y,
            vx: 0, vy: 0,
            radius: radius,
            mass: mass,
            pinned: false
        };
    }

    static createConstraint(p1, p2, stiffness = 0.1, length = null) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return {
            p1: p1,
            p2: p2,
            length: length !== null ? length : Math.hypot(dx, dy),
            stiffness: stiffness
        };
    }

    update(points, constraints, dt) {
        for (let p of points) {
            if (p.pinned) continue;
            // Velocity Verlet
            const vx = (p.x - p.oldX) * this.friction;
            const vy = (p.y - p.oldY) * this.friction;
            p.oldX = p.x;
            p.oldY = p.y;
            p.x += vx;
            p.y += vy;
            p.vx = vx;
            p.vy = vy;
        }

        const iterations = 3; // Optimization: Reduced from 5
        for (let i = 0; i < iterations; i++) {
            for (let c of constraints) {
                const dx = c.p2.x - c.p1.x;
                const dy = c.p2.y - c.p1.y;
                const dist = Math.hypot(dx, dy);
                if (dist === 0) continue;
                const diff = (c.length - dist) / dist;
                const offset = diff * c.stiffness * 0.5;
                const offsetX = dx * offset;
                const offsetY = dy * offset;
                if (!c.p1.pinned) {
                    c.p1.x -= offsetX;
                    c.p1.y -= offsetY;
                }
                if (!c.p2.pinned) {
                    c.p2.x += offsetX;
                    c.p2.y += offsetY;
                }
            }
        }
    }

    static checkSoftBodyCollision(body1Points, body2Points) {
        let collision = false;

        for (let p1 of body1Points) {
            for (let p2 of body2Points) {
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dist = Math.hypot(dx, dy);
                const minDist = p1.radius + p2.radius;

                if (dist < minDist) {
                    collision = true;
                    const overlap = minDist - dist;
                    const nx = dx / dist;
                    const ny = dy / dist;

                    const force = overlap * 0.5;

                    p1.x += nx * force;
                    p1.y += ny * force;
                    p2.x -= nx * force;
                    p2.y -= ny * force;

                    // Bounce
                    const bounce = 0.8; // Higher bounce
                    p1.oldX -= nx * bounce;
                    p1.oldY -= ny * bounce;
                    p2.oldX += nx * bounce;
                    p2.oldY += ny * bounce;
                }
            }
        }
        return collision;
    }
}
