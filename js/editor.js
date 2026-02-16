import Physics from './physics.js';

export default class Editor {
    constructor(game) {
        this.game = game;
        this.active = false;

        // Editor State
        this.selectedPart = null; // 'Fin', 'Spike', etc.
        this.isDragging = false;
        this.dragX = 0;
        this.dragY = 0;

        // Setup UI immediately
        setTimeout(() => this.setupUI(), 100);
    }

    setupUI() {
        // Toggle Overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'editor-overlay';
        this.overlay.style.position = 'absolute';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        this.overlay.style.width = '100%';
        this.overlay.style.height = '100%';
        this.overlay.style.display = 'none';
        this.overlay.style.pointerEvents = 'none'; // Let clicks pass to canvas if needed

        // HTML Content
        this.overlay.innerHTML = `
            <div style="position:absolute; bottom:20px; width:100%; display:flex; justify-content:center; gap:20px; pointer-events:auto;">
                <button id="add-vertebra-btn" style="padding:15px 30px; background:#0ff; border:none; border-radius:30px; font-weight:bold; font-family:Orbitron; box-shadow:0 0 10px #0ff;">+ BONE</button>
                <button id="close-editor-btn" style="padding:15px 30px; background:#f0f; border:none; border-radius:30px; font-weight:bold; font-family:Orbitron; box-shadow:0 0 10px #f0f;">PLAY</button>
            </div>

            <div style="position:absolute; top:20px; right:20px; width:80px; pointer-events:auto; display:flex; flex-direction:column; gap:10px;">
                <div class="part-item" data-type="Fin" style="background:rgba(0,255,255,0.2); border:1px solid #0ff; padding:15px; text-align:center; border-radius:8px; cursor:grab; color:#0ff;">FIN (5)</div>
                <div class="part-item" data-type="Spike" style="background:rgba(255,0,0,0.2); border:1px solid #f00; padding:15px; text-align:center; border-radius:8px; cursor:grab; color:#f00;">SPIKE (5)</div>
                <div class="part-item" data-type="Eye" style="background:rgba(255,255,255,0.2); border:1px solid #fff; padding:15px; text-align:center; border-radius:8px; cursor:grab; color:#fff;">EYE (5)</div>
            </div>

            <div style="position:absolute; top:20px; left:20px; color:#0ff; font-family:Orbitron; font-size:20px; text-shadow:0 0 5px #0ff;">
                WORKBENCH <span id="editor-dna" style="font-size:0.8em; color:#fff;">DNA: 0</span>
            </div>
        `;
        document.body.appendChild(this.overlay);

        // Listeners
        document.getElementById('close-editor-btn').addEventListener('click', () => this.toggle(false));
        document.getElementById('add-vertebra-btn').addEventListener('click', () => this.addVertebra());

        // Part Dragging (Touch & Mouse)
        const parts = document.querySelectorAll('.part-item');
        parts.forEach(p => {
            p.addEventListener('mousedown', (e) => this.startDrag(e, p.dataset.type));
            p.addEventListener('touchstart', (e) => this.startDrag(e, p.dataset.type), {passive: false});
        });

        // Global Drag Listeners (Window)
        window.addEventListener('mousemove', (e) => this.onDrag(e));
        window.addEventListener('touchmove', (e) => this.onDrag(e), {passive: false});
        window.addEventListener('mouseup', (e) => this.endDrag(e));
        window.addEventListener('touchend', (e) => this.endDrag(e));
    }

    toggle(active) {
        this.active = active;
        if (this.overlay) {
            this.overlay.style.display = active ? 'block' : 'none';
            if (active) this.updateDNA();
        }

        if (active) {
            // Zoom Camera to Creature
            this.game.camera.targetZoom = 2.5;
            this.game.input.active = false; // Disable movement
        } else {
            this.game.camera.targetZoom = 1.0;
        }
    }

    updateDNA() {
        const el = document.getElementById('editor-dna');
        if (el && this.game.creature) {
            el.innerText = `DNA: ${Math.floor(this.game.creature.gameStats.dna)}`;
        }
    }

    addVertebra() {
        if (!this.game.creature) return;
        if (this.game.creature.gameStats.dna < 10) return;

        const points = this.game.creature.points;
        if (points.length >= 20) return; // Cap length

        this.game.creature.gameStats.dna -= 10;
        this.updateDNA();

        const last = points[points.length-1];
        const prev = points[points.length-2] || last;

        // Calculate angle
        const angle = Math.atan2(last.y - prev.y, last.x - prev.x);

        // Create new Point
        const newX = last.x + Math.cos(angle) * 20;
        const newY = last.y + Math.sin(angle) * 20;

        // Decrease radius slightly
        const newRadius = Math.max(5, last.radius * 0.9);

        const newP = Physics.createPoint(newX, newY, newRadius, 1);
        newP.baseRadius = newRadius; // Important for scaling

        points.push(newP);

        // New Constraint
        const newC = Physics.createConstraint(last, newP, 0.3, 15);
        newC.baseLength = 15; // Important for scaling

        this.game.creature.constraints.push(newC);
    }

    startDrag(e, type) {
        // e.preventDefault();
        this.isDragging = true;
        this.selectedPart = type;
        const pt = this.getEventPos(e);
        this.dragX = pt.x;
        this.dragY = pt.y;
    }

    onDrag(e) {
        if (!this.isDragging) return;
        // e.preventDefault();
        const pt = this.getEventPos(e);
        this.dragX = pt.x;
        this.dragY = pt.y;
    }

    endDrag(e) {
        if (!this.isDragging) return;
        this.isDragging = false;

        // Drop Logic (Raycast to Spine)
        const cam = this.game.camera;

        let closest = null;
        let minDist = 50; // Snap radius in pixels (Screen Space)

        this.game.creature.points.forEach((p, index) => {
            // Project bone to screen
            const screenP = cam.worldToScreen(p.x, p.y);

            const dx = screenP.x - this.dragX;
            const dy = screenP.y - this.dragY;
            const d = Math.sqrt(dx*dx + dy*dy);

            if (d < minDist) {
                minDist = d;
                closest = { point: p, index: index };
            }
        });

        if (closest) {
            if (this.game.creature.gameStats.dna < 5) return;

            // Attach Part
            if (!this.game.creature.parts) this.game.creature.parts = [];

            this.game.creature.gameStats.dna -= 5;
            this.updateDNA();

            // Calculate Side
            // 1. Get Spine Vector (Bone -> Prev Bone)
            const bone = closest.point;
            const prev = this.game.creature.points[closest.index - 1] || this.game.creature.points[closest.index + 1]; // Fallback

            // If fallback is next bone (head case), reverse vector
            let spineVec = { x: bone.x - prev.x, y: bone.y - prev.y };
            if (closest.index === 0) {
                 spineVec = { x: prev.x - bone.x, y: prev.y - bone.y };
            }

            // 2. Get Drop Vector (World)
            const dropWorld = cam.screenToWorld(this.dragX, this.dragY);
            const dropVec = { x: dropWorld.x - bone.x, y: dropWorld.y - bone.y };

            // 3. Cross Product
            const cross = spineVec.x * dropVec.y - spineVec.y * dropVec.x;
            const side = cross > 0 ? 1 : -1;

            this.game.creature.parts.push({
                type: this.selectedPart,
                boneIndex: closest.index,
                side: side
            });

            // Update Stats
            this.game.creature.stats.calculate(this.game.creature.parts);
        }

        this.selectedPart = null;
    }

    getEventPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (e.changedTouches && e.changedTouches.length > 0) {
             return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    render(ctx) {
        if (!this.active) return;

        // 1. Draw UI Overlay for Dragging
        if (this.isDragging && this.selectedPart) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.shadowColor = '#0ff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(this.dragX, this.dragY, 20, 0, Math.PI*2);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.font = '12px Orbitron';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.selectedPart.toUpperCase(), this.dragX, this.dragY);
            ctx.restore();
        }

        // 2. Draw Highlight on Bones if Dragging
        if (this.isDragging) {
            const cam = this.game.camera;

            this.game.creature.points.forEach(p => {
                const sp = cam.worldToScreen(p.x, p.y);
                const dx = sp.x - this.dragX;
                const dy = sp.y - this.dragY;
                const d = Math.sqrt(dx*dx + dy*dy);

                if (d < 50) {
                    ctx.save();
                    ctx.strokeStyle = '#0f0';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(sp.x, sp.y, p.radius * cam.zoom * 1.5, 0, Math.PI*2);
                    ctx.stroke();
                    ctx.restore();
                }
            });
        }
    }
}
