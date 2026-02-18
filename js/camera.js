export default class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.targetZoom = 1;
        this.vx = 0;
        this.vy = 0;

        this.viewportWidth = width;
        this.viewportHeight = height;

        // Settings
        this.followStrength = 0.05;
        this.baseZoom = 0.8;
    }

    resize(w, h) {
        this.viewportWidth = w;
        this.viewportHeight = h;
    }

    update(targetX, targetY, targetVx, targetVy, dt, playerMass = 10) {
        // 1. Calculate Target Position (Center on player + Lookahead)
        const idealX = targetX + targetVx * 0.5;
        const idealY = targetY + targetVy * 0.5;

        // Smooth Camera Movement
        const dx = idealX - this.x;
        const dy = idealY - this.y;
        this.x += dx * this.followStrength;
        this.y += dy * this.followStrength;

        // Track Velocity for Parallax
        this.vx = dx * this.followStrength / dt;
        this.vy = dy * this.followStrength / dt;

        // 2. Infinite Zoom Logic
        // We want the player to maintain roughly constant screen size.
        // Player Radius ~ sqrt(Mass) * constant
        // Screen Radius = World Radius * Zoom
        // Target Screen Radius ~ 30px (arbitrary nice size)

        // World Radius approx = Math.sqrt(playerMass / 10) * 20
        // Zoom = Target Screen Radius / World Radius

        const worldRadius = Math.sqrt(playerMass / 10) * 20;
        let idealZoom = 40 / Math.max(20, worldRadius); // 40px target size

        // Speed Factor: Zoom out slightly when fast
        const speed = Math.hypot(targetVx, targetVy);
        const speedFactor = Math.min(speed / 2000, 1.0);
        idealZoom *= (1.0 - speedFactor * 0.3);

        this.targetZoom = idealZoom;

        // No Clamp (Infinite Scale) - but safety min to prevent 0
        this.targetZoom = Math.max(0.0001, this.targetZoom);

        // Smooth Zoom
        this.zoom += (this.targetZoom - this.zoom) * 0.05;
    }

    worldToScreen(wx, wy) {
        return {
            x: (wx - this.x) * this.zoom + this.viewportWidth / 2,
            y: (wy - this.y) * this.zoom + this.viewportHeight / 2
        };
    }

    screenToWorld(sx, sy) {
        return {
            x: (sx - this.viewportWidth / 2) / this.zoom + this.x,
            y: (sy - this.viewportHeight / 2) / this.zoom + this.y
        };
    }

    apply(ctx) {
        ctx.save();
        ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x, -this.y);
    }

    restore(ctx) {
        ctx.restore();
    }
}
