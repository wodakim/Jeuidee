
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
    }

    resize(w, h) {
        this.viewportWidth = w;
        this.viewportHeight = h;
    }

    update(targetX, targetY, targetVx, targetVy, dt) {
        // 1. Calculate Target Position (Center on player + Lookahead)
        // We want the player to be in the center, so Camera coordinates are top-left of the view

        // Target is the world position we want in the center of the screen
        const idealX = targetX + targetVx * 0.5; // Lookahead
        const idealY = targetY + targetVy * 0.5;

        // 2. Smoothly interpolate current camera position towards ideal
        // Note: Camera.x/y represents the CENTER of the view in World Space
        this.x += (idealX - this.x) * this.followStrength;
        this.y += (idealY - this.y) * this.followStrength;

        // 3. Zoom Logic (Dynamic based on speed?)
        const speed = Math.hypot(targetVx, targetVy);
        // Base zoom 1, zoom out to 0.5 at high speed
        const speedFactor = Math.min(speed / 1000, 1);
        this.targetZoom = 1 - (speedFactor * 0.3); // Max zoom out 0.7

        this.zoom += (this.targetZoom - this.zoom) * 0.02; // Slow zoom
    }

    // Convert World Point to Screen Point
    worldToScreen(wx, wy) {
        // (World - Cam) * Zoom + HalfScreen
        return {
            x: (wx - this.x) * this.zoom + this.viewportWidth / 2,
            y: (wy - this.y) * this.zoom + this.viewportHeight / 2
        };
    }

    // Convert Screen Point to World Point (for Input)
    screenToWorld(sx, sy) {
        // (Screen - HalfScreen) / Zoom + Cam
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
