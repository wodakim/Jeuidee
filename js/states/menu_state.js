export default class MenuState {
    constructor(game) {
        this.game = game;
        this.menuUI = document.getElementById('main-menu');
        this.settingsUI = document.getElementById('settings-menu');
    }

    enter() {
        this.menuUI.style.display = 'flex';
        this.game.resetCreature(); // Reset for background visual

        // Initial setup for background if needed
        this.game.camera.zoom = 1.0;
        this.game.camera.x = 0;
        this.game.camera.y = 0;
    }

    exit() {
        this.menuUI.style.display = 'none';
        this.settingsUI.style.display = 'none';
    }

    update(dt) {
        // Just update background elements for visual flair
        this.game.updateBackgroundOnly(dt);

        // Maybe slowly rotate camera or drift
        this.game.bgRays.angle += dt * 0.05;
    }

    render(ctx) {
        // Draw background
        const head = this.game.creature.points[0];
        const biome = this.game.biomeManager.getCurrentBiome(0, 0);

        // Clear
        const bgGrad = ctx.createLinearGradient(0, 0, 0, this.game.height);
        bgGrad.addColorStop(0, '#000000');
        bgGrad.addColorStop(1, biome.color);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.game.width, this.game.height);

        // Draw Ambient Layers
        this.game.renderBackgroundLayers(ctx);

        // Vignette
        this.game.lighting.render(ctx);
    }
}
