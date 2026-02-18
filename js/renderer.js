import IKSystem from './ik.js';

export default class Renderer {
    constructor(ctx, camera, settings) {
        this.ctx = ctx;
        this.camera = camera;
        this.settings = settings;
    }

    drawCreature(creature, headAngle = 0) {
        const points = creature.points;
        let color = creature.color || '#00ffff';

        // Health Mod
        const healthPct = creature.gameStats.health / creature.gameStats.maxHealth;
        if (creature.lastDamageTime && Date.now() - creature.lastDamageTime < 200) {
            color = '#ff4444'; // Bright Red flash
        } else if (healthPct < 0.3) {
            const pulse = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
            color = pulse > 0.5 ? '#ff2222' : color;
        }

        // --- ORGANIC MEMBRANE RENDERING ---
        // Instead of drawing individual circles, we draw the whole body as a connected soft shape?
        // Actually, for "Cell" look, overlapping soft circles works well if we handle alpha correctly.
        // We want: Semi-transparent body, bright edge.

        // 1. Draw "Cytoplasm" (Inner Glow)
        // Use 'lighter' for bioluminescence
        if (this.settings.fxEnabled) this.ctx.globalCompositeOperation = 'screen';

        for (let i = points.length - 1; i >= 0; i--) {
            const p = points[i];

            // Soft Gradient Blob
            const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)'); // Core white
            grad.addColorStop(0.4, color); // Mid color
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Fade out

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 2. Draw "Membrane" (Outer Rim)
        // We can draw a connected path around the outer points?
        // For now, let's keep it simple: Draw larger, faint circles behind?
        // Or just the soft gradient is enough for the "Microscope" look.

        // Let's add "Nucleus" to the head
        if (points.length > 0) {
            const head = points[0];
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            this.ctx.beginPath();
            // Irregular Nucleus
            this.ctx.arc(head.x, head.y, head.radius * 0.4, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.globalCompositeOperation = 'source-over';

        // Draw Attached Parts (Organelles)
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

                // Initialize IK for Tentacles
                if (part.type === 'Tentacle' && !part.ik) {
                    part.ik = IKSystem.createTentacle(8, 10);
                }

                this.drawPart(part, bone.x, bone.y, spineAngle, bone.radius, color, headAngle);
            });
        }
    }

    drawPart(part, x, y, spineAngle, radius, bodyColor, headAngle = 0) {
        const type = part.type;

        let drawAngle = spineAngle;
        if (part.angle !== undefined) {
             const offset = part.angle - Math.PI/2;
             drawAngle = spineAngle + offset;
        } else {
             const side = part.side;
             let sideAngle = 0;
             if (side === 1) sideAngle = Math.PI/2;
             else if (side === -1) sideAngle = -Math.PI/2;
             else if (side === 2) sideAngle = Math.PI;
             drawAngle = spineAngle + sideAngle;
        }

        // Tentacles (Flagella)
        if (type === 'Tentacle' && part.ik) {
            const rootX = x + Math.cos(drawAngle) * radius;
            const rootY = y + Math.sin(drawAngle) * radius;
            IKSystem.update(part.ik, rootX, rootY, drawAngle, 0.016);

            this.ctx.save();
            // Organic Tentacle: Tapered width, soft color
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            const segs = part.ik.segments;
            this.ctx.moveTo(segs[0].x, segs[0].y);

            // Draw smooth curve through points
            for(let i=1; i<segs.length - 1; i++) {
                const xc = (segs[i].x + segs[i+1].x) / 2;
                const yc = (segs[i].y + segs[i+1].y) / 2;
                this.ctx.quadraticCurveTo(segs[i].x, segs[i].y, xc, yc);
            }
            this.ctx.stroke();

            // Cilia / Hair on tentacle?
            // Maybe for V2.
            this.ctx.restore();
            return;
        }

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(drawAngle);

        // Wobble for organic feel
        const wobble = Math.sin(Date.now() * 0.003 + x * 0.01) * 0.05;
        this.ctx.rotate(wobble);

        this.ctx.translate(radius * 0.8, 0); // Embed slightly in body
        const scale = Math.max(0.5, radius / 20);
        this.ctx.scale(scale, scale);

        // --- ORGANIC PART DRAWING ---

        if (type === 'Fin') {
            // Fin is now a translucent membrane with "rays"
            this.ctx.fillStyle = 'rgba(100, 255, 255, 0.2)';
            this.ctx.strokeStyle = 'rgba(100, 255, 255, 0.5)';
            this.ctx.lineWidth = 1;

            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.bezierCurveTo(10, -15, 30, -10, 40, 0);
            this.ctx.bezierCurveTo(30, 10, 10, 15, 0, 0);
            this.ctx.fill();
            this.ctx.stroke();

            // Rays
            this.ctx.beginPath();
            this.ctx.moveTo(0,0); this.ctx.lineTo(35, -5);
            this.ctx.moveTo(0,0); this.ctx.lineTo(40, 0);
            this.ctx.moveTo(0,0); this.ctx.lineTo(35, 5);
            this.ctx.stroke();

        } else if (type === 'Spike') {
            // Thorn / Calcified
            const spikeGrad = this.ctx.createLinearGradient(0, 0, 40, 0);
            spikeGrad.addColorStop(0, '#fff');
            spikeGrad.addColorStop(1, 'rgba(255, 200, 200, 0.1)');

            this.ctx.fillStyle = spikeGrad;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -5);
            this.ctx.quadraticCurveTo(10, 0, 40, 0); // Curved point
            this.ctx.quadraticCurveTo(10, 0, 0, 5);
            this.ctx.fill();

        } else if (type === 'Jaws') {
            // Mandibles
            this.ctx.fillStyle = '#ddd';
            // Left Mandible
            this.ctx.beginPath();
            this.ctx.moveTo(0, -8);
            this.ctx.quadraticCurveTo(20, -15, 30, -5); // Curve in
            this.ctx.quadraticCurveTo(15, -5, 0, -2);
            this.ctx.fill();
            // Right Mandible
            this.ctx.beginPath();
            this.ctx.moveTo(0, 8);
            this.ctx.quadraticCurveTo(20, 15, 30, 5);
            this.ctx.quadraticCurveTo(15, 5, 0, 2);
            this.ctx.fill();

        } else if (type === 'Eye') {
            this.ctx.rotate(part.side === 1 ? -Math.PI/2 : Math.PI/2);

            // Sclera
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(12, 0, 8, 0, Math.PI*2);
            this.ctx.fill();

            // Iris
            this.ctx.fillStyle = bodyColor;
            this.ctx.beginPath();
            this.ctx.arc(14, 0, 5, 0, Math.PI*2);
            this.ctx.fill();

            // Pupil
            this.ctx.fillStyle = '#000';
            this.ctx.beginPath();
            this.ctx.arc(15, 0, 2.5, 0, Math.PI*2);
            this.ctx.fill();

            // Highlight
            this.ctx.fillStyle = 'rgba(255,255,255,0.8)';
            this.ctx.beginPath();
            this.ctx.arc(13, -2, 2, 0, Math.PI*2);
            this.ctx.fill();

        } else if (type === 'Booster') {
            // Siphon Jet
            this.ctx.fillStyle = '#88a';
            this.ctx.beginPath();
            this.ctx.ellipse(10, 0, 10, 6, 0, 0, Math.PI*2);
            this.ctx.fill();

            // Hole
            this.ctx.fillStyle = '#000';
            this.ctx.beginPath();
            this.ctx.arc(20, 0, 3, 0, Math.PI*2);
            this.ctx.fill();

            // Particles if boosting (can't check state easily here, assume random sputter)
            if (Math.random() > 0.7) {
                this.ctx.fillStyle = 'rgba(200, 255, 255, 0.5)';
                this.ctx.beginPath();
                this.ctx.arc(25 + Math.random()*10, (Math.random()-0.5)*5, 2, 0, Math.PI*2);
                this.ctx.fill();
            }
        } else if (type === 'Poison') {
             // Bubbling Sac
             this.ctx.fillStyle = 'rgba(50, 255, 50, 0.6)';
             this.ctx.beginPath();
             this.ctx.arc(10, 0, 8, 0, Math.PI*2);
             this.ctx.fill();

             // Internal bubbles
             this.ctx.fillStyle = 'rgba(200, 255, 200, 0.8)';
             this.ctx.beginPath();
             this.ctx.arc(10 + Math.sin(Date.now()*0.005)*3, Math.cos(Date.now()*0.005)*3, 3, 0, Math.PI*2);
             this.ctx.fill();
        }

        this.ctx.restore();
    }
}
