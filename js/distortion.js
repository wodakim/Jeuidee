export default class Distortion {
    constructor(canvas, settings) {
        this.canvas = canvas;
        this.settings = settings;
        this.shockwaves = []; // {x, y, radius, life, maxRadius}
    }

    addShockwave(x, y) {
        if (!this.settings.fxEnabled) return;
        this.shockwaves.push({
            x: x, y: y,
            radius: 10,
            maxRadius: 200,
            life: 1.0 // Seconds
        });
    }

    update(dt) {
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const w = this.shockwaves[i];
            w.life -= dt;
            w.radius += dt * 300; // Expand speed
            if (w.life <= 0 || w.radius > w.maxRadius) {
                this.shockwaves.splice(i, 1);
            }
        }
    }

    render(ctx, camera) {
        if (!this.settings.fxEnabled || this.shockwaves.length === 0) return;

        // Simple distortion simulation: Draw a displacement ring
        // Since we can't do true fragment shader distortion easily in 2D canvas without getting pixel data (slow),
        // We will simulate it by drawing a high-contrast ring with specific composite operations or just visual "waves".

        ctx.save();
        ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        this.shockwaves.forEach(w => {
            ctx.beginPath();
            ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
            ctx.lineWidth = 20 * w.life;
            ctx.strokeStyle = `rgba(200, 255, 255, ${w.life * 0.5})`;
            ctx.stroke();

            // Inner clear to simulate "hole" in space
            ctx.beginPath();
            ctx.arc(w.x, w.y, w.radius - 10, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 0, 0, ${w.life * 0.2})`;
            ctx.lineWidth = 5;
            ctx.stroke();
        });

        ctx.restore();
    }
}
