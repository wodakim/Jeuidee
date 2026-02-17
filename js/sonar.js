export default class Sonar {
    constructor(game) {
        this.game = game;
        this.pulses = []; // {x, y, radius, maxRadius, life}
        this.detectedTargets = []; // {x, y, type, life}

        this.cooldown = 0;
        this.maxCooldown = 5.0;
    }

    activate() {
        if (this.cooldown > 0) return false;

        // Requirement: DNA > 10
        if (this.game.creature.gameStats.dna < 10) {
            // Visual feedback failure?
            if(navigator.vibrate) navigator.vibrate(200);
            return false;
        }

        this.cooldown = this.maxCooldown;
        const head = this.game.creature.points[0];

        // Spawn Mate!
        if (!this.game.mate) {
             this.game.spawnMate();
        }

        // Ping
        const zoom = this.game.camera.zoom;
        const screenDiag = Math.hypot(this.game.width, this.game.height);
        const worldDiag = screenDiag / zoom;
        const maxRadius = worldDiag * 2.0;

        this.ping(head.x, head.y, maxRadius);

        // Haptic
        if(navigator.vibrate) navigator.vibrate([50, 50, 100]);
        // Audio
        if(this.game.settings.audioEnabled) this.game.audio.playTone(800, 'sine', 1.0);

        return true;
    }

    ping(x, y, maxRadius) {
        this.pulses.push({
            x: x, y: y,
            radius: 10,
            maxRadius: maxRadius,
            life: 3.0, // Duration of expansion
            checked: false
        });
    }

    update(dt) {
        if (this.cooldown > 0) this.cooldown -= dt;

        // Update Pulses
        for (let i = this.pulses.length - 1; i >= 0; i--) {
            const p = this.pulses[i];
            p.life -= dt;
            const speed = p.maxRadius / 2.0;
            p.radius += dt * speed;

            if (p.life <= 0 || p.radius > p.maxRadius) {
                this.pulses.splice(i, 1);
            } else {
                this.scan(p);
            }
        }

        // Update Detected Targets (Fade out indicators)
        for (let i = this.detectedTargets.length - 1; i >= 0; i--) {
            const t = this.detectedTargets[i];
            t.life -= dt;
            if (t.life <= 0) this.detectedTargets.splice(i, 1);
        }
    }

    scan(pulse) {
        const thickness = 100;
        const innerR = pulse.radius - thickness;
        const outerR = pulse.radius;

        // Scan Mate
        if (this.game.mate) {
            const head = this.game.mate.points[0];
            const dist = Math.hypot(head.x - pulse.x, head.y - pulse.y);
            if (dist >= innerR && dist <= outerR) {
                this.addTarget(head.x, head.y, 'mate');
            }
        }

        // Scan Enemies
        this.game.enemies.forEach(e => {
            const head = e.points[0];
            const dist = Math.hypot(head.x - pulse.x, head.y - pulse.y);
            if (dist >= innerR && dist <= outerR) {
                this.addTarget(head.x, head.y, e.bossType ? 'boss' : 'enemy');
            }
        });

        // Scan Food (Meat/Rare)
        this.game.food.forEach(f => {
            if (f.type !== 'meat') return;
            const dist = Math.hypot(f.x - pulse.x, f.y - pulse.y);
             if (dist >= innerR && dist <= outerR) {
                this.addTarget(f.x, f.y, 'food');
            }
        });
    }

    addTarget(x, y, type) {
        const existing = this.detectedTargets.find(t => Math.hypot(t.x - x, t.y - y) < 100 && t.type === type);
        if (existing) {
            existing.life = 3.0;
            existing.x = x; existing.y = y;
            return;
        }

        this.detectedTargets.push({
            x: x, y: y,
            type: type,
            life: 3.0
        });
    }

    render(ctx, camera) {
        if (this.pulses.length === 0 && this.detectedTargets.length === 0) return;

        ctx.save();
        ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        this.pulses.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 255, ${p.life / 3})`;
            ctx.lineWidth = 5 + (p.radius / 500);
            ctx.stroke();
        });

        this.detectedTargets.forEach(t => {
            let color = '#f0f';
            if (t.type === 'boss') color = '#f00';
            else if (t.type === 'food') color = '#fa0';
            else if (t.type === 'mate') color = '#ff69b4'; // Pink for mate

            ctx.fillStyle = color;
            ctx.globalAlpha = t.life / 3.0;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 20 / camera.zoom, 0, Math.PI*2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        });

        ctx.restore();

        // Directional Indicators
        this.detectedTargets.forEach(t => {
            const screenPos = camera.worldToScreen(t.x, t.y);
            const w = ctx.canvas.width;
            const h = ctx.canvas.height;

            if (screenPos.x < 0 || screenPos.x > w || screenPos.y < 0 || screenPos.y > h) {
                const cx = w/2;
                const cy = h/2;
                const dx = screenPos.x - cx;
                const dy = screenPos.y - cy;
                const angle = Math.atan2(dy, dx);
                const radius = Math.min(w, h)/2 - 50;
                const arrowX = cx + Math.cos(angle) * radius;
                const arrowY = cy + Math.sin(angle) * radius;

                ctx.save();
                ctx.translate(arrowX, arrowY);
                ctx.rotate(angle);

                let color = '#f0f';
                if (t.type === 'boss') color = '#f00';
                else if (t.type === 'food') color = '#fa0';
                else if (t.type === 'mate') color = '#ff69b4';

                ctx.fillStyle = color;
                ctx.globalAlpha = t.life / 3.0;

                ctx.beginPath();
                ctx.moveTo(10, 0);
                ctx.lineTo(-10, 10);
                ctx.lineTo(-10, -10);
                ctx.fill();

                // Icon
                if (t.type === 'mate') {
                    ctx.fillStyle = '#fff';
                    ctx.font = '20px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('♥', -20, 5);
                }

                ctx.restore();
            }
        });
    }
}
