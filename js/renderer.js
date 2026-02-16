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
        const color = creature.color || '#00ffff';

        for (let i = points.length - 1; i >= 0; i--) {
            const p = points[i];

            // Glow
            const grad = this.ctx.createRadialGradient(p.x, p.y, p.radius * 0.2, p.x, p.y, p.radius * 2.5);
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

                this.drawPart(part.type, bone.x, bone.y, spineAngle, part.side, bone.radius, color);
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

    drawPart(type, x, y, spineAngle, side, radius, bodyColor) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(spineAngle + (side === 1 ? Math.PI/2 : -Math.PI/2));

        const wobble = Math.sin(Date.now() * 0.005) * 0.1;
        this.ctx.rotate(wobble);

        this.ctx.translate(radius, 0);

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
        } else if (type === 'Eye') {
             // Eyes drawn in main loop
        }

        this.ctx.restore();
    }
}
