import Phaser from 'phaser';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        console.log('MenuScene: Creating main menu...');
        this.add.text(this.cameras.main.centerX, this.cameras.main.centerY - 50, 'JELLY EVOLUTION', {
            fontSize: '48px',
            fontFamily: 'Arial',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        const startText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + 50, 'Tap to Start', {
            fontSize: '24px',
            fontFamily: 'Arial',
            fill: '#aaaaaa',
            align: 'center'
        }).setOrigin(0.5);

        // Simple blink animation
        this.tweens.add({
            targets: startText,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            yoyo: true,
            loop: -1
        });

        // Start game on any pointer down
        this.input.on('pointerdown', () => {
            console.log('MenuScene: Starting GameScene...');
            this.scene.start('GameScene');
        });
    }
}
