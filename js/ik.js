// Procedural Animation System (Inverse Kinematics)

export default class IKSystem {
    // Verlet Integration for smooth, organic tentacle movement
    // No strict FABRIK, but a physics-based chain simulation perfect for "Jelly" feel.

    constructor() {}

    static createTentacle(length = 8, segmentLength = 10) {
        let segments = [];
        for (let i = 0; i < length; i++) {
            // Initialize points with velocity storage (oldX/oldY)
            segments.push({ x: 0, y: 0, oldX: 0, oldY: 0 });
        }
        return { segments, segmentLength };
    }

    static update(tentacle, rootX, rootY, angleOffset, dt) {
        const segments = tentacle.segments;
        if (!segments || segments.length === 0) return;

        // 1. Move Root to Bone Position
        const root = segments[0];
        root.x = rootX;
        root.y = rootY;

        // If this is the first frame (or reset), init all segments to root to avoid explosion
        if (segments[1].x === 0 && segments[1].y === 0) {
             for(let i=1; i<segments.length; i++) {
                 segments[i].x = rootX; segments[i].y = rootY;
                 segments[i].oldX = rootX; segments[i].oldY = rootY;
             }
        }

        // 2. Physics Simulation (Verlet Integration)
        const drag = 0.9;
        const time = Date.now() * 0.003;

        for (let i = 1; i < segments.length; i++) {
            const p = segments[i];

            // Calculate Velocity
            const vx = (p.x - p.oldX) * drag;
            const vy = (p.y - p.oldY) * drag;

            // Store current as old for next frame
            p.oldX = p.x;
            p.oldY = p.y;

            // Apply Velocity
            p.x += vx;
            p.y += vy;

            // Add Procedural Wave Motion (Sine Wave perpendicular to tentacle direction)
            const wave = Math.sin(time + i * 0.5) * (i * 0.5);

            const pX = Math.cos(angleOffset + Math.PI/2);
            const pY = Math.sin(angleOffset + Math.PI/2);

            p.x += pX * wave * dt * 60;
            p.y += pY * wave * dt * 60;
        }

        // 3. Constrain Lengths (Relaxation Solver)
        const iterations = 5;
        const segLen = tentacle.segmentLength;

        for (let k = 0; k < iterations; k++) {
            segments[0].x = rootX;
            segments[0].y = rootY;

            for (let i = 0; i < segments.length - 1; i++) {
                const a = segments[i];
                const b = segments[i+1];

                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.hypot(dx, dy);

                if (dist === 0) continue;

                const diff = (dist - segLen) / dist;

                const ox = dx * diff * 0.5;
                const oy = dy * diff * 0.5;

                if (i !== 0) {
                     a.x += ox;
                     a.y += oy;
                }
                b.x -= ox;
                b.y -= oy;
            }
        }
    }
}
