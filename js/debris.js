export default class Debris {
    constructor(points, constraints, color, life = 5) {
        this.points = points;
        this.constraints = constraints;
        this.color = color;
        this.life = life;
        this.active = true;

        // Tearing: Remove random constraints to simulate destruction
        if (this.constraints.length > 2) {
            const removeCount = Math.ceil(this.constraints.length * 0.4);
            for(let i=0; i<removeCount; i++) {
                const idx = Math.floor(Math.random() * this.constraints.length);
                this.constraints.splice(idx, 1);
            }
        }

        // Explosion Impulse
        const center = this.getCenter();
        this.points.forEach(p => {
             const dx = p.x - center.x;
             const dy = p.y - center.y;
             const dist = Math.hypot(dx, dy) || 1;
             const force = 100 * Math.random();
             p.oldx -= (dx/dist) * force * 0.016; // Impulse
             p.oldy -= (dy/dist) * force * 0.016;
        });
    }

    getCenter() {
        let x=0, y=0;
        this.points.forEach(p => { x+=p.x; y+=p.y; });
        return { x: x/this.points.length, y: y/this.points.length };
    }

    update(dt, physics) {
        physics.update(this.points, this.constraints, dt);
        this.life -= dt;
        if (this.life <= 0) this.active = false;

        // Fade out shrinking
        if (this.life < 2) {
             this.constraints.forEach(c => c.length *= 0.99);
             this.points.forEach(p => p.radius *= 0.99);
        }
    }

    render(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.globalAlpha = Math.min(1, this.life * 0.5); // Start semi-transparent

        // Render blobs around constraints
        ctx.strokeStyle = this.color;
        ctx.lineCap = 'round';

        this.constraints.forEach(c => {
            ctx.lineWidth = (c.p1.radius + c.p2.radius) * 0.8;
            ctx.beginPath();
            ctx.moveTo(c.p1.x, c.p1.y);
            ctx.lineTo(c.p2.x, c.p2.y);
            ctx.stroke();
        });

        ctx.restore();
    }
}
