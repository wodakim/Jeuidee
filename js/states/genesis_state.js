import Physics from '../physics.js';

export default class GenesisState {
    constructor(game) {
        this.game = game;
        this.ui = document.createElement('div');
        this.ui.id = 'genesis-ui';
        this.ui.style = `position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); display:none; flex-direction:column; justify-content:center; align-items:center; z-index:200; font-family:Orbitron;`;

        this.ui.innerHTML = `
            <h1 style="color:#fff; text-shadow:0 0 10px #0ff; margin-bottom:50px;">CHOOSE YOUR PATH</h1>
            <div style="display:flex; gap:50px;">
                <div id="choice-herb" style="width:200px; height:300px; border:2px solid #0f0; background:rgba(0,50,0,0.5); display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; border-radius:10px; transition:0.3s;">
                    <div style="font-size:4rem; color:#0f0;">🌿</div>
                    <h2 style="color:#0f0;">HERBIVORE</h2>
                    <p style="color:#aaa; font-size:0.8rem; text-align:center; padding:10px;">Filter Feeder.<br>Eats Plants.<br>Peaceful Growth.</p>
                </div>
                <div id="choice-carn" style="width:200px; height:300px; border:2px solid #f00; background:rgba(50,0,0,0.5); display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; border-radius:10px; transition:0.3s;">
                    <div style="font-size:4rem; color:#f00;">☠️</div>
                    <h2 style="color:#f00;">CARNIVORE</h2>
                    <p style="color:#aaa; font-size:0.8rem; text-align:center; padding:10px;">Predator.<br>Eats Meat.<br>Hunt to Survive.</p>
                </div>
            </div>
        `;
        document.body.appendChild(this.ui);

        document.getElementById('choice-herb').onclick = () => this.select('herbivore');
        document.getElementById('choice-carn').onclick = () => this.select('carnivore');
    }

    enter() {
        this.ui.style.display = 'flex';
        // Reset Camera
        this.game.camera.x = 0;
        this.game.camera.y = 0;
        this.game.camera.zoom = 1.0;
    }

    exit() {
        this.ui.style.display = 'none';
    }

    select(type) {
        // Configure Player
        this.game.resetCreature(); // Basic spine
        const creature = this.game.creature;

        // Remove default parts if any (resetCreature doesn't add parts usually, but check)
        creature.parts = [];

        if (type === 'herbivore') {
            creature.color = '#00ff00';
            creature.parts.push({ type: 'FilterMouth', boneIndex: 0, side: 0 });
            creature.parts.push({ type: 'Fin', boneIndex: 1, side: 1 });
            creature.parts.push({ type: 'Fin', boneIndex: 1, side: -1 });
        } else {
            creature.color = '#ff0044';
            creature.parts.push({ type: 'Jaws', boneIndex: 0, side: 0 });
            creature.parts.push({ type: 'Spike', boneIndex: 0, side: 0 }); // Extra weapon
            creature.parts.push({ type: 'Fin', boneIndex: 2, side: 1 });
            creature.parts.push({ type: 'Fin', boneIndex: 2, side: -1 });
        }

        creature.stats.calculate(creature.parts);

        // Transition
        if(this.game.settings.audioEnabled) this.game.audio.playTone(400, 'sine', 0.5);
        this.game.stateMachine.change('playing', { load: false }); // Do NOT load save, start fresh
    }

    update(dt) {
        this.game.updateBackgroundOnly(dt);
    }

    render(ctx) {
        // Just render background
        this.game.renderBackgroundLayers(ctx);
        this.game.lighting.render(ctx);
    }
}
