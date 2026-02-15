import Phaser from 'phaser';

export default class Food {
    constructor(scene, x, y, options = {}) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.radius = options.radius || 10;
        this.value = options.value || 1;
        this.color = options.color || 0xff4444;

        // Physics Body
        this.body = this.scene.matter.add.circle(this.x, this.y, this.radius, {
            isSensor: true,
            label: 'Food',
            frictionAir: 0.1
        });

        this.body.gameObject = this;

        // Visuals
        this.graphics = this.scene.add.graphics();
        this.draw();

        // Float Tween
        this.floatTween = this.scene.tweens.add({
            targets: this.body.position,
            y: this.y + 10,
            duration: 2000 + Math.random() * 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    draw() {
        this.graphics.clear();
        this.graphics.fillStyle(this.color, 1);
        this.graphics.fillCircle(0, 0, this.radius);
        this.graphics.lineStyle(2, 0xffffff, 0.5);
        this.graphics.strokeCircle(0, 0, this.radius);
    }

    update() {
        if (this.body && this.graphics) {
            this.graphics.setPosition(this.body.position.x, this.body.position.y);
        }
    }

    destroy() {
        if (this.floatTween) this.floatTween.stop();
        if (this.body) this.scene.matter.world.remove(this.body);
        if (this.graphics) this.graphics.destroy();
    }
}
