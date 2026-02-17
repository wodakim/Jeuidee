export default class Sonar {
    constructor(game) {
        this.game = game;
        this.pulses = []; // {x, y, radius, maxRadius, life}
        this.timer = 0;
        this.pingInterval = 2.0; // Auto ping every 2s
        this.color = '#00ffff';
    }

    update(dt) {
        // Auto Ping from player head
        this.timer -= dt;
        if (this.timer <= 0) {
            this.timer = this.pingInterval;
            const head = this.game.creature.points[0];
            this.ping(head.x, head.y);
        }

        // Update Pulses
        for (let i = this.pulses.length - 1; i >= 0; i--) {
            const p = this.pulses[i];
            p.life -= dt;
            p.radius += dt * 500; // Speed of sound
            if (p.life <= 0 || p.radius > p.maxRadius) {
                this.pulses.splice(i, 1);
            }
        }
    }

    ping(x, y) {
        this.pulses.push({
            x: x, y: y,
            radius: 10,
            maxRadius: 1000,
            life: 2.0
        });
        if(this.game.settings.audioEnabled) {
            // Very quiet ping
            // this.game.audio.playTone(800, 'sine', 0.1);
        }
    }

    render(ctx, camera) {
        if (!this.game.settings.fxEnabled) return;

        ctx.save();
        ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        this.pulses.forEach(p => {
            // Draw Pulse Ring
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 255, ${p.life * 0.3})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Check intersections with enemies/food to draw "Blips"
            // This is the "Radar" part.
            // Only draw blips if the pulse wave is close to the object?
            // Or just highlight objects inside the pulse?

            // "Scan Line" effect: If object distance is roughly equal to pulse radius.

            const thickness = 50;

            // Enemies
            this.game.enemies.forEach(e => {
                const eHead = e.points[0];
                const dist = Math.hypot(eHead.x - p.x, eHead.y - p.y);
                if (Math.abs(dist - p.radius) < thickness) {
                    // Draw Blip
                    ctx.fillStyle = e.bossType ? '#ff0000' : '#ff00ff';
                    ctx.beginPath();
                    ctx.arc(eHead.x, eHead.y, eHead.radius * 2, 0, Math.PI*2);
                    ctx.fill();

                    // Draw connection line
                    ctx.beginPath();
                    ctx.moveTo(eHead.x, eHead.y);
                    ctx.lineTo(p.x + (eHead.x - p.x) * (p.radius/dist), p.y + (eHead.y - p.y) * (p.radius/dist));
                    ctx.strokeStyle = `rgba(255, 0, 255, 0.5)`;
                    ctx.stroke();
                }
            });

            // Food (only rare food/meat?)
            // Too much visual noise if we ping every food.
            // Let's ping Meat or large clusters.
            this.game.food.forEach(f => {
                if (f.type === 'meat') {
                    const dist = Math.hypot(f.x - p.x, f.y - p.y);
                    if (Math.abs(dist - p.radius) < thickness) {
                        ctx.fillStyle = '#ffaa00';
                        ctx.beginPath();
                        ctx.arc(f.x, f.y, f.radius * 2, 0, Math.PI*2);
                        ctx.fill();
                    }
                }
            });
        });

        ctx.restore();
    }
}
