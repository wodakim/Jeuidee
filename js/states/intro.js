export default class IntroState {
    constructor(game) {
        this.game = game;
        this.time = 0;
        this.phase = 'space'; // space, entry, impact, sink, awaken
        this.stars = [];
        this.shard = null; // The specific rock we follow
        this.particles = []; // General FX

        // DOM Overlay for Text
        this.titleOverlay = document.createElement('div');
        this.titleOverlay.className = 'intro-title';
        this.titleOverlay.style = `
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 100%; text-align: center; color: rgba(0, 255, 255, 0);
            font-family: Orbitron; font-size: clamp(1.5rem, 5vw, 3rem);
            pointer-events: none; z-index: 50; transition: opacity 2s;
        `;
        this.titleOverlay.innerText = "PHASE 1: PANSPERMIA";
        document.body.appendChild(this.titleOverlay);

        this.skipBtn = document.createElement('button');
        this.skipBtn.innerText = "SKIP >>";
        this.skipBtn.className = 'btn-neon';
        this.skipBtn.style = `
            position: absolute; top: 20px; right: 20px;
            padding: 5px 10px; font-size: 0.8rem; z-index: 60; display: none;
        `;
        this.skipBtn.onclick = () => this.game.stateMachine.change('genesis');
        document.body.appendChild(this.skipBtn);

        this.initStars();
    }

    initStars() {
        this.stars = [];
        for(let i=0; i<200; i++) {
            this.stars.push({
                x: (Math.random()-0.5) * window.innerWidth * 2,
                y: (Math.random()-0.5) * window.innerHeight * 2,
                z: Math.random() * 2 + 0.1
            });
        }
    }

    enter() {
        this.time = 0;
        this.phase = 'space';
        this.game.audio.startAmbient();
        document.getElementById('game-hud').style.display = 'none';
        document.getElementById('main-menu').style.display = 'none';
        this.skipBtn.style.display = 'block';
        this.titleOverlay.style.color = 'rgba(0, 255, 255, 0)';
        this.titleOverlay.innerText = "PHASE 1: PANSPERMIA";

        // Reset Camera
        this.game.camera.x = 0;
        this.game.camera.y = 0;
        this.game.camera.zoom = 1;
    }

    exit() {
        this.skipBtn.style.display = 'none';
        this.titleOverlay.style.display = 'none';
        this.titleOverlay.remove();
        this.skipBtn.remove();
    }

    update(dt) {
        this.time += dt;

        if (this.phase === 'space') {
            // Comet Flying
            // Stars move fast (Parallax)
            this.stars.forEach(s => {
                s.z -= dt * 0.5;
                if (s.z <= 0) s.z += 2;
            });

            // Camera shake builds up
            if (this.time > 3.0) {
                 this.game.camera.x = (Math.random()-0.5) * (this.time - 3) * 2;
                 this.game.camera.y = (Math.random()-0.5) * (this.time - 3) * 2;
            }

            if (this.time > 5.0) {
                this.phase = 'entry';
                this.time = 0;
                if(navigator.vibrate) navigator.vibrate(200);
            }
        }
        else if (this.phase === 'entry') {
            // Screen turns white/red
            this.game.camera.x = (Math.random()-0.5) * 20;
            this.game.camera.y = (Math.random()-0.5) * 20;

            if (this.time > 1.5) {
                this.phase = 'impact';
                this.time = 0;
                // Spawn Shards
                this.shard = { x: 0, y: -this.game.height, vx: 0, vy: 500, r: 20, heat: 1.0 };
                if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
            }
        }
        else if (this.phase === 'impact') {
            // Flash fades
            if (this.time > 0.5) {
                this.phase = 'sink';
                this.time = 0;
                this.game.camera.zoom = 1.0;

                // Init sinking particles
                for(let i=0; i<20; i++) {
                    this.particles.push({
                        x: (Math.random()-0.5) * 400,
                        y: -this.game.height/2 - Math.random() * 500,
                        vx: (Math.random()-0.5) * 50,
                        vy: 100 + Math.random() * 200,
                        r: 2 + Math.random() * 5,
                        life: 10
                    });
                }
            }
        }
        else if (this.phase === 'sink') {
            // Follow Shard
            this.shard.vy *= 0.95; // Drag
            this.shard.y += this.shard.vy * dt;
            this.shard.heat -= dt * 0.2; // Cooling

            // Camera follow with lag
            this.game.camera.y += (this.shard.y - this.game.camera.y) * 0.1;

            // Particles
            this.particles.forEach(p => {
                p.y += p.vy * dt;
                p.x += p.vx * dt;
            });

            // Text Fade In
            if (this.time > 1.0 && this.time < 1.5) {
                 this.titleOverlay.style.color = 'rgba(0, 255, 255, 1)';
            }
            if (this.time > 4.0) {
                 this.titleOverlay.style.color = 'rgba(0, 255, 255, 0)';
            }

            if (this.time > 6.0) {
                this.phase = 'awaken';
                this.time = 0;
            }
        }
        else if (this.phase === 'awaken') {
            // Zoom in on shard
            this.game.camera.zoom += dt * 0.5;

            if (this.time > 2.0) {
                // Break open
                this.game.stateMachine.change('genesis');
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

        if (this.phase === 'space') {
            // Draw Stars
            ctx.fillStyle = '#fff';
            this.stars.forEach(s => {
                const k = 128.0 / s.z;
                const px = s.x * k + cx;
                const py = s.y * k + cy;
                if (px >= 0 && px <= w && py >= 0 && py <= h) {
                    const size = (1 - s.z / 3) * 2;
                    ctx.beginPath();
                    ctx.arc(px, py, Math.max(0.1, size), 0, Math.PI*2);
                    ctx.fill();
                }
            });

            // Draw Planet Growing
            const scale = Math.pow(this.time, 3) * 0.05;
            if (scale > 0.1) {
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100 * scale);
                grad.addColorStop(0, '#0044aa');
                grad.addColorStop(1, '#000022');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, 100 * scale, 0, Math.PI*2);
                ctx.fill();
            }

            // Draw Comet (Line towards center)
            const cometDist = 500 - this.time * 100;
            if (cometDist > 0) {
                 ctx.strokeStyle = '#fff';
                 ctx.lineWidth = 2;
                 ctx.beginPath();
                 ctx.moveTo(cx, cy);
                 ctx.lineTo(cx + cometDist, cy - cometDist); // Diagonal
                 ctx.stroke();

                 // Head
                 ctx.fillStyle = '#fff';
                 ctx.beginPath();
                 ctx.arc(cx + cometDist, cy - cometDist, 3, 0, Math.PI*2);
                 ctx.fill();
            }
        }
        else if (this.phase === 'entry') {
             // Red/White noise
             ctx.fillStyle = `rgba(255, ${Math.random()*255}, ${Math.random()*200}, 1)`;
             ctx.fillRect(0, 0, w, h);
        }
        else if (this.phase === 'impact') {
            const alpha = 1.0 - (this.time * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(0, 0, w, h);
        }
        else if (this.phase === 'sink' || this.phase === 'awaken') {
            // Abyss Gradient
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, '#000011');
            grad.addColorStop(1, '#001133');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            this.game.camera.apply(ctx);

            // Draw Shard
            if (this.shard) {
                // Glow if hot
                if (this.shard.heat > 0) {
                    ctx.shadowColor = '#ff4400';
                    ctx.shadowBlur = 20 * this.shard.heat;
                    ctx.fillStyle = `rgba(50, 20, 20, 1)`;
                } else {
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#222';
                }

                // If awaken, blue glow cracks
                if (this.phase === 'awaken') {
                     ctx.shadowColor = '#00ffff';
                     ctx.shadowBlur = 20 * this.time;
                     ctx.strokeStyle = '#00ffff';
                     ctx.lineWidth = 2;
                }

                ctx.beginPath();
                // Irregular rock shape
                const r = this.shard.r;
                ctx.moveTo(this.shard.x - r, this.shard.y - r);
                ctx.lineTo(this.shard.x + r, this.shard.y - r + 5);
                ctx.lineTo(this.shard.x + r - 5, this.shard.y + r);
                ctx.lineTo(this.shard.x - r + 5, this.shard.y + r - 5);
                ctx.closePath();
                ctx.fill();
                if (this.phase === 'awaken') ctx.stroke();

                ctx.shadowBlur = 0;
            }

            // Draw other particles
            ctx.fillStyle = '#444';
            this.particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
                ctx.fill();
            });

            this.game.camera.restore(ctx);
        }
    }
}
