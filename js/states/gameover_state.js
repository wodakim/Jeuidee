export default class GameOverState {
    constructor(game) {
        this.game = game;
        this.ui = document.getElementById('game-over');
    }

    enter() {
        this.ui.style.display = 'flex';
        document.getElementById('game-hud').style.display = 'none';
    }

    exit() {
        this.ui.style.display = 'none';
    }

    update(dt) {
        // Slow motion update or freeze?
        // Let's keep background moving but not physics
        this.game.updateBackgroundOnly(dt);
    }

    render(ctx) {
        // Draw the last frame of the game basically
        // But maybe red tinted
        // For simplicity, just render the PlayState's view but frozen?
        // Or just background.

        // Let's render background + dead creature debris
        const game = this.game;

        // Background
        game.renderBackgroundLayers(ctx); // We need to expose this method in GameLoop

        // Debris
        game.camera.apply(ctx);
        game.debris.forEach(d => d.render(ctx));
        game.camera.restore(ctx);

        // Vignette Red
        ctx.fillStyle = 'rgba(50, 0, 0, 0.5)';
        ctx.fillRect(0, 0, game.width, game.height);
    }
}
