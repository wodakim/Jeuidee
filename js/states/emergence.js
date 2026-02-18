export default class EmergenceState {
    constructor(game) {
        this.game = game;
        this.time = 0;
        this.phase = 'rise'; // rise, breach, end

        this.overlay = document.createElement('div');
        this.overlay.style = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255, 255, 255, 0); z-index: 1000; pointer-events: none; transition: background 5s;
        `;
        document.body.appendChild(this.overlay);

        this.credits = document.createElement('div');
        this.credits.style = `
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            text-align: center; color: #000; font-family: Orbitron; opacity: 0; transition: opacity 2s; z-index: 1001;
        `;
        this.credits.innerHTML = `
            <h1>EMERGENCE</h1>
            <p>You have left the abyss.</p>
            <p style="margin-top:20px; font-size:0.8rem;">Thank you for playing.</p>
            <button id="reset-emergence-btn" style="margin-top:20px; padding:10px; cursor:pointer; pointer-events:auto;">Play Again</button>
        `;
        document.body.appendChild(this.credits);

        document.getElementById('reset-emergence-btn').onclick = () => {
            this.game.resetCreature();
            this.game.stateMachine.change('menu');
        };
    }

    enter() {
        this.time = 0;
        this.phase = 'rise';
        this.overlay.style.background = 'rgba(255, 255, 255, 0)';
        this.credits.style.opacity = 0;
        document.getElementById('game-hud').style.display = 'none';

        // Face Up
        this.game.headAngle = -Math.PI / 2;
    }

    exit() {
        this.overlay.style.background = 'rgba(255, 255, 255, 0)';
        this.overlay.style.display = 'none';
        this.credits.style.display = 'none';
    }

    update(dt) {
        this.time += dt;

        // Swim Up
        if (this.phase === 'rise') {
            const head = this.game.creature.points[0];
            head.y -= 200 * dt; // Rise fast
            head.x += Math.sin(this.time * 2) * 50 * dt; // Wiggle

            // Camera follow
            this.game.camera.y = head.y;
            this.game.camera.x = head.x;

            this.game.physics.update(this.game.creature.points, this.game.creature.constraints, dt);

            // Light gets brighter
            const brightness = Math.min(1, this.time / 5.0);
            this.overlay.style.background = `rgba(255, 255, 255, ${brightness})`;

            if (this.time > 5.0) {
                this.phase = 'breach';
                this.time = 0;
                if (this.game.settings.audioEnabled) this.game.audio.playTone(800, 'sine', 2.0); // Heaven sound
            }
        }
        else if (this.phase === 'breach') {
            this.overlay.style.background = 'white';
            this.credits.style.opacity = Math.min(1, this.time / 2.0);
        }
    }

    render(ctx) {
        // Draw creature rising into light
        const w = this.game.width;
        const h = this.game.height;

        // Background: Light Blue Gradient (Surface)
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#fff'); // Sun
        grad.addColorStop(1, '#00aaff'); // Water
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        this.game.camera.apply(ctx);
        this.game.renderer.drawCreature(this.game.creature, -Math.PI/2);
        this.game.camera.restore(ctx);
    }
}
