
export default class Physics {
    constructor() {
        this.gravity = 0;
        this.friction = 0.92;
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
            const vx = (p.x - p.oldX) * this.friction;
            const vy = (p.y - p.oldY) * this.friction;
            p.oldX = p.x;
            p.oldY = p.y;
            p.x += vx;
            p.y += vy;
            p.vx = vx;
            p.vy = vy;
        }

        const iterations = 5;
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
}
