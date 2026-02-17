export default class Sonar {
    constructor(game) {
        this.game = game;
        this.pulses = []; // {x, y, radius, maxRadius, life}
        this.detectedTargets = []; // {x, y, type, life}

        this.cooldown = 0;
        this.maxCooldown = 5.0;
        this.rangeMultiplier = 3.0; // How far relative to screen
    }

    activate() {
        if (this.cooldown > 0) return false;

        this.cooldown = this.maxCooldown;
        const head = this.game.creature.points[0];

        // Dynamic Range based on Creature Size + Screen Size
        // Should go "Very Far".
        // Let's say 3x the diagonal of the screen in world units?
        // Or fixed large distance?
        // Infinite map, so relative to zoom is better.
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
            checked: false // Optimization flag? No, check continuously
        });
    }

    update(dt) {
        if (this.cooldown > 0) this.cooldown -= dt;

        // Update Pulses
        for (let i = this.pulses.length - 1; i >= 0; i--) {
            const p = this.pulses[i];
            p.life -= dt;

            // Expansion Speed: Reach maxRadius in 2 seconds?
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
        // Check for new targets crossing the pulse ring
        // Thickness of scan
        const thickness = 100;
        const innerR = pulse.radius - thickness;
        const outerR = pulse.radius;

        // Scan Enemies
        this.game.enemies.forEach(e => {
            if (e.scanned) return; // Custom flag on enemy to avoid double scan per ping?
            // Actually, just check if already in detectedTargets?
            // Better: reset 'scanned' flag on enemies when ping starts? Too complex.
            // Just add to detectedTargets if not already there with high life.

            const head = e.points[0];
            const dist = Math.hypot(head.x - pulse.x, head.y - pulse.y);

            if (dist >= innerR && dist <= outerR) {
                // Found!
                this.addTarget(head.x, head.y, e.bossType ? 'boss' : 'enemy');
            }
        });

        // Scan Food (Meat/Rare)
        this.game.food.forEach(f => {
            if (f.type !== 'meat') return; // Only meat is worth scanning? Or large food?
            const dist = Math.hypot(f.x - pulse.x, f.y - pulse.y);
             if (dist >= innerR && dist <= outerR) {
                this.addTarget(f.x, f.y, 'food');
            }
        });
    }

    addTarget(x, y, type) {
        // Avoid duplicates close to each other
        const existing = this.detectedTargets.find(t => Math.hypot(t.x - x, t.y - y) < 100 && t.type === type);
        if (existing) {
            existing.life = 3.0; // Refresh
            existing.x = x; existing.y = y; // Update pos
            return;
        }

        this.detectedTargets.push({
            x: x, y: y,
            type: type,
            life: 3.0 // Show indicator for 3 seconds
        });
    }

    render(ctx, camera) {
        if (!this.game.settings.fxEnabled && this.pulses.length === 0 && this.detectedTargets.length === 0) return;

        ctx.save();

        // 1. Draw Pulses (World Space)
        ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(-camera.x, -camera.y);

        this.pulses.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 255, ${p.life / 3})`; // Fade out
            ctx.lineWidth = 5 + (p.radius / 500); // Thicker as it grows
            ctx.stroke();
        });

        // 2. Draw Detected Targets (Blips)
        // These are drawn at their world position
        this.detectedTargets.forEach(t => {
            ctx.fillStyle = t.type === 'boss' ? '#f00' : (t.type === 'food' ? '#fa0' : '#f0f');
            ctx.globalAlpha = t.life / 3.0;
            ctx.beginPath();
            ctx.arc(t.x, t.y, 20 / camera.zoom, 0, Math.PI*2); // Constant screen size
            ctx.fill();
            ctx.globalAlpha = 1.0;
        });

        ctx.restore();

        // 3. Draw Directional Indicators (Screen Space)
        // For targets that are OFF SCREEN.
        this.detectedTargets.forEach(t => {
            const screenPos = camera.worldToScreen(t.x, t.y);
            const pad = 50;
            const w = ctx.canvas.width;
            const h = ctx.canvas.height;

            // Check if offscreen
            if (screenPos.x < 0 || screenPos.x > w || screenPos.y < 0 || screenPos.y > h) {
                // Calculate direction vector from center
                const cx = w/2;
                const cy = h/2;
                const dx = screenPos.x - cx;
                const dy = screenPos.y - cy;
                const angle = Math.atan2(dy, dx);

                // Clamp to screen edge
                // Simple box clamping
                // x = cx + t * dx, y = cy + t * dy
                // find t such that x is 0 or w, or y is 0 or h

                // Better: Just put it on a circle of radius min(w,h)/2 - pad
                const radius = Math.min(w, h)/2 - pad;
                const arrowX = cx + Math.cos(angle) * radius;
                const arrowY = cy + Math.sin(angle) * radius;

                // Draw Arrow
                ctx.save();
                ctx.translate(arrowX, arrowY);
                ctx.rotate(angle);
                ctx.fillStyle = t.type === 'boss' ? '#f00' : (t.type === 'food' ? '#fa0' : '#f0f');
                ctx.globalAlpha = t.life / 3.0;

                ctx.beginPath();
                ctx.moveTo(10, 0);
                ctx.lineTo(-10, 10);
                ctx.lineTo(-10, -10);
                ctx.fill();

                // Icon
                ctx.fillStyle = '#fff';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(t.type === 'boss' ? '!' : (t.type === 'food' ? 'Meat' : ''), -20, 0);

                ctx.restore();
            }
        });
    }
}
