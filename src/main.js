import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import MenuScene from './scenes/MenuScene';
import GameScene from './scenes/GameScene';
import EditorScene from './scenes/EditorScene';

const config = {
    type: Phaser.AUTO, // Will choose WebGL automatically
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#0d1117',
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 0 },
            debug: false,
            // Optimization: Reduce iterations for better performance on mobile
            positionIterations: 4,
            velocityIterations: 2,
            runner: {
                isFixed: true, // Fix timestep for consistency
                fps: 60
            }
        }
    },
    render: {
        antialias: true, // Crisp edges
        pixelArt: false,
        roundPixels: false
    },
    scene: [BootScene, MenuScene, GameScene, EditorScene]
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
