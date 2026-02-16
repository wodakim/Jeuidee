export default class AssetGenerator {
    constructor() {
        this.cache = {};
    }

    get(key) {
        if (!this.cache[key]) {
            this.cache[key] = this.generate(key);
        }
        return this.cache[key];
    }

    generate(key) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (key === 'giant_worm') {
            canvas.width = 500;
            canvas.height = 200;
            // Draw a segmented worm silhouette
            ctx.fillStyle = 'rgba(20, 40, 60, 0.4)';
            ctx.filter = 'blur(10px)'; // Blur once during generation

            for (let i = 0; i < 10; i++) {
                ctx.beginPath();
                ctx.arc(50 + i * 40, 100, 40 - i * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        else if (key === 'giant_jelly') {
            canvas.width = 400;
            canvas.height = 600;
            ctx.fillStyle = 'rgba(30, 50, 70, 0.3)';
            ctx.filter = 'blur(15px)';

            // Head
            ctx.beginPath();
            ctx.arc(200, 150, 100, Math.PI, 0);
            ctx.fill();

            // Tentacles
            ctx.lineWidth = 20;
            ctx.strokeStyle = 'rgba(30, 50, 70, 0.2)';
            for(let i=0; i<5; i++) {
                ctx.beginPath();
                ctx.moveTo(120 + i*40, 150);
                ctx.quadraticCurveTo(120 + i*40 + (Math.random()-0.5)*50, 400, 120 + i*40, 550);
                ctx.stroke();
            }
        }
        else if (key === 'god_rays') {
            canvas.width = 800;
            canvas.height = 800;

            // Radial Gradient Rays
            const grad = ctx.createRadialGradient(400, 400, 0, 400, 400, 400);
            grad.addColorStop(0, 'rgba(0, 255, 255, 0.05)');
            grad.addColorStop(0.5, 'rgba(0, 200, 255, 0.02)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = grad;
            // Draw Star/Ray shape
            for(let i=0; i<8; i++) {
                ctx.save();
                ctx.translate(400, 400);
                ctx.rotate(i * (Math.PI / 4));
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(100, -400);
                ctx.lineTo(-100, -400);
                ctx.fill();
                ctx.restore();
            }
        }

        return canvas;
    }
}
