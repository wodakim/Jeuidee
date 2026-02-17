export default class Lighting {
    constructor(canvas, settings) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.settings = settings;

        // Offscreen canvas for lighting map
        this.lightCanvas = document.createElement('canvas');
        this.lightCtx = this.lightCanvas.getContext('2d');
        this.resize(canvas.width, canvas.height);
    }

    resize(w, h) {
        this.lightCanvas.width = w;
        this.lightCanvas.height = h;
    }

    update(camera, entities) {
        if (!this.settings.fxEnabled) return;

        const w = this.lightCanvas.width;
        const h = this.lightCanvas.height;

        // 1. Fill with Ambient Darkness (Deep Abyss)
        this.lightCtx.globalCompositeOperation = 'source-over';
        this.lightCtx.fillStyle = '#000818'; // Very dark blue base
        this.lightCtx.fillRect(0, 0, w, h);

        // 2. Add Lights (Lighter Mode)
        this.lightCtx.globalCompositeOperation = 'lighter';

        // Player Light
        const pHead = entities.player.points[0];
        if (pHead) {
            const screenPos = camera.worldToScreen(pHead.x, pHead.y);
            const radius = Math.max(10, pHead.radius * camera.zoom * 6); // Ensure visible
            this.drawLight(screenPos.x, screenPos.y, radius, '#44ffff'); // Cyan glow
        }

        // Enemies
        entities.enemies.forEach(e => {
            if (!e.active || !e.points || !e.points[0]) return;
            const head = e.points[0];
            const screenPos = camera.worldToScreen(head.x, head.y);

            // Optimization: Skip if off-screen
            if (screenPos.x < -100 || screenPos.x > w + 100 || screenPos.y < -100 || screenPos.y > h + 100) return;

            const radius = Math.max(10, head.radius * camera.zoom * 4);
            this.drawLight(screenPos.x, screenPos.y, radius, e.color);
        });

        // Food (Small lights)
        entities.food.forEach(f => {
            const screenPos = camera.worldToScreen(f.x, f.y);
            // Optimization: Skip food
            if (screenPos.x < -20 || screenPos.x > w + 20 || screenPos.y < -20 || screenPos.y > h + 20) return;

            const radius = Math.max(5, f.radius * camera.zoom * 3);
            this.drawLight(screenPos.x, screenPos.y, radius, f.color);
        });
    }

    drawLight(x, y, radius, color) {
        // Create simple radial gradient
        const grad = this.lightCtx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        this.lightCtx.fillStyle = grad;
        this.lightCtx.beginPath();
        this.lightCtx.arc(x, y, radius, 0, Math.PI * 2);
        this.lightCtx.fill();
    }

    render(mainCtx) {
        const w = this.canvas.width;
        const h = this.canvas.height;

        if (this.settings.fxEnabled) {
            // Apply Dynamic Lighting (Multiply Blend Mode)
            // This tints the game with the light map.
            // Dark areas in light map become dark in game. Light areas reveal game color.
            mainCtx.save();
            mainCtx.globalCompositeOperation = 'multiply';
            mainCtx.drawImage(this.lightCanvas, 0, 0);
            mainCtx.restore();
        }

        // Vignette (Always visible for atmosphere)
        mainCtx.save();
        mainCtx.globalCompositeOperation = 'source-over';
        const grad = mainCtx.createRadialGradient(w/2, h/2, h*0.4, w/2, h/2, h*0.9);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.85)');

        mainCtx.fillStyle = grad;
        mainCtx.fillRect(0, 0, w, h);
        mainCtx.restore();
    }
}
