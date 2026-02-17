export default class IntroState {
    constructor(game) {
        this.game = game;
        this.time = 0;
        this.phase = 'space'; // space, entry, impact, submerged, transition
        this.stars = [];
        this.bubbles = [];
        this.planetScale = 0;
        this.impactFlash = 0;

        // Init Stars
        for(let i=0; i<100; i++) {
            this.stars.push({
                x: (Math.random()-0.5) * window.innerWidth,
                y: (Math.random()-0.5) * window.innerHeight,
                z: Math.random() * 2 // depth
            });
        }
    }

    enter() {
        this.time = 0;
        this.phase = 'space';
        this.game.audio.startAmbient(); // Ensure audio is ready
        document.getElementById('game-hud').style.display = 'none';

        // Hide Main Menu if visible
        document.getElementById('main-menu').style.display = 'none';
    }

    exit() {
        // Cleanup if needed
    }

    update(dt) {
        this.time += dt;

        if (this.phase === 'space') {
            // Move stars
            this.stars.forEach(s => {
                s.z -= dt * 0.5;
                if (s.z <= 0) s.z += 2;
            });

            // Planet grows
            if (this.time > 2.0) {
                this.planetScale += dt * 0.5;
            }

            if (this.planetScale > 5.0) {
                this.phase = 'entry';
                this.time = 0; // Reset local time for next phase
            }
        }
        else if (this.phase === 'entry') {
            // Shake and burn
            this.planetScale += dt * 10.0; // Fast zoom into surface

            if (this.time > 1.5) {
                this.phase = 'impact';
                this.impactFlash = 1.0;
                this.time = 0;
                if(navigator.vibrate) navigator.vibrate(200);
            }
        }
        else if (this.phase === 'impact') {
            this.impactFlash -= dt * 0.5;
            if (this.time > 2.0) {
                this.phase = 'submerged';
                this.time = 0;
                // Initialize bubbles
                for(let i=0; i<50; i++) {
                    this.bubbles.push({
                        x: Math.random() * this.game.width,
                        y: this.game.height + Math.random() * 500,
                        r: 2 + Math.random() * 5,
                        v: 50 + Math.random() * 100
                    });
                }
            }
        }
        else if (this.phase === 'submerged') {
            // Bubbles rise
            this.bubbles.forEach(b => {
                b.y -= b.v * dt;
                b.x += Math.sin(b.y * 0.05) * 1;
            });

            // Camera pans down or we fade in the creature
            if (this.time > 4.0) {
                this.game.stateMachine.change('playing', { reset: true });
            }
        }
    }

    render(ctx) {
        const w = this.game.width;
        const h = this.game.height;
        const cx = w/2;
        const cy = h/2;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        if (this.phase === 'space' || this.phase === 'entry') {
            // Draw Stars
            ctx.fillStyle = '#fff';
            this.stars.forEach(s => {
                const k = 128.0 / s.z;
                const px = s.x * k + cx;
                const py = s.y * k + cy;

                if (px >= 0 && px <= w && py >= 0 && py <= h) {
                    const size = (1 - s.z / 2) * 3;
                    ctx.beginPath();
                    ctx.arc(px, py, Math.max(0.1, size), 0, Math.PI*2);
                    ctx.fill();
                }
            });

            // Draw Planet
            if (this.planetScale > 0) {
                const radius = 50 * Math.pow(this.planetScale, 2);
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
                grad.addColorStop(0, '#000022');
                grad.addColorStop(0.5, '#0044aa');
                grad.addColorStop(1, '#0088ff');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI*2);
                ctx.fill();
            }
        }

        if (this.phase === 'entry') {
             // Red heat burn overlay
             ctx.fillStyle = `rgba(255, 100, 0, ${Math.min(0.5, this.time * 0.5)})`;
             ctx.fillRect(0, 0, w, h);

             // Shake
             ctx.save();
             ctx.translate((Math.random()-0.5)*20, (Math.random()-0.5)*20);
             ctx.restore();
        }

        if (this.phase === 'impact') {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.impactFlash})`;
            ctx.fillRect(0, 0, w, h);
        }

        if (this.phase === 'submerged') {
            // Deep Blue
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, '#000011');
            grad.addColorStop(1, '#001133');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // Bubbles
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.bubbles.forEach(b => {
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
                ctx.fill();
            });

            // Text: "PHASE 1: THE AWAKENING"
            if (this.time > 1.0) {
                ctx.fillStyle = `rgba(0, 255, 255, ${Math.min(1, (this.time - 1.0))})`;
                ctx.font = '30px Orbitron';
                ctx.textAlign = 'center';
                ctx.fillText("PHASE 1: THE PRIMORDIAL SOUP", cx, cy);
            }
        }
    }
}
