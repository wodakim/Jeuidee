export default class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.targetZoom = 1;

        this.viewportWidth = width;
        this.viewportHeight = height;

        // Settings
        this.followStrength = 0.05; // Lerp factor (lower = smoother/lazier)
        this.lookAhead = 100; // How far to look ahead based on velocity
        this.baseZoom = 1.0;
    }

    resize(w, h) {
        this.viewportWidth = w;
        this.viewportHeight = h;
    }

    update(targetX, targetY, targetVx, targetVy, dt, playerMass = 10) {
        // 1. Calculate Target Position (Center on player + Lookahead)
        const idealX = targetX + targetVx * 0.5; // Lookahead
        const idealY = targetY + targetVy * 0.5;

        // 2. Smoothly interpolate current camera position towards ideal
        this.x += (idealX - this.x) * this.followStrength;
        this.y += (idealY - this.y) * this.followStrength;

        // 3. Zoom Logic (Dynamic based on Mass and Speed)
        // Base scale inverse to mass
        // Mass 10 -> Scale 1.0
        // Mass 100 -> Scale 3.16 -> Zoom ~0.3

        const playerScale = Math.sqrt(playerMass / 10);

        // Target Zoom is inverse of player scale, but clamped
        // Zoom out as player gets bigger to keep view consistent relative to player size
        const massZoom = this.baseZoom / Math.max(1, playerScale * 0.8);

        // Also zoom out slightly with speed
        const speed = Math.hypot(targetVx, targetVy);
        const speedFactor = Math.min(speed / 1000, 1);
        const speedZoomMod = 1 - (speedFactor * 0.2);

        this.targetZoom = massZoom * speedZoomMod;

        // Clamp min zoom to avoid seeing edge of world if we had one (but world is infinite parallax)
        this.targetZoom = Math.max(0.1, this.targetZoom);

        this.zoom += (this.targetZoom - this.zoom) * 0.02; // Slow zoom
    }

    // Convert World Point to Screen Point
    worldToScreen(wx, wy) {
        return {
            x: (wx - this.x) * this.zoom + this.viewportWidth / 2,
            y: (wy - this.y) * this.zoom + this.viewportHeight / 2
        };
    }

    // Convert Screen Point to World Point
    screenToWorld(sx, sy) {
        return {
            x: (sx - this.viewportWidth / 2) / this.zoom + this.x,
            y: (sy - this.viewportHeight / 2) / this.zoom + this.y
        };
    }

    // Apply transform to Context
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
