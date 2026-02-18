export default class Background {
    constructor(game) {
        this.game = game;
        this.layers = [];
        this.width = game.width;
        this.height = game.height;
        this.initLayers();
    }

    initLayers() {
        // Layer 1: Far (Blurred, Slow)
        this.layers.push({
            speed: 0.1,
            particles: this.createParticles(50, 2, 4), // Small dots
            color: 'rgba(255, 255, 255, 0.1)',
            blur: 2
        });

        // Layer 2: Mid (Sharp, Medium Speed)
        this.layers.push({
            speed: 0.3,
            particles: this.createParticles(30, 3, 6),
            color: 'rgba(255, 255, 255, 0.2)',
            blur: 0
        });

        // Layer 3: Near (Large Bokeh, Fast)
        this.layers.push({
            speed: 0.6,
            particles: this.createParticles(10, 20, 50), // Large blobs
            color: 'rgba(255, 255, 255, 0.05)',
            blur: 5
        });
    }

    createParticles(count, minSize, maxSize) {
        const p = [];
        for(let i=0; i<count; i++) {
            p.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: minSize + Math.random() * (maxSize - minSize),
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10
            });
        }
        return p;
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        // Re-distribute particles? Or just let them wrap.
    }

    update(dt, camera) {
        // Scroll based on camera movement
        this.layers.forEach(layer => {
            layer.particles.forEach(p => {
                // Parallax Scroll
                // We move particles opposite to camera
                p.x -= camera.vx * layer.speed * dt;
                p.y -= camera.vy * layer.speed * dt;

                // Natural Drift
                p.x += p.vx * dt;
                p.y += p.vy * dt;

                // Wrap Screen
                // Use a large virtual bounds to avoid popping
                const margin = 100;
                // Calculate screen position relative to camera wrap is tricky with zoom.
                // Simpler: Keep particles in "Screen Space" and just offset them.

                if (p.x < -margin) p.x += this.width + margin * 2;
                if (p.x > this.width + margin) p.x -= this.width + margin * 2;
                if (p.y < -margin) p.y += this.height + margin * 2;
                if (p.y > this.height + margin) p.y -= this.height + margin * 2;
            });
        });
    }

    render(ctx, biomeColor) {
        // Draw Deep Background Gradient
        // We use the Biome Color but make it a gradient
        const grd = ctx.createLinearGradient(0, 0, 0, this.height);
        grd.addColorStop(0, '#000011'); // Always dark top
        grd.addColorStop(1, biomeColor || '#001020'); // Biome bottom

        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw Particles
        this.layers.forEach(layer => {
            ctx.fillStyle = layer.color;
            // Optim: Batch drawing if possible, but individual circles are fast enough
            // Filter is expensive. Avoid context filter in loop if possible.
            // But for "Microscope" look, blur is key.
            // On mobile, ctx.filter is heavy.
            // Trick: Use 'globalAlpha' and soft gradients for bokeh, not blur filter.

            layer.particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
                ctx.fill();
            });
        });

        // Vignette Overlay (Static)
        const rad = Math.max(this.width, this.height) * 0.8;
        const vig = ctx.createRadialGradient(this.width/2, this.height/2, rad * 0.5, this.width/2, this.height/2, rad);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,10,0.6)'); // Dark blue vignette

        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, this.width, this.height);
    }
}
