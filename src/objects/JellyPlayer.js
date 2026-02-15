import Phaser from 'phaser';

export default class JellyPlayer {
    constructor(scene, x, y, options = {}) {
        this.scene = scene;
        this.x = x;
        this.y = y;

        // Configuration
        this.sides = options.sides || 12; // Reduce from 16 to 12 for performance
        this.baseRadius = options.radius || 40;
        this.radius = this.baseRadius;
        this.currentScale = 1.0;

        this.color = options.color || 0x00ff00;
        this.stiffness = options.stiffness || 0.05;

        // Visuals
        this.graphics = this.scene.add.graphics();

        // Physics Objects
        this.centralBody = null;
        this.outerBodies = [];
        this.composite = null;

        this.createBody();
    }

    createBody() {
        const { Bodies, Body, Composite, Constraint } = Phaser.Physics.Matter.Matter;

        // 1. Central Core
        this.centralBody = Bodies.circle(this.x, this.y, this.radius * 0.4, {
            density: 0.005,
            frictionAir: 0.1,
            label: 'JellyCore'
        });
        this.centralBody.gameObject = this; // Link for collision

        // 2. Outer Skin
        this.outerBodies = [];
        const angleStep = (Math.PI * 2) / this.sides;

        for (let i = 0; i < this.sides; i++) {
            const angle = i * angleStep;
            const px = this.x + Math.cos(angle) * this.radius;
            const py = this.y + Math.sin(angle) * this.radius;

            const particle = Bodies.circle(px, py, 4, {
                density: 0.001,
                frictionAir: 0.1,
                restitution: 0.5,
                label: 'JellySkin'
            });
            particle.gameObject = this; // Link for collision
            this.outerBodies.push(particle);
        }

        // 3. Constraints (Center -> Outer)
        const constraints = [];
        for (let i = 0; i < this.sides; i++) {
            const constraint = Constraint.create({
                bodyA: this.centralBody,
                bodyB: this.outerBodies[i],
                stiffness: this.stiffness,
                damping: 0.1,
                length: this.radius
            });
            constraints.push(constraint);
        }

        // 4. Constraints (Outer -> Outer)
        for (let i = 0; i < this.sides; i++) {
            const nextIndex = (i + 1) % this.sides;
            const dist = Phaser.Math.Distance.Between(
                this.outerBodies[i].position.x, this.outerBodies[i].position.y,
                this.outerBodies[nextIndex].position.x, this.outerBodies[nextIndex].position.y
            );

            const constraint = Constraint.create({
                bodyA: this.outerBodies[i],
                bodyB: this.outerBodies[nextIndex],
                stiffness: this.stiffness * 4, // Stiffer skin
                damping: 0.1,
                length: dist
            });
            constraints.push(constraint);
        }

        // 5. Composite
        this.composite = Composite.create({
            bodies: [this.centralBody, ...this.outerBodies],
            constraints: constraints,
            label: 'JellyPlayer'
        });

        this.scene.matter.world.add(this.composite);
    }

    applyForce(force) {
        // Apply force to the central body
        const forceMagnitude = 1.5 * this.currentScale; // More force for bigger body

        this.scene.matter.body.applyForce(this.centralBody, this.centralBody.position, {
            x: force.x * forceMagnitude,
            y: force.y * forceMagnitude
        });
    }

    eat(value) {
        // Growth Logic
        const growthAmount = 0.05 * value; // Small growth per food
        const oldScale = this.currentScale;
        this.currentScale += growthAmount;

        // Calculate Scale Ratio
        const scaleRatio = this.currentScale / oldScale;

        // Update Radius
        this.radius = this.baseRadius * this.currentScale;

        // Scale Bodies (Particles)
        const { Body } = Phaser.Physics.Matter.Matter;
        Body.scale(this.centralBody, scaleRatio, scaleRatio);
        this.outerBodies.forEach(b => Body.scale(b, scaleRatio, scaleRatio));

        // Update Constraints (Lengths)
        const constraints = this.composite.constraints;

        // Center -> Outer (Spokes)
        for (let i = 0; i < this.sides; i++) {
            constraints[i].length = this.radius;
        }

        // Outer -> Outer (Perimeter)
        const angleStep = (Math.PI * 2) / this.sides;
        const newPerimeterDist = 2 * this.radius * Math.sin(angleStep / 2);

        for (let i = this.sides; i < this.sides * 2; i++) {
            constraints[i].length = newPerimeterDist;
        }

        console.log(`Jelly grew! New Scale: ${this.currentScale.toFixed(2)}`);
    }

    update() {
        this.draw();
    }

    draw() {
        this.graphics.clear();

        this.graphics.fillStyle(this.color, 0.6);
        this.graphics.lineStyle(2 * this.currentScale, 0xffffff, 0.8);

        this.graphics.beginPath();

        if (this.outerBodies.length > 0) {
            const points = this.outerBodies.map(b => b.position);
            this.graphics.moveTo(points[0].x, points[0].y);

            // Connect points
            for (let i = 1; i < points.length; i++) {
                this.graphics.lineTo(points[i].x, points[i].y);
            }
            this.graphics.lineTo(points[0].x, points[0].y); // Close loop
        }

        this.graphics.closePath();
        this.graphics.fillPath();
        this.graphics.strokePath();

        // Draw Eyes (simple relative to center)
        const cx = this.centralBody.position.x;
        const cy = this.centralBody.position.y;

        const eyeOffset = 12 * this.currentScale;
        const eyeSize = 8 * this.currentScale;

        this.graphics.fillStyle(0xffffff, 1);
        this.graphics.fillCircle(cx - eyeOffset, cy - (5 * this.currentScale), eyeSize);
        this.graphics.fillCircle(cx + eyeOffset, cy - (5 * this.currentScale), eyeSize);

        this.graphics.fillStyle(0x000000, 1);
        this.graphics.fillCircle(cx - eyeOffset, cy - (5 * this.currentScale), eyeSize * 0.4);
        this.graphics.fillCircle(cx + eyeOffset, cy - (5 * this.currentScale), eyeSize * 0.4);
    }

    destroy() {
        this.scene.matter.world.remove(this.composite);
        this.graphics.destroy();
    }
}
