export default class Lighting {
    constructor(canvas, settings) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.settings = settings;

        // Offscreen canvas for lighting map
        // Optimization: Low Resolution for Lighting (0.25x)
        this.scale = 0.25;
        this.lightCanvas = document.createElement('canvas');
        this.lightCtx = this.lightCanvas.getContext('2d');
        this.resize(canvas.width, canvas.height);
    }

    resize(w, h) {
        this.lightCanvas.width = Math.ceil(w * this.scale);
        this.lightCanvas.height = Math.ceil(h * this.scale);
    }

    update(camera, entities) {
        if (!this.settings.fxEnabled) return;

        const w = this.lightCanvas.width;
        const h = this.lightCanvas.height;

        // 1. Fill with Ambient Darkness (Deep Abyss)
        // Made lighter to reveal parallax background (#1a1a33 instead of #000818)
        this.lightCtx.globalCompositeOperation = 'source-over';
        this.lightCtx.fillStyle = '#1a1a33';
        this.lightCtx.fillRect(0, 0, w, h);

        // 2. Add Lights (Lighter Mode)
        this.lightCtx.globalCompositeOperation = 'lighter';

        const s = this.scale; // Scale factor for coordinates

        // Player Light
        const pHead = entities.player.points[0];
        if (pHead) {
            const screenPos = camera.worldToScreen(pHead.x, pHead.y);
            const radius = Math.max(10, pHead.radius * camera.zoom * 6);
            this.drawLight(screenPos.x * s, screenPos.y * s, radius * s, '#44ffff');
        }

        // Enemies
        entities.enemies.forEach(e => {
            if (!e.active || !e.points || !e.points[0]) return;
            const head = e.points[0];
            const screenPos = camera.worldToScreen(head.x, head.y);

            // Optimization: Skip if off-screen (Bounds check adjusted for scale)
            if (screenPos.x < -100 || screenPos.x > this.canvas.width + 100 || screenPos.y < -100 || screenPos.y > this.canvas.height + 100) return;

            const radius = Math.max(10, head.radius * camera.zoom * 4);
            this.drawLight(screenPos.x * s, screenPos.y * s, radius * s, e.color);
        });

        // Food (Small lights)
        entities.food.forEach(f => {
            const screenPos = camera.worldToScreen(f.x, f.y);
            if (screenPos.x < -20 || screenPos.x > this.canvas.width + 20 || screenPos.y < -20 || screenPos.y > this.canvas.height + 20) return;

            const radius = Math.max(5, f.radius * camera.zoom * 3);
            this.drawLight(screenPos.x * s, screenPos.y * s, radius * s, f.color);
        });
    }

    drawLight(x, y, radius, color) {
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
            mainCtx.save();
            mainCtx.globalCompositeOperation = 'multiply';
            // Scale up the low-res light map
            mainCtx.imageSmoothingEnabled = true; // Smooth the low-res
            mainCtx.drawImage(this.lightCanvas, 0, 0, w, h);
            mainCtx.restore();
        }

        // Vignette (Atmosphere) - Reduced opacity to 0.5 to show depth
        mainCtx.save();
        mainCtx.globalCompositeOperation = 'source-over';
        const grad = mainCtx.createRadialGradient(w/2, h/2, h*0.4, w/2, h/2, h*1.0);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.5)');

        mainCtx.fillStyle = grad;
        mainCtx.fillRect(0, 0, w, h);
        mainCtx.restore();
    }
}
