export default class Enemy {
    constructor(x, y, type, physics) {
        this.type = type; // 'grazer', 'hunter', 'titan'
        this.physics = physics;
        this.active = true;

        // Stats
        this.radius = type === 'titan' ? 100 : (type === 'hunter' ? 30 : 15);
        this.speed = type === 'hunter' ? 800 : 300;
        this.color = type === 'hunter' ? '#ff4444' : (type === 'titan' ? '#441111' : '#00ff44');

        // Soft Body
        this.points = [];
        this.constraints = [];
        this.createBody(x, y);

        // AI State
        this.state = 'wander'; // wander, chase, flee
        this.targetX = x;
        this.targetY = y;
        this.stateTimer = 0;
    }

    createBody(x, y) {
        // Simple 3-segment spine for small, 5 for large
        const segs = this.type === 'titan' ? 8 : 3;
        const rad = this.radius;

        for (let i = 0; i < segs; i++) {
            const p = this.physics.constructor.createPoint(x, y + i * rad, rad * (1 - i*0.1), 1);
            this.points.push(p);

            if (i > 0) {
                const prev = this.points[i-1];
                const link = this.physics.constructor.createConstraint(prev, p, 0.5, rad);
                this.constraints.push(link);
            }
        }
    }

    update(dt, playerHead) {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
            this.pickState(playerHead);
        }

        // Steering
        let head = this.points[0];
        let dx = 0, dy = 0;

        if (this.state === 'chase') {
            dx = playerHead.x - head.x;
            dy = playerHead.y - head.y;
        } else if (this.state === 'flee') {
            dx = head.x - playerHead.x;
            dy = head.y - playerHead.y;
        } else {
            dx = this.targetX - head.x;
            dy = this.targetY - head.y;
            if (Math.hypot(dx, dy) < 50) this.pickState(playerHead);
        }

        // Normalize & Apply
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
            head.x += (dx / dist) * this.speed * dt * dt;
            head.y += (dy / dist) * this.speed * dt * dt;
        }

        // Physics
        this.physics.update(this.points, this.constraints, dt);
    }

    pickState(playerHead) {
        this.stateTimer = Math.random() * 3 + 1;
        const dist = Math.hypot(playerHead.x - this.points[0].x, playerHead.y - this.points[0].y);

        if (this.type === 'hunter') {
            if (dist < 400) this.state = 'chase';
            else {
                this.state = 'wander';
                this.targetX = this.points[0].x + (Math.random()-0.5) * 500;
                this.targetY = this.points[0].y + (Math.random()-0.5) * 500;
            }
        } else if (this.type === 'grazer') {
            if (dist < 200) this.state = 'flee';
            else {
                this.state = 'wander';
                this.targetX = this.points[0].x + (Math.random()-0.5) * 300;
                this.targetY = this.points[0].y + (Math.random()-0.5) * 300;
            }
        }
    }

    render(ctx) {
        if (!this.active) return;

        // Draw Skin
        for (let i = this.points.length - 1; i >= 0; i--) {
            const p = this.points[i];

            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2);
            ctx.fill();

            // Glow
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }
    }
}
