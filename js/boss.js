import Enemy from './enemy.js';
import Physics from './physics.js';

export default class Boss extends Enemy {
    constructor(x, y, type, physics, game) {
        super(x, y, 20, physics, 'boss'); // Init as generic enemy first
        this.game = game;
        this.bossType = type;

        // Wipe the generic body created by super()
        this.points = [];
        this.constraints = [];
        this.parts = [];

        this.setupBoss();

        // Recalculate stats based on new body
        this.stats.calculate(this.parts);
        this.health = 2000;
        this.maxHealth = 2000;

        this.phase = 0;
        this.timer = 0;
        this.scale = 3.0; // Visual scale
    }

    setupBoss() {
        if (this.bossType === 'Leviathan') {
            const segs = 40;
            const startRad = 60;

            // Create Serpentine Body
            let prev = null;
            for (let i = 0; i < segs; i++) {
                const r = startRad * (1 - i / segs);
                // Create points at current position
                const p = Physics.createPoint(this.targetX, this.targetY + i * 40, r, 50);
                p.baseRadius = r;
                this.points.push(p);

                if (prev) {
                    const c = Physics.createConstraint(prev, p, 0.9, 40);
                    c.baseLength = 40;
                    this.constraints.push(c);
                }
                prev = p;
            }

            // Spikes on back
            for(let i=0; i<segs; i+=3) {
                this.parts.push({ type: 'Spike', boneIndex: i, side: 1 });
                this.parts.push({ type: 'Spike', boneIndex: i, side: -1 });
            }
            // Eyes
            this.parts.push({ type: 'Eye', boneIndex: 0, side: 1 });
            this.parts.push({ type: 'Eye', boneIndex: 0, side: -1 });

            this.stats.speed = 800;
            this.stats.turnSpeed = 1.5;
            this.stats.damage = 100;
        }
    }

    update(dt, playerHead) {
        this.timer -= dt;

        const head = this.points[0];

        // Phase Logic
        if (this.health < this.maxHealth * 0.5 && this.phase === 0) {
            this.phase = 1;
            this.color = '#ff4400';
            this.game.distortion.addShockwave(head.x, head.y);
            // Spawn Minions
            for(let i=0; i<5; i++) {
                const minion = new Enemy(head.x + (Math.random()-0.5)*500, head.y + (Math.random()-0.5)*500, 5, this.game.physics, 'hunter');
                this.game.enemies.push(minion);
            }
        }

        // AI State Machine
        if (this.timer <= 0) {
            this.pickMove(playerHead);
        }

        // Execute Move
        if (this.state === 'charge') {
            const angle = Math.atan2(this.targetY - head.y, this.targetX - head.x);
            // Charge speed
            head.vx += Math.cos(angle) * 3000 * dt;
            head.vy += Math.sin(angle) * 3000 * dt;

            if (Math.hypot(this.targetX - head.x, this.targetY - head.y) < 200) {
                this.state = 'cooldown';
                this.timer = 2.0;
            }
        } else if (this.state === 'chase') {
             const targetAngle = Math.atan2(playerHead.y - head.y, playerHead.x - head.x);
             const force = this.stats.speed * dt;
             head.vx += Math.cos(targetAngle) * force;
             head.vy += Math.sin(targetAngle) * force;
        } else if (this.state === 'wander') {
             // Idle movement
             const angle = Math.atan2(this.targetY - head.y, this.targetX - head.x);
             head.vx += Math.cos(angle) * 200 * dt;
             head.vy += Math.sin(angle) * 200 * dt;
        }

        this.physics.update(this.points, this.constraints, dt);
    }

    pickMove(playerHead) {
        const rand = Math.random();
        const dist = Math.hypot(playerHead.x - this.points[0].x, playerHead.y - this.points[0].y);

        if (dist < 1000 && rand < 0.6) {
            // Charge Attack
            this.state = 'charge';
            const head = this.points[0];
            const angle = Math.atan2(playerHead.y - head.y, playerHead.x - head.x);
            const chargeDist = 1500;
            this.targetX = head.x + Math.cos(angle) * chargeDist;
            this.targetY = head.y + Math.sin(angle) * chargeDist;
            this.timer = 3.0;
            // Telegraph
            this.game.distortion.addShockwave(head.x, head.y);
        } else if (rand < 0.9) {
            this.state = 'chase';
            this.timer = 4.0;
        } else {
            this.state = 'wander';
            this.targetX = this.points[0].x + (Math.random()-0.5) * 1000;
            this.targetY = this.points[0].y + (Math.random()-0.5) * 1000;
            this.timer = 2.0;
        }
    }
}
