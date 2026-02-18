export default class BrainState {
    constructor(game) {
        this.game = game;
        this.perks = [
            { id: 'speed', name: 'Rapid Mitosis', desc: '+20% Speed', stat: 'speed', val: 0.2 },
            { id: 'damage', name: 'Toxic Spikes', desc: '+20% Damage', stat: 'damage', val: 0.2 },
            { id: 'armor', name: 'Thick Membrane', desc: '+20% Health', stat: 'health', val: 0.2 },
            { id: 'view', name: 'Compound Eye', desc: '+30% Vision', stat: 'vision', val: 0.3 },
            { id: 'efficiency', name: 'Metabolism', desc: '+20% DNA Gain', stat: 'dna', val: 0.2 }
        ];
        this.choices = [];

        this.overlay = document.createElement('div');
        this.overlay.id = 'brain-overlay';
        this.overlay.style = `
            display:none; position:absolute; top:0; left:0; width:100%; height:100%;
            background:rgba(0,10,20,0.95); z-index:500; flex-direction:column;
            align-items:center; justify-content:center;
        `;
        document.body.appendChild(this.overlay);
    }

    enter() {
        this.overlay.style.display = 'flex';
        this.overlay.innerHTML = `
            <h1 style="color:#0ff; font-family:Orbitron; margin-bottom:10px;">EVOLUTIONARY LEAP</h1>
            <p style="color:#aaa; font-family:Orbitron; margin-bottom:30px;">Choose a mutation path</p>
            <div id="perk-container" style="display:flex; gap:20px; flex-wrap:wrap; justify-content:center;"></div>
        `;

        // Pick 3 random perks
        this.choices = [];
        const pool = [...this.perks];
        for(let i=0; i<3; i++) {
            if(pool.length === 0) break;
            const idx = Math.floor(Math.random() * pool.length);
            this.choices.push(pool[idx]);
            pool.splice(idx, 1);
        }

        const container = document.getElementById('perk-container');
        this.choices.forEach(perk => {
            const btn = document.createElement('div');
            btn.className = 'perk-card';
            btn.style = `
                width:150px; padding:20px; background:rgba(0,30,50,0.8); border:1px solid #0ff;
                border-radius:10px; text-align:center; cursor:pointer; transition:transform 0.2s;
            `;
            btn.innerHTML = `
                <h3 style="color:#fff; margin:0 0 10px 0;">${perk.name}</h3>
                <p style="color:#0ff; font-size:0.8rem;">${perk.desc}</p>
            `;
            btn.onclick = () => this.selectPerk(perk);
            container.appendChild(btn);
        });

        // Pause Game Audio logic?
        if (this.game.settings.audioEnabled) {
            // Play "Evolve" sound
            this.game.audio.playTone(400, 'sine', 1.0);
        }
    }

    exit() {
        this.overlay.style.display = 'none';
    }

    selectPerk(perk) {
        // Apply Perk
        if (perk.stat === 'speed') this.game.creature.stats.speedMult = (this.game.creature.stats.speedMult || 1) + perk.val;
        if (perk.stat === 'damage') this.game.creature.stats.damageMult = (this.game.creature.stats.damageMult || 1) + perk.val;
        if (perk.stat === 'health') {
            this.game.creature.gameStats.maxHealth *= (1 + perk.val);
            this.game.creature.gameStats.health += 20;
        }

        // Return to Game
        this.game.stateMachine.change('playing');
    }

    update(dt) {
        // Particles or simple idle anim
    }

    render(ctx) {
        // Draw background or brain visual?
        // DOM overlay covers most of it.
        // Maybe draw the creature in the background scaling up?

        const w = this.game.width;
        const h = this.game.height;
        ctx.fillStyle = '#000510';
        ctx.fillRect(0, 0, w, h);

        // Draw Creature centered big
        ctx.save();
        ctx.translate(w/2, h/2);
        ctx.scale(2, 2);
        this.game.renderer.drawCreature(this.game.creature, -Math.PI/2);
        ctx.restore();
    }
}
