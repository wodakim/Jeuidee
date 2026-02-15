import Phaser from 'phaser';
import JellyPlayer from '../objects/JellyPlayer';
import Food from '../objects/Food';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        // Physics Setup
        // No bounds for infinite world

        // Background Grid (Huge for now)
        this.add.grid(0, 0, 40000, 40000, 100, 100, 0x222222).setAltFillStyle(0x1a1a1a).setOutlineStyle(0x333333);

        // Player
        this.player = new JellyPlayer(this, 0, 0, {
            color: 0x00ff00,
            radius: 40,
            sides: 12,
            stiffness: 0.1
        });

        // Food Management
        this.foods = [];
        this.lastCleanupTime = 0;

        // Initial Population
        for (let i = 0; i < 40; i++) {
            this.spawnFoodAround(0, 0, 1000);
        }

        // Collision Handling
        this.matter.world.on('collisionstart', (event) => {
            event.pairs.forEach(pair => {
                const bodyA = pair.bodyA;
                const bodyB = pair.bodyB;

                let food = null;
                if (bodyA.label === 'Food') food = bodyA.gameObject;
                else if (bodyB.label === 'Food') food = bodyB.gameObject;

                if (food) {
                    const otherBody = (bodyA === food.body) ? bodyB : bodyA;
                    if (otherBody.label === 'JellyCore' || otherBody.label === 'JellySkin') {
                        this.handleEat(food);
                    }
                }
            });
        });

        // Camera
        this.cameras.main.startFollow(this.player.centralBody, true, 0.1, 0.1);
        this.cameras.main.setZoom(1);

        // Input
        this.setupInput();
    }

    setupInput() {
        this.input.addPointer(1);
        this.isTouching = false;
        this.touchStart = { x: 0, y: 0 };
        this.joystickVector = { x: 0, y: 0 };

        this.joystickBase = this.add.circle(0, 0, 50, 0xffffff, 0.2).setScrollFactor(0).setVisible(false).setDepth(100);
        this.joystickKnob = this.add.circle(0, 0, 20, 0xffffff, 0.5).setScrollFactor(0).setVisible(false).setDepth(100);

        this.input.on('pointerdown', (pointer) => {
            this.isTouching = true;
            this.touchStart.x = pointer.x;
            this.touchStart.y = pointer.y;
            this.joystickVector = { x: 0, y: 0 };

            this.joystickBase.setPosition(pointer.x, pointer.y).setVisible(true);
            this.joystickKnob.setPosition(pointer.x, pointer.y).setVisible(true);
        });

        this.input.on('pointermove', (pointer) => {
            if (this.isTouching) {
                const dx = pointer.x - this.touchStart.x;
                const dy = pointer.y - this.touchStart.y;
                const maxDist = 50;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const angle = Math.atan2(dy, dx);
                const clampedDist = Math.min(dist, maxDist);

                this.joystickVector.x = Math.cos(angle) * clampedDist;
                this.joystickVector.y = Math.sin(angle) * clampedDist;

                this.joystickKnob.setPosition(
                    this.joystickBase.x + this.joystickVector.x,
                    this.joystickBase.y + this.joystickVector.y
                );
            }
        });

        this.input.on('pointerup', () => {
            this.isTouching = false;
            this.joystickVector = { x: 0, y: 0 };
            this.joystickBase.setVisible(false);
            this.joystickKnob.setVisible(false);
        });
    }

    spawnFoodAround(x, y, radius) {
        const angle = Math.random() * Math.PI * 2;
        const dist = radius * (0.5 + Math.random() * 0.5);

        const fx = x + Math.cos(angle) * dist;
        const fy = y + Math.sin(angle) * dist;

        const food = new Food(this, fx, fy, {
            value: 1,
            color: 0xff4444
        });
        this.foods.push(food);
    }

    handleEat(food) {
        if (!food || !food.scene) return;

        const index = this.foods.indexOf(food);
        if (index > -1) {
            this.foods.splice(index, 1);
            this.player.eat(food.value);
            food.destroy();

            const targetZoom = Phaser.Math.Clamp(1.0 / (this.player.currentScale * 0.8), 0.2, 1.5);
            this.cameras.main.zoomTo(targetZoom, 500);
        }
    }

    update(time, delta) {
        if (this.player) {
            this.player.update();

            if (this.isTouching) {
                const forceX = this.joystickVector.x * 0.000005;
                const forceY = this.joystickVector.y * 0.000005;
                this.player.applyForce({ x: forceX, y: forceY });
            }

            // OPTIMIZATION: Run world management only once per second (every 1000ms)
            if (time > this.lastCleanupTime + 1000) {
                this.lastCleanupTime = time;
                this.manageWorld();
            }

            this.foods.forEach(f => f.update());
        }
    }

    manageWorld() {
        const playerPos = this.player.centralBody.position;
        const zoom = this.cameras.main.zoom;
        const activeRadius = (Math.max(this.scale.width, this.scale.height) / zoom) * 1.5;

        // Despawn logic
        for (let i = this.foods.length - 1; i >= 0; i--) {
            const f = this.foods[i];
            const d = Phaser.Math.Distance.Between(playerPos.x, playerPos.y, f.body.position.x, f.body.position.y);

            if (d > activeRadius * 1.5) {
                f.destroy();
                this.foods.splice(i, 1);
            }
        }

        // Respawn logic
        const targetFoodCount = 40;
        if (this.foods.length < targetFoodCount) {
            this.spawnFoodAround(playerPos.x, playerPos.y, activeRadius);
        }
    }
}
