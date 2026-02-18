export default class MenuState {
    constructor(game) {
        this.game = game;
        this.menuUI = document.getElementById('main-menu');
        this.settingsUI = document.getElementById('settings-menu');
    }

    enter() {
        if(this.menuUI) this.menuUI.style.display = 'flex';
        this.game.resetCreature();

        this.game.camera.zoom = 1.0;
        this.game.camera.x = 0;
        this.game.camera.y = 0;
    }

    exit() {
        if(this.menuUI) this.menuUI.style.display = 'none';
        if(this.settingsUI) this.settingsUI.style.display = 'none';
    }

    update(dt) {
        // Use new Background system
        this.game.background.update(dt, this.game.camera);
    }

    render(ctx) {
        // Use new Background system
        this.game.background.render(ctx, '#001020'); // Default Deep Blue
    }
}
