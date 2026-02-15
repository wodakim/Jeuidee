import Phaser from 'phaser';

export default class EditorScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EditorScene' });
    }

    create() {
        console.log('EditorScene: Under construction');
        // Placeholder for future implementation
        this.add.text(100, 100, 'Editor Scene', { fill: '#fff' });
    }
}
