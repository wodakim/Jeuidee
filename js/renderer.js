import IKSystem from './ik.js';

export default class Renderer {
    constructor(ctx, camera, settings) {
        this.ctx = ctx;
        this.camera = camera;
        this.settings = settings;
    }

    drawCreature(creature, headAngle = 0) {
        // Enable Additive Blending for "Bioluminescent" look if enabled
        if (this.settings.fxEnabled) this.ctx.globalCompositeOperation = 'lighter';

        const points = creature.points;
        let color = creature.color || '#00ffff';

        // Diegetic Health: Modulate color/intensity
        const healthPct = creature.gameStats.health / creature.gameStats.maxHealth;

        // Flash Red on Damage
        if (creature.lastDamageTime && Date.now() - creature.lastDamageTime < 200) {
            color = '#ff0000';
        } else if (healthPct < 0.3) {
            // Pulse Red when low
            const pulse = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
            color = pulse > 0.5 ? '#ff0000' : color;
        }

        for (let i = points.length - 1; i >= 0; i--) {
            const p = points[i];

            // Glow intensity based on health
            const glowSize = 2.5 * (0.5 + 0.5 * healthPct);

            // Glow
            const grad = this.ctx.createRadialGradient(p.x, p.y, p.radius * 0.2, p.x, p.y, p.radius * glowSize);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
            this.ctx.fill();

            // Core
            this.ctx.fillStyle = 'white'; // White core for brightness
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw Attached Parts
        if (creature.parts) {
            creature.parts.forEach(part => {
                const bone = creature.points[part.boneIndex];
                if (!bone) return;

                const prev = creature.points[part.boneIndex - 1] || creature.points[part.boneIndex + 1];
                let spineAngle = 0;
                if (prev) {
                    spineAngle = Math.atan2(bone.y - prev.y, bone.x - prev.x);
                    if (part.boneIndex === 0) spineAngle += Math.PI;
                }

                // Initialize IK for Tentacles if missing
                if (part.type === 'Tentacle' && !part.ik) {
                    part.ik = IKSystem.createTentacle(8, 10);
                }

                this.drawPart(part, bone.x, bone.y, spineAngle, bone.radius, color);
            });
        }

        // Reset composite before drawing eyes (eyes should be solid)
        this.ctx.globalCompositeOperation = 'source-over';

        // Draw Eyes (Head)
        const head = points[0];
        const scale = head.radius / (head.baseRadius || 20);

        this.ctx.save();
        this.ctx.translate(head.x, head.y);
        this.ctx.rotate(headAngle);
        this.ctx.scale(scale, scale);

        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(10, -8, 6, 0, Math.PI*2);
        this.ctx.arc(10, 8, 6, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(13, -8, 3, 0, Math.PI*2);
        this.ctx.arc(13, 8, 3, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.restore();
    }

    drawPart(part, x, y, spineAngle, radius, bodyColor) {
        const type = part.type;
        const side = part.side;

        // Special handling for Tentacles (World Space Drawing via IK)
        if (type === 'Tentacle' && part.ik) {
            // Calculate Attachment Point
            let sideAngle = 0;
            if (side === 1) sideAngle = Math.PI/2;
            else if (side === -1) sideAngle = -Math.PI/2;

            const attachAngle = spineAngle + sideAngle;
            const rootX = x + Math.cos(attachAngle) * radius;
            const rootY = y + Math.sin(attachAngle) * radius;

            // Update IK
            IKSystem.update(part.ik, rootX, rootY, attachAngle, 0.016);

            // Draw
            this.ctx.save(); // Just in case, though IK draws world space
            this.ctx.strokeStyle = '#a0f';
            this.ctx.lineWidth = Math.max(2, radius * 0.3);
            if (this.settings.fxEnabled) {
                this.ctx.shadowColor = '#a0f';
                this.ctx.shadowBlur = 10;
            }

            this.ctx.beginPath();
            const segs = part.ik.segments;
            this.ctx.moveTo(segs[0].x, segs[0].y);
            for(let i=1; i<segs.length; i++) {
                this.ctx.lineTo(segs[i].x, segs[i].y);
            }
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;

            // Bulb
            const tip = segs[segs.length-1];
            this.ctx.fillStyle = '#d0f';
            this.ctx.beginPath();
            this.ctx.arc(tip.x, tip.y, radius * 0.2, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.restore();
            return;
        }

        // Standard Parts (Relative Drawing)
        this.ctx.save();
        this.ctx.translate(x, y);

        let sideAngle = 0;
        if (side === 1) sideAngle = Math.PI/2;
        else if (side === -1) sideAngle = -Math.PI/2;

        this.ctx.rotate(spineAngle + sideAngle);

        const wobble = Math.sin(Date.now() * 0.005) * 0.1;
        this.ctx.rotate(wobble);

        this.ctx.translate(radius, 0);

        // Scale Part based on Bone Radius (Base Radius is approx 20)
        const scale = Math.max(0.5, radius / 20);
        this.ctx.scale(scale, scale);

        if (type === 'Fin') {
            this.ctx.fillStyle = bodyColor;
            if (this.settings.fxEnabled) {
                this.ctx.shadowColor = bodyColor;
                this.ctx.shadowBlur = 20;
            }
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.quadraticCurveTo(15, -15, 40, 0);
            this.ctx.quadraticCurveTo(15, 15, 0, 0);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        } else if (type === 'Spike') {
            this.ctx.fillStyle = '#ff0044';
            if (this.settings.fxEnabled) {
                this.ctx.shadowColor = '#f04';
                this.ctx.shadowBlur = 15;
            }
            this.ctx.beginPath();
            this.ctx.moveTo(0, -8);
            this.ctx.lineTo(35, 0);
            this.ctx.lineTo(0, 8);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        } else if (type === 'Jaws') {
            this.ctx.fillStyle = '#eee';
            this.ctx.beginPath();
            this.ctx.moveTo(0, -10); this.ctx.lineTo(25, -5); this.ctx.lineTo(0, 0);
            this.ctx.moveTo(0, 10); this.ctx.lineTo(25, 5); this.ctx.lineTo(0, 0);
            this.ctx.fill();
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.moveTo(10, -5); this.ctx.lineTo(15, -2); this.ctx.lineTo(20, -5);
            this.ctx.moveTo(10, 5); this.ctx.lineTo(15, 2); this.ctx.lineTo(20, 5);
            this.ctx.fill();
        } else if (type === 'Eye') {
            this.ctx.rotate(side === 1 ? -Math.PI/2 : Math.PI/2);
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(12, 0, 6, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.fillStyle = 'black';
            this.ctx.beginPath();
            this.ctx.arc(14, 0, 2, 0, Math.PI*2);
            this.ctx.fill();
        } else if (type === 'Shield') {
            this.ctx.fillStyle = '#444';
            this.ctx.strokeStyle = '#888';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 20, -Math.PI/2, Math.PI/2);
            this.ctx.lineTo(0, 0);
            this.ctx.fill();
            this.ctx.stroke();
        } else if (type === 'Booster') {
            this.ctx.fillStyle = '#555';
            this.ctx.beginPath();
            this.ctx.moveTo(0, -5);
            this.ctx.lineTo(15, -8);
            this.ctx.lineTo(15, 8);
            this.ctx.lineTo(0, 5);
            this.ctx.fill();
            if (Math.random() > 0.5) {
                this.ctx.fillStyle = '#fa0';
                this.ctx.beginPath();
                this.ctx.moveTo(15, -5);
                this.ctx.lineTo(25 + Math.random()*10, 0);
                this.ctx.lineTo(15, 5);
                this.ctx.fill();
            }
        } else if (type === 'Poison') {
            this.ctx.fillStyle = '#0f0';
            if (this.settings.fxEnabled) {
                this.ctx.shadowColor = '#0f0';
                this.ctx.shadowBlur = 15;
            }
            this.ctx.beginPath();
            this.ctx.arc(10, 0, 8, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
            this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
            this.ctx.beginPath();
            this.ctx.arc(12 - Math.random()*4, -2 + Math.random()*4, 2, 0, Math.PI*2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }
}
