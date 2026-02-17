import Physics from './physics.js';
import { PARTS_DB } from './progression.js';

export default class Editor {
    constructor(game) {
        this.game = game;
        this.active = false;

        // Editor State
        this.selectedPart = null;
        this.isDragging = false;
        this.dragX = 0;
        this.dragY = 0;

        this.symmetry = false;
        this.clone = null; // Petri Dish Clone

        setTimeout(() => this.setupUI(), 100);
    }

    setupUI() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'editor-overlay';
        this.overlay.style = `position:absolute; top:0; left:0; width:100%; height:100%; display:none; pointer-events:none; z-index:2000; font-family:Orbitron;`;

        // Revised Layout for Mobile: Bottom Bar for Parts, Top Bar for Controls
        this.overlay.innerHTML = `
            <div style="position:absolute; top:0; left:0; width:100%; height:60px; background:rgba(0,0,0,0.8); display:flex; justify-content:space-between; align-items:center; padding:0 10px; box-sizing:border-box; pointer-events:auto; border-bottom:1px solid #333;">
                <div style="color:#0ff; font-size:1.2rem; text-shadow:0 0 10px #0ff;">
                    WORKBENCH <span id="editor-dna" style="font-size:0.7em; color:#fff; margin-left:10px;">DNA: 0</span>
                </div>
                <div style="display:flex; gap:10px;">
                    <button id="add-vertebra-btn" class="btn-neon" style="font-size:0.8rem; padding:5px 10px;">+ BONE (10)</button>
                    <button id="toggle-mirror-btn" class="btn-neon" style="font-size:0.8rem; padding:5px 10px;">SYM: OFF</button>
                    <button id="close-editor-btn" class="btn-neon" style="border-color:#f0f; color:#f0f; font-size:0.8rem; padding:5px 15px;">PLAY</button>
                </div>
            </div>

            <div id="editor-parts-list" style="position:absolute; bottom:0; left:0; width:100%; height:100px; background:rgba(0,0,0,0.9); display:flex; overflow-x:auto; align-items:center; gap:10px; padding:10px; box-sizing:border-box; pointer-events:auto; border-top:1px solid #333; white-space:nowrap;">
                <!-- Populated Dynamically -->
            </div>

            <div style="position:absolute; top:70px; width:100%; text-align:center; color:rgba(255,255,255,0.5); font-size:0.8rem; pointer-events:none;">
                DRAG PARTS TO BODY • TAP BONE TO RESIZE
            </div>
        `;
        document.body.appendChild(this.overlay);

        // Listeners
        document.getElementById('close-editor-btn').addEventListener('click', () => this.toggle(false));
        document.getElementById('add-vertebra-btn').addEventListener('click', () => this.addVertebra());
        document.getElementById('toggle-mirror-btn').addEventListener('click', () => this.toggleSymmetry());

        // Drag Listeners
        window.addEventListener('mousemove', (e) => this.onDrag(e));
        window.addEventListener('touchmove', (e) => this.onDrag(e), {passive: false});
        window.addEventListener('mouseup', (e) => this.endDrag(e));
        window.addEventListener('touchend', (e) => this.endDrag(e));

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
            // Card Style
            div.className = 'part-card';
            div.style = `
                min-width:80px; height:80px; border:1px solid #444; background:rgba(20,20,20,0.8);
                display:flex; flex-direction:column; align-items:center; justify-content:center;
                border-radius:5px; cursor:grab; user-select:none; color:#aaa; font-size:0.7rem;
            `;

            div.innerHTML = `
                <div style="font-size:1.5rem; margin-bottom:5px;">${key[0]}</div>
                <div style="font-weight:bold; color:#fff;">${part.name}</div>
                <div style="color:#0f0;">${part.cost}</div>
            `;

            if (key === 'Eye') div.style.borderColor = '#fff';

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
                this.enterPetriMode();
                this.updateDNA();
                this.refreshParts();
            } else {
                this.exitPetriMode();
                this.hideResizeSlider();
            }
        }
    }

    enterPetriMode() {
        this.game.input.active = false;

        // Deep Copy Creature to Clone
        const source = this.game.creature;
        this.clone = {
            points: [],
            constraints: [],
            parts: JSON.parse(JSON.stringify(source.parts || [])),
            stats: source.stats,
            gameStats: source.gameStats,
            color: source.color
        };

        // Straighten Spine for Precision
        let y = 0;
        source.points.forEach((p, i) => {
            const spacing = (i === 0) ? 0 : 20;
            y += spacing;

            const cp = Physics.createPoint(0, y, p.baseRadius || 20, p.mass);
            cp.baseRadius = p.baseRadius || 20;
            cp.radius = cp.baseRadius;
            cp.initialBaseRadius = p.initialBaseRadius;
            cp.scaleFactor = p.scaleFactor;

            this.clone.points.push(cp);
        });

        // Rebuild Constraints
        for(let i=1; i<this.clone.points.length; i++) {
            const p1 = this.clone.points[i-1];
            const p2 = this.clone.points[i];
            const dist = p2.y - p1.y;
            const c = Physics.createConstraint(p1, p2, 0.5, dist);
            c.baseLength = dist;
            this.clone.constraints.push(c);
        }

        // Center Camera on Clone
        const centerY = y / 2;
        this.game.camera.x = 0;
        this.game.camera.y = centerY;
        this.fitCamera();
    }

    exitPetriMode() {
        const target = this.game.creature;

        // Copy Parts
        target.parts = JSON.parse(JSON.stringify(this.clone.parts));

        // Sync Bones (Add new ones if needed)
        while (target.points.length < this.clone.points.length) {
            const last = target.points[target.points.length-1];
            const prev = target.points[target.points.length-2] || last;
            const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
            const r = last.radius;
            const newX = last.x + Math.cos(angle) * 20;
            const newY = last.y + Math.sin(angle) * 20;

            const p = Physics.createPoint(newX, newY, r, 1);
            p.baseRadius = r;
            target.points.push(p);

            const c = Physics.createConstraint(last, p, 0.5, 20);
            c.baseLength = 20;
            target.constraints.push(c);
        }

        // Update radii
        for(let i=0; i<this.clone.points.length; i++) {
            const cp = this.clone.points[i];
            const tp = target.points[i];
            if (tp) {
                tp.baseRadius = cp.baseRadius;
                tp.initialBaseRadius = cp.initialBaseRadius;
                tp.scaleFactor = cp.scaleFactor;
            }
        }

        target.stats.calculate(target.parts);

        this.game.camera.targetZoom = 0.7;
        this.game.input.active = true;

        // Flash Effect
        const flash = document.createElement('div');
        flash.style = "position:absolute; top:0; left:0; width:100%; height:100%; background:white; z-index:3000; animation: fadeOut 0.5s forwards; pointer-events:none;";
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 500);
    }

    fitCamera() {
        if (!this.clone || this.clone.points.length === 0) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        this.clone.points.forEach(p => {
            minX = Math.min(minX, p.x - p.radius);
            maxX = Math.max(maxX, p.x + p.radius);
            minY = Math.min(minY, p.y - p.radius);
            maxY = Math.max(maxY, p.y + p.radius);
        });

        const width = maxX - minX;
        const height = maxY - minY;

        const padding = 300;
        const desiredW = width + padding;
        const desiredH = height + padding;

        const zoomX = this.game.width / desiredW;
        const zoomY = (this.game.height - 160) / desiredH;

        let targetZoom = Math.min(zoomX, zoomY);
        targetZoom = Math.min(targetZoom, 2.5);
        targetZoom = Math.max(targetZoom, 0.5);

        this.game.camera.targetZoom = targetZoom;
        this.game.camera.x = 0;
        this.game.camera.y = (minY + maxY) / 2;
        this.game.camera.vx = 0;
        this.game.camera.vy = 0;
    }

    toggleSymmetry() {
        this.symmetry = !this.symmetry;
        const btn = document.getElementById('toggle-mirror-btn');
        btn.innerText = `SYM: ${this.symmetry ? 'ON' : 'OFF'}`;
        btn.style.borderColor = this.symmetry ? '#0f0' : '#0ff';
        btn.style.color = this.symmetry ? '#0f0' : '#0ff';
    }

    updateDNA() {
        const el = document.getElementById('editor-dna');
        if (el && this.game.creature) {
            el.innerText = `DNA: ${Math.floor(this.game.creature.gameStats.dna)}`;
        }
    }

    addVertebra() {
        if (!this.clone) return;
        if (this.clone.gameStats.dna < 10) return;

        const points = this.clone.points;
        if (points.length >= 30) return;

        this.clone.gameStats.dna -= 10;
        this.updateDNA();

        const last = points[points.length-1];
        const newRadius = Math.max(5, last.baseRadius * 0.95);
        const newX = 0;
        const newY = last.y + 20;

        const newP = Physics.createPoint(newX, newY, newRadius, 1);
        newP.baseRadius = newRadius;
        newP.radius = newRadius;

        points.push(newP);

        const newC = Physics.createConstraint(last, newP, 0.5, 20);
        newC.baseLength = 20;

        this.clone.constraints.push(newC);
        this.fitCamera();
    }

    startDrag(e, type) {
        this.isDragging = true;
        this.selectedPart = type;
        const pt = this.getEventPos(e);
        this.dragX = pt.x;
        this.dragY = pt.y;
    }

    onDrag(e) {
        if (!this.isDragging) return;
        const pt = this.getEventPos(e);
        this.dragX = pt.x;
        this.dragY = pt.y;
    }

    getClosestBone(pt) {
        const cam = this.game.camera;
        let closest = null;
        let minDist = 120;

        // Use CLONE
        this.clone.points.forEach((p, index) => {
            const sp = cam.worldToScreen(p.x, p.y);
            const dx = sp.x - pt.x;
            const dy = sp.y - pt.y;
            const d = Math.sqrt(dx*dx + dy*dy);

            if (d < minDist) {
                minDist = d;
                closest = { point: p, index: index, sp: sp };
            }
        });
        return closest;
    }

    calcSide(closest, dragX, dragY) {
        const bone = closest.point;
        let spineVec = { x: 0, y: 0 };

        if (closest.index < this.clone.points.length - 1) {
            const next = this.clone.points[closest.index + 1];
            spineVec = { x: next.x - bone.x, y: next.y - bone.y };
        } else {
            const prev = this.clone.points[closest.index - 1];
            spineVec = { x: bone.x - prev.x, y: bone.y - prev.y };
        }

        const dropWorld = this.game.camera.screenToWorld(dragX, dragY);
        const dropVec = { x: dropWorld.x - bone.x, y: dropWorld.y - bone.y };
        const dropLen = Math.hypot(dropVec.x, dropVec.y) || 1;
        const normDropX = dropVec.x / dropLen;
        const normDropY = dropVec.y / dropLen;

        const dot = spineVec.x * normDropX + spineVec.y * normDropY;
        const cross = spineVec.x * normDropY - spineVec.y * normDropX;

        if (closest.index === 0 && dot < -0.7) return 2; // Nose

        // Fix Left/Right Inversion: Swap cross check
        if (cross > 0) return -1;
        return 1;
    }

    endDrag(e) {
        if (!this.isDragging) return;
        this.isDragging = false;

        const closest = this.getClosestBone({x: this.dragX, y: this.dragY});

        if (closest) {
            const cost = PARTS_DB[this.selectedPart] ? PARTS_DB[this.selectedPart].cost : 5;
            let totalCost = cost;
            const side = this.calcSide(closest, this.dragX, this.dragY);

            if (this.symmetry && side !== 0) totalCost *= 2;

            if (this.clone.gameStats.dna < totalCost) {
                alert("Not enough DNA!");
                this.selectedPart = null;
                return;
            }

            this.addPart(this.selectedPart, closest.index, side);

            if (this.symmetry && side !== 0) {
                this.addPart(this.selectedPart, closest.index, -side);
            }

            this.clone.gameStats.dna -= totalCost;
            this.updateDNA();
            if (navigator.vibrate) navigator.vibrate(50);
        }

        this.selectedPart = null;
    }

    addPart(type, index, side) {
        if (!this.clone.parts) this.clone.parts = [];
        this.clone.parts.push({
            type: type,
            boneIndex: index,
            side: side
        });
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
        if (e.target !== this.game.canvas) return;

        const pt = this.getEventPos(e);
        const cam = this.game.camera;

        let clickedBone = null;
        this.clone.points.forEach((p, index) => {
            const sp = cam.worldToScreen(p.x, p.y);
            const dist = Math.hypot(sp.x - pt.x, sp.y - pt.y);
            if (dist < p.radius * cam.zoom * 2.5) {
                clickedBone = { p, index, sp, dist: dist };
            }
        });

        if (clickedBone) {
            const radiusScreen = clickedBone.p.radius * cam.zoom;

            if (clickedBone.dist < radiusScreen * 0.8) {
                this.selectedBone = clickedBone;
                this.showResizeSlider(clickedBone);
            } else {
                // Remove Part Logic (Target CLONE)
                const parts = this.clone.parts || [];
                const boneParts = parts.filter(p => p.boneIndex === clickedBone.index);
                if (boneParts.length > 0) {
                    const toRemove = boneParts[boneParts.length - 1];
                    const cost = PARTS_DB[toRemove.type] ? PARTS_DB[toRemove.type].cost : 5;
                    this.clone.gameStats.dna += Math.floor(cost * 0.5);

                    const idx = parts.indexOf(toRemove);
                    if (idx > -1) parts.splice(idx, 1);

                    this.updateDNA();
                    if (navigator.vibrate) navigator.vibrate(20);
                } else {
                    this.selectedBone = clickedBone;
                    this.showResizeSlider(clickedBone);
                }
            }
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
            slider.style = `position:absolute; width:150px; padding:10px; display:flex; flex-direction:column; align-items:center; gap:5px; pointer-events:auto; z-index:2001; background:rgba(0,0,0,0.8); border:1px solid #0ff; border-radius:10px;`;
            slider.innerHTML = `
                <div style="font-size:0.8rem; color:#fff;">SCALE</div>
                <input type="range" id="bone-scale" min="0.5" max="1.5" step="0.1" value="1.0" style="width:100%;">
            `;
            document.body.appendChild(slider);

            document.getElementById('bone-scale').addEventListener('input', (e) => {
                if (this.selectedBone) {
                    const scale = parseFloat(e.target.value);
                    if (!this.selectedBone.p.initialBaseRadius) this.selectedBone.p.initialBaseRadius = this.selectedBone.p.baseRadius;

                    const newRadius = this.selectedBone.p.initialBaseRadius * scale;
                    this.selectedBone.p.baseRadius = newRadius;
                    this.selectedBone.p.radius = newRadius;
                    this.selectedBone.p.scaleFactor = scale;
                }
            });
        }

        slider.style.display = 'flex';
        slider.style.left = `${Math.min(window.innerWidth - 160, selection.sp.x - 75)}px`;
        slider.style.top = `${selection.sp.y - 80}px`;

        if (selection.p.scaleFactor === undefined) {
             const base = selection.p.initialBaseRadius || 20;
             selection.p.scaleFactor = selection.p.baseRadius / base;
        }

        const currentScale = selection.p.scaleFactor || 1.0;
        document.getElementById('bone-scale').value = currentScale;
    }

    hideResizeSlider() {
        const slider = document.getElementById('resize-slider-container');
        if (slider) slider.style.display = 'none';
    }

    render(ctx) {
        if (!this.active) return;

        // Render Petri Dish Background
        ctx.save();
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, this.game.width, this.game.height);

        ctx.translate(this.game.width/2, this.game.height/2);
        ctx.scale(this.game.camera.zoom, this.game.camera.zoom);
        ctx.translate(-this.game.camera.x, -this.game.camera.y);

        ctx.strokeStyle = '#222';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, 1000, 0, Math.PI*2); // Petri dish rim
        ctx.stroke();
        ctx.restore();

        // Render Clone Creature
        if (this.clone) {
            this.game.renderer.drawCreature(this.clone, -Math.PI/2); // Head pointing up
        }

        if (this.selectedBone) {
            const cam = this.game.camera;
            const p = this.selectedBone.p;
            const sp = cam.worldToScreen(p.x, p.y);

            const slider = document.getElementById('resize-slider-container');
            if(slider && slider.style.display !== 'none') {
                 slider.style.left = `${Math.min(window.innerWidth - 160, sp.x - 75)}px`;
                 slider.style.top = `${sp.y - 80}px`;
            }

            ctx.save();
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, p.radius * cam.zoom * 1.2 + 5, 0, Math.PI*2);
            ctx.stroke();
            ctx.restore();
        }

        if (this.isDragging && this.selectedPart) {
            const closest = this.getClosestBone({x: this.dragX, y: this.dragY});

            if (closest) {
                // Visualize Snap Target
                ctx.save();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(closest.sp.x, closest.sp.y, closest.point.radius * this.game.camera.zoom * 1.5, 0, Math.PI*2);
                ctx.stroke();
                ctx.restore();

                const bone = closest.point;
                let spineVec = { x: 0, y: 0 };
                if (closest.index < this.clone.points.length - 1) {
                    const next = this.clone.points[closest.index + 1];
                    spineVec = { x: next.x - bone.x, y: next.y - bone.y };
                } else {
                    const prev = this.clone.points[closest.index - 1];
                    spineVec = { x: bone.x - prev.x, y: bone.y - prev.y };
                }

                const side = this.calcSide(closest, this.dragX, this.dragY);
                const spineAngle = Math.atan2(spineVec.y, spineVec.x) + (closest.index===0 ? Math.PI : 0);

                ctx.save();
                ctx.globalAlpha = 0.5;
                const sp = closest.sp;

                ctx.translate(sp.x, sp.y);

                let sideAngle = 0;
                if (side === 1) sideAngle = Math.PI/2;
                else if (side === -1) sideAngle = -Math.PI/2;
                else if (side === 2) sideAngle = Math.PI;

                ctx.rotate(spineAngle + sideAngle);

                const scale = Math.max(0.5, bone.radius / 20);

                ctx.translate(bone.radius * this.game.camera.zoom, 0);

                ctx.fillStyle = '#0ff';
                if(this.selectedPart === 'Spike') ctx.fillStyle = '#f00';
                if(side === 0) ctx.fillStyle = '#ff0';

                ctx.beginPath();
                ctx.arc(0, 0, 10 * scale, 0, Math.PI*2);
                ctx.fill();

                ctx.restore();
                ctx.globalAlpha = 1.0;
            }

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
            ctx.fillText(this.selectedPart[0], this.dragX, this.dragY);
            ctx.restore();
        }
    }
}
