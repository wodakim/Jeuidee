export default class Renderer {
    constructor(ctx, camera) {
        this.ctx = ctx;
        this.camera = camera;
    }

    drawCreature(creature, headAngle = 0) {
        // Draw Skin (Metaballs/Circles)
        const points = creature.points;
        for (let i = points.length - 1; i >= 0; i--) {
            const p = points[i];

            // Glow
            const grad = this.ctx.createRadialGradient(p.x, p.y, p.radius * 0.2, p.x, p.y, p.radius * 2);
            grad.addColorStop(0, '#aaffff');
            grad.addColorStop(1, 'rgba(0, 255, 255, 0)');

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
            this.ctx.fill();

            // Core
            this.ctx.fillStyle = '#00ffff';
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius * 0.8, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw Attached Parts
        // Iterate parts and attach to bone index
        if (creature.parts) {
            creature.parts.forEach(part => {
                const bone = creature.points[part.boneIndex];
                if (!bone) return;

                // Calculate Angle:
                // Use previous bone to determine spine direction
                const prev = creature.points[part.boneIndex - 1] || creature.points[part.boneIndex + 1]; // Fallback for head
                let spineAngle = 0;
                if (prev) {
                    spineAngle = Math.atan2(bone.y - prev.y, bone.x - prev.x);
                    if (part.boneIndex === 0) spineAngle += Math.PI; // Adjust for head direction
                }

                // Render Part
                this.drawPart(part.type, bone.x, bone.y, spineAngle, part.side, bone.radius);
            });
        }

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

    drawPart(type, x, y, spineAngle, side, radius) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(spineAngle + (side === 1 ? Math.PI/2 : -Math.PI/2));

        // Wobble Animation (Time based?)
        // Ideally passed in or using Date.now()
        const wobble = Math.sin(Date.now() * 0.01) * 0.2;
        this.ctx.rotate(wobble);

        // Offset from center to surface
        this.ctx.translate(radius, 0);

        if (type === 'Fin') {
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
            this.ctx.shadowColor = '#0ff';
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.quadraticCurveTo(15, -10, 30, 0);
            this.ctx.quadraticCurveTo(15, 10, 0, 0);
            this.ctx.fill();
        } else if (type === 'Spike') {
            this.ctx.fillStyle = '#ff0044';
            this.ctx.shadowColor = '#f04';
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -5);
            this.ctx.lineTo(25, 0);
            this.ctx.lineTo(0, 5);
            this.ctx.fill();
        } else if (type === 'Eye') {
            this.ctx.rotate(side === 1 ? -Math.PI/2 : Math.PI/2); // Look outward
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(10, 0, 8, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.fillStyle = 'black';
            this.ctx.beginPath();
            this.ctx.arc(12, 0, 3, 0, Math.PI*2); // Pupil
            this.ctx.fill();
        }

        this.ctx.restore();
    }
}
