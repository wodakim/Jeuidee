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
            isSensor: true, // Non-blocking collision
            label: 'Food',
            frictionAir: 0.1
        });

        this.body.gameObject = this;

        // Optimization: Use Image (Texture) instead of Graphics if possible
        // But since we generate procedurally, we stick to graphics for now but static.
        // We will NOT redraw in update().

        this.graphics = this.scene.add.graphics();
        this.draw();

        // Optimization: Reduce tween overhead?
        // Maybe group them or use a simpler update logic?
        // For now, tweens are okay, but let's reduce the count if we have 100 food items.
        // Let's only tween if near player? No, simpler to just tween.
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
        // Optimization: Only update graphics position
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
