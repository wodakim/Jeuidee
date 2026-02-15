import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        console.log('BootScene: Preloading assets...');
        // Preload any initial assets (images, audio) here if we had them.
        // For now, we are generating visuals procedurally.
    }

    create() {
        console.log('BootScene: Assets loaded, starting MenuScene...');
        this.scene.start('MenuScene');
    }
}
