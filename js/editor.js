import Physics from './physics.js';
import { PARTS_DB } from './progression.js';

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

        // HTML Content with Classes
        this.overlay.innerHTML = `
            <div class="editor-controls">
                <button id="add-vertebra-btn" class="btn-neon">+ BONE (10)</button>
                <button id="close-editor-btn" class="btn-neon" style="border-color:#f0f; color:#f0f; box-shadow:0 0 10px rgba(255,0,255,0.2);">PLAY</button>
            </div>

            <div class="editor-sidebar right" id="editor-parts-list">
                <!-- Populated Dynamically -->
            </div>

            <div style="position:absolute; top:20px; left:20px; color:#0ff; font-family:'Orbitron'; font-size:1.5rem; text-shadow:0 0 10px #0ff;">
                WORKBENCH <div id="editor-dna" style="font-size:0.8em; color:#fff; margin-top:5px;">DNA: 0</div>
            </div>

            <div class="glass-panel" style="position:absolute; bottom:100px; left:20px; padding:15px; width:200px; display:none;">
                <div style="color:#fff; font-size:0.8rem;">STATS PREVIEW</div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        // Listeners
        document.getElementById('close-editor-btn').addEventListener('click', () => this.toggle(false));
        document.getElementById('add-vertebra-btn').addEventListener('click', () => this.addVertebra());

        // Global Drag Listeners (Window)
        window.addEventListener('mousemove', (e) => this.onDrag(e));
        window.addEventListener('touchmove', (e) => this.onDrag(e), {passive: false});
        window.addEventListener('mouseup', (e) => this.endDrag(e));
        window.addEventListener('touchend', (e) => this.endDrag(e));

        // Tap on canvas for selection (only when editor active)
        this.game.canvas.addEventListener('mousedown', (e) => this.onCanvasClick(e));
        this.game.canvas.addEventListener('touchstart', (e) => this.onCanvasClick(e), {passive: false});
    }

    refreshParts() {
        const list = document.getElementById('editor-parts-list');
        list.innerHTML = '';

        const unlocked = this.game.progression.getAvailableParts();
        unlocked.forEach(key => {
            const part = PARTS_DB[key];
            const div = document.createElement('div');
            div.className = 'part-item';
            div.dataset.type = key;
            div.innerText = `${part.name} (${part.cost})`;
            div.style.pointerEvents = 'auto'; // Ensure clickable

            // Add Drag Listeners dynamically
            div.addEventListener('mousedown', (e) => this.startDrag(e, key));
            div.addEventListener('touchstart', (e) => this.startDrag(e, key), {passive: false});

            list.appendChild(div);
        });
    }

    toggle(active) {
        this.active = active;
        if (this.overlay) {
            this.overlay.style.display = active ? 'block' : 'none';
            if (active) {
                this.updateDNA();
                this.refreshParts();
            }
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
            const cost = PARTS_DB[this.selectedPart] ? PARTS_DB[this.selectedPart].cost : 5;

            if (this.game.creature.gameStats.dna < cost) return;

            // Attach Part
            if (!this.game.creature.parts) this.game.creature.parts = [];

            this.game.creature.gameStats.dna -= cost;
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

    onCanvasClick(e) {
        if (!this.active || this.isDragging) return;
        // Don't trigger if touching UI
        if (e.target !== this.game.canvas) return;

        const pt = this.getEventPos(e);
        const cam = this.game.camera;

        // Check Bone Selection
        let clicked = null;
        this.game.creature.points.forEach((p, index) => {
            const sp = cam.worldToScreen(p.x, p.y);
            const dist = Math.hypot(sp.x - pt.x, sp.y - pt.y);
            if (dist < p.radius * cam.zoom * 2) { // Generous hit area
                clicked = { p, index, sp };
            }
        });

        if (clicked) {
            this.selectedBone = clicked;
            this.showResizeSlider(clicked);
        } else {
            this.selectedBone = null;
            this.hideResizeSlider();
        }
    }

    showResizeSlider(selection) {
        let slider = document.getElementById('resize-slider-container');
        if (!slider) {
            slider = document.createElement('div');
            slider.id = 'resize-slider-container';
            slider.className = 'glass-panel';
            slider.style = `position:absolute; width:150px; padding:10px; display:flex; flex-direction:column; align-items:center; gap:5px; pointer-events:auto;`;
            slider.innerHTML = `
                <div style="font-size:0.8rem; color:#fff;">SCALE</div>
                <input type="range" id="bone-scale" min="0.5" max="1.5" step="0.1" value="1.0" style="width:100%;">
            `;
            document.body.appendChild(slider);

            document.getElementById('bone-scale').addEventListener('input', (e) => {
                if (this.selectedBone) {
                    const scale = parseFloat(e.target.value);
                    const base = this.selectedBone.p.baseRadius || 20; // Default fallback
                    // We need to store original baseRadius somewhere if we want non-destructive editing
                    // Actually, baseRadius IS the source of truth before mass scaling.
                    // But if we edit it, we lose the previous value.
                    // Let's assume current baseRadius is 1.0 scale relative to "norm".
                    // Or simpler: We modify baseRadius directly.
                    // But we need to know what "1.0" means.
                    // Let's attach a 'scaleFactor' to the point.

                    this.selectedBone.p.scaleFactor = scale;
                    // baseRadius = initialRadius * scaleFactor?
                    // InitialRadius is not stored.
                    // Let's just multiply relative to current? No, drift.
                    // Let's store `initialBaseRadius` on creation.
                    if (!this.selectedBone.p.initialBaseRadius) this.selectedBone.p.initialBaseRadius = this.selectedBone.p.baseRadius;

                    this.selectedBone.p.baseRadius = this.selectedBone.p.initialBaseRadius * scale;
                }
            });
        }

        // Position Slider near bone
        slider.style.display = 'flex';
        slider.style.left = `${selection.sp.x + 50}px`;
        slider.style.top = `${selection.sp.y - 50}px`;

        // Set value
        const currentScale = selection.p.scaleFactor || 1.0;
        document.getElementById('bone-scale').value = currentScale;
    }

    hideResizeSlider() {
        const slider = document.getElementById('resize-slider-container');
        if (slider) slider.style.display = 'none';
    }

    render(ctx) {
        if (!this.active) return;

        // Highlight Selected Bone
        if (this.selectedBone) {
            const cam = this.game.camera;
            const p = this.selectedBone.p;
            const sp = cam.worldToScreen(p.x, p.y);

            // Update slider pos in case of camera movement (though camera is locked in editor usually)
            // But creature moves physically
            const slider = document.getElementById('resize-slider-container');
            if(slider && slider.style.display !== 'none') {
                 slider.style.left = `${sp.x + 40}px`;
                 slider.style.top = `${sp.y - 40}px`;
            }

            ctx.save();
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, p.radius * cam.zoom * 1.2 + 5, 0, Math.PI*2);
            ctx.stroke();
            ctx.restore();
        }

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
