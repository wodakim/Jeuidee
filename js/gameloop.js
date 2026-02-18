import Camera from './camera.js';
import Physics from './physics.js';
import Input from './input.js';
import Editor from './editor.js';
import Enemy from './enemy.js';
import AudioSystem from './audio.js';
import Stats from './stats.js';
import Renderer from './renderer.js';
import SaveManager from './save_manager.js';
import Settings from './settings.js';
import Progression, { PARTS_DB } from './progression.js';
import AssetGenerator from './assets.js';
import BoidManager from './boids.js';
import Debris from './debris.js';
import Lighting from './lighting.js';
import BiomeManager from './biomes.js';
import LegacyManager, { LEGACY_UPGRADES } from './legacy.js';
import Social from './social.js';
import SkillManager from './skills.js';
import Distortion from './distortion.js';
import Boss from './boss.js';
import Sonar from './sonar.js';
import Ally from './ally.js';

import StateMachine from './state_machine.js';
import MenuState from './states/menu_state.js';
import PlayState from './states/play_state.js';
import GameOverState from './states/gameover_state.js';
import IntroState from './states/intro.js';
import GenesisState from './states/genesis_state.js';

class GameLoop {
    constructor() {
        this.running = false;
        this.lastTime = 0;
        this.fps = 60;
        this.step = 1 / this.fps;

        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 0;
        this.height = 0;

        this.input = new Input();
        this.physics = new Physics();
        this.camera = new Camera(window.innerWidth, window.innerHeight);
        this.settings = new Settings();
        this.audio = new AudioSystem();
        this.lighting = new Lighting(this.canvas, this.settings);
        this.renderer = new Renderer(this.ctx, this.camera, this.settings);

        // --- JELLY CREATURE (Soft Body) ---
        this.creature = {
            points: [],
            constraints: [],
            parts: [],
            stats: new Stats(),
            gameStats: { dna: 0, mass: 10, health: 100, maxHealth: 100 },
            color: '#00ffff'
        };

        this.saveManager = new SaveManager(this);
        this.progression = new Progression(this.saveManager);
        this.legacyManager = new LegacyManager();
        this.assets = new AssetGenerator();
        this.boidManager = new BoidManager(this.physics);
        this.biomeManager = new BiomeManager(this);
        this.headAngle = 0;
        this.editor = new Editor(this);
        this.skillManager = new SkillManager(this);
        this.distortion = new Distortion(this.canvas, this.settings);
        this.sonar = new Sonar(this);

        // Ecosystem
        this.bgAbyssal = [];
        this.bgRays = { angle: 0 };
        this.bgDeep = [];
        this.bgMid = [];
        this.bgFore = [];

        this.enemies = [];
        this.allies = [];
        this.food = [];
        this.debris = [];
        this.particles = [];
        this.hitstop = 0;
        this.bossActive = false;
        this.mate = null;

        // State Machine
        this.stateMachine = new StateMachine(this);
        this.stateMachine.add('menu', new MenuState(this));
        this.stateMachine.add('playing', new PlayState(this));
        this.stateMachine.add('gameover', new GameOverState(this));
        this.stateMachine.add('intro', new IntroState(this));
        this.stateMachine.add('genesis', new GenesisState(this));

        // UI Layers
        this.createUI();

        // State Machine
        this.stateMachine = new StateMachine(this);
        this.stateMachine.add('menu', new MenuState(this));
        this.stateMachine.add('playing', new PlayState(this));
        this.stateMachine.add('gameover', new GameOverState(this));
        this.stateMachine.add('intro', new IntroState(this));
        this.stateMachine.add('genesis', new GenesisState(this));

        this.init();
    }

    createUI() {
        // AD SPACE
        const adSpace = document.createElement('div');
        adSpace.id = 'ad-space';
        adSpace.style = `position:absolute; bottom:0; left:0; width:100%; height:50px; background:rgba(0,0,0,0.8); display:flex; justify-content:center; align-items:center; z-index:1000; color:#444; font-family:Orbitron; pointer-events:none; border-top:1px solid #333;`;
        adSpace.innerText = 'AD SPACE';
        document.body.appendChild(adSpace);

        // Main Menu
        const menu = document.createElement('div');
        menu.id = 'main-menu';
        menu.style = 'display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.4); z-index:100; flex-direction:column; justify-content:center; align-items:center;';
        menu.innerHTML = `
            <h1>NEON ABYSS</h1>
            <div style="margin-top:20px; display:flex; flex-direction:column; gap:10px;">
                <button id="play-btn" class="btn-neon">Start Journey</button>
                <button id="legacy-btn" class="btn-neon" style="border-color:#f0f; color:#f0f;">ANCESTRAL MEMORY</button>
                <button id="settings-btn" class="btn-neon" style="font-size:1rem; border-color:#888; color:#888;">SETTINGS</button>
            </div>
            <p style="margin-top:20px; font-size:0.8em; opacity:0.7;">Touch & Drag to Move</p>
        `;
        document.body.appendChild(menu);

        // Legacy Menu
        const legacyMenu = document.createElement('div');
        legacyMenu.id = 'legacy-menu';
        legacyMenu.style = 'display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:200; flex-direction:column; align-items:center; padding:20px; box-sizing:border-box; overflow-y:auto;';
        document.body.appendChild(legacyMenu);

        // Settings Menu
        const settingsMenu = document.createElement('div');
        settingsMenu.id = 'settings-menu';
        settingsMenu.style = 'display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:200; flex-direction:column; justify-content:center; align-items:center;';
        settingsMenu.innerHTML = `
            <h2 style="font-family:Orbitron; color:#0ff;">SETTINGS</h2>
            <div style="display:flex; flex-direction:column; gap:15px;">
                <button id="toggle-fx-btn" class="btn-neon">FX: ON</button>
                <button id="toggle-audio-btn" class="btn-neon">AUDIO: ON</button>
                <button id="export-btn" class="btn-neon" style="border-color:#ff0; color:#ff0;">EXPORT DNA</button>
                <button id="import-btn" class="btn-neon" style="border-color:#ff0; color:#ff0;">IMPORT RIVAL</button>
                <button id="reset-save-btn" class="btn-neon btn-danger">RESET SAVE</button>
                <button id="back-btn" class="btn-neon" style="margin-top:20px;">BACK</button>
            </div>
        `;
        document.body.appendChild(settingsMenu);

        // Pause Menu
        const pauseMenu = document.createElement('div');
        pauseMenu.id = 'pause-menu';
        pauseMenu.style = 'display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:200; flex-direction:column; justify-content:center; align-items:center;';
        pauseMenu.innerHTML = `
            <h2 style="font-family:Orbitron; color:#0ff;">PAUSED</h2>
            <div style="display:flex; flex-direction:column; gap:15px;">
                <button id="resume-btn" class="btn-neon">RESUME</button>
                <button id="pause-fx-btn" class="btn-neon">FX: ON</button>
                <button id="pause-audio-btn" class="btn-neon">AUDIO: ON</button>
                <button id="quit-btn" class="btn-neon btn-danger">MAIN MENU</button>
            </div>
        `;
        document.body.appendChild(pauseMenu);

        // Game Over Screen
        const gameOver = document.createElement('div');
        gameOver.id = 'game-over';
        gameOver.style = 'display:none';
        gameOver.innerHTML = `
            <h1 style="color:var(--danger); text-shadow:0 0 20px var(--danger);">EXTINCT</h1>
            <div style="margin-top:20px;">
                <button id="respawn-btn" class="btn-neon btn-danger">REBIRTH</button>
            </div>
        `;
        document.body.appendChild(gameOver);

        // Unlock Overlay
        const unlockOverlay = document.createElement('div');
        unlockOverlay.id = 'unlock-overlay';
        unlockOverlay.style = `display:none; position:absolute; top:0; left:0; width:100%; height:100%; z-index:500; align-items:center; justify-content:center;`;
        document.body.appendChild(unlockOverlay);

        // HUD
        const hud = document.createElement('div');
        hud.id = 'game-hud';
        hud.style = `position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:90;`;
        hud.innerHTML = `
            <button id="pause-trigger-btn" style="position:absolute; top:20px; left:20px; pointer-events:auto; background:rgba(0,0,0,0.5); border:1px solid #0ff; color:#0ff; border-radius:50%; width:40px; height:40px; font-weight:bold; cursor:pointer;">II</button>
            <button id="sonar-btn" style="position:absolute; bottom:80px; right:20px; pointer-events:auto; background:rgba(0,0,0,0.5); border:2px solid #0ff; color:#0ff; border-radius:50%; width:60px; height:60px; font-weight:bold; cursor:pointer; box-shadow:0 0 10px #0ff; display:flex; justify-content:center; align-items:center; font-size:24px;">((•))</button>
            <button id="evolve-btn" style="display:none; position:absolute; top:20px; right:20px; pointer-events:auto; padding:10px 20px; background:linear-gradient(45deg, #f0f, #00f); border:none; border-radius:20px; font-family:Orbitron; font-weight:bold; color:#fff; cursor:pointer; box-shadow:0 0 10px #f0f;">EVOLVE (10 DNA)</button>
        `;
        document.body.appendChild(hud);

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('play-btn').onclick = () => this.startIntro();
        document.getElementById('settings-btn').onclick = () => {
            document.getElementById('main-menu').style.display = 'none';
            document.getElementById('settings-menu').style.display = 'flex';
            this.updateSettingsButtons();
        };
        document.getElementById('legacy-btn').onclick = () => this.openLegacyMenu();
        document.getElementById('back-btn').onclick = () => {
            document.getElementById('settings-menu').style.display = 'none';
            document.getElementById('main-menu').style.display = 'flex';
        };
        document.getElementById('reset-save-btn').onclick = () => {
            if(confirm('Reset all progress?')) {
                this.saveManager.reset();
                location.reload();
            }
        };
        document.getElementById('toggle-fx-btn').onclick = () => this.toggleFX();
        document.getElementById('toggle-audio-btn').onclick = () => this.toggleAudio();
        document.getElementById('export-btn').onclick = () => {
            const code = Social.exportCreature(this.creature);
            Social.copyToClipboard(code);
        };
        document.getElementById('import-btn').onclick = () => {
            const code = prompt("Paste Rival DNA:");
            if(code) this.spawnRival(code);
        };
        document.getElementById('pause-trigger-btn').onclick = () => this.pauseGame();
        document.getElementById('respawn-btn').onclick = () => this.respawn();
        document.getElementById('evolve-btn').onclick = () => {
            this.editor.toggle(true);
            document.getElementById('evolve-btn').style.display = 'none';
        };
        document.getElementById('resume-btn').onclick = () => this.resumeGame();
        document.getElementById('quit-btn').onclick = () => {
            document.getElementById('pause-menu').style.display = 'none';
            document.getElementById('main-menu').style.display = 'flex';
            document.getElementById('game-hud').style.display = 'none';
            this.stateMachine.change('menu');
        };
        document.getElementById('pause-fx-btn').onclick = () => this.toggleFX();
        document.getElementById('pause-audio-btn').onclick = () => this.toggleAudio();
        document.getElementById('sonar-btn').onclick = () => {
             if(this.sonar.activate()) {
                 const btn = document.getElementById('sonar-btn');
                 btn.style.opacity = 0.5;
                 setTimeout(() => btn.style.opacity = 1.0, 5000);
             }
        };

        // Unlock Card Click to continue
        document.getElementById('unlock-overlay').onclick = () => {
            document.getElementById('unlock-overlay').style.display = 'none';
            this.resumeGame();
        };
    }

    triggerUnlock(partKey) {
        if (this.progression.unlock(partKey)) {
            this.pauseGame(true); // True = Unlock Mode
            // Haptic Pattern
            if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);

            const overlay = document.getElementById('unlock-overlay');
            const part = PARTS_DB[partKey];
            overlay.innerHTML = `
                <div class="unlock-card">
                    <h2 style="color:#0ff; margin-bottom:10px;">EVOLUTION UNLOCKED</h2>
                    <div class="unlock-icon">${partKey[0]}</div>
                    <h1 style="font-size:2rem; margin:10px 0;">${part.name}</h1>
                    <p style="color:#aaa; font-size:0.9rem;">${part.desc}</p>
                    <div style="margin-top:20px; color:#0f0; font-weight:bold;">${part.stat}</div>
                    <div style="margin-top:20px; font-size:0.8rem; animation:pulse 1s infinite;">TAP TO CONTINUE</div>
                </div>
            `;
            overlay.style.display = 'flex';
            if (this.settings.audioEnabled) this.audio.playTone(400, 'sine', 0.5); // Victory sound
        }
    }

    toggleFX() {
        if (!this.settings.fxEnabled) {
             if(confirm("WARNING: High Performance Required.\nEnable advanced visual effects? (Battery Drain / Lag possible)")) {
                 this.settings.toggleFX();
             }
        } else {
             this.settings.toggleFX();
        }
        this.updateSettingsButtons();
    }

    toggleAudio() {
        const state = this.settings.toggleAudio();
        this.updateSettingsButtons();
        if(state) this.audio.resume();
        else this.audio.ctx.suspend();
    }

    updateSettingsButtons() {
        const fxText = `FX: ${this.settings.fxEnabled ? 'ON' : 'OFF'}`;
        const audioText = `AUDIO: ${this.settings.audioEnabled ? 'ON' : 'OFF'}`;

        document.getElementById('toggle-fx-btn').innerText = fxText;
        document.getElementById('toggle-audio-btn').innerText = audioText;
        document.getElementById('pause-fx-btn').innerText = fxText;
        document.getElementById('pause-audio-btn').innerText = audioText;
    }

    openLegacyMenu() {
        const menu = document.getElementById('legacy-menu');
        menu.style.display = 'flex';
        document.getElementById('main-menu').style.display = 'none';
        this.renderLegacyUI();
    }

    renderLegacyUI() {
        const menu = document.getElementById('legacy-menu');
        const dna = this.legacyManager.legacyDNA;

        let html = `
            <h1 style="color:#f0f; font-family:Orbitron;">ANCESTRAL MEMORY</h1>
            <h3 style="color:#fff;">LEGACY DNA: ${dna}</h3>
            <div class="upgrade-grid" style="display:flex; flex-wrap:wrap; gap:20px; justify-content:center; width:100%; max-width:600px;">
        `;

        for (const [key, up] of Object.entries(LEGACY_UPGRADES)) {
            const level = this.legacyManager.upgrades[key] || 0;
            const cost = up.cost * (level + 1);
            const isMax = level >= up.max;
            const canAfford = dna >= cost && !isMax;

            html += `
                <div class="upgrade-card" style="border:1px solid #f0f; padding:15px; width:250px; background:rgba(20,0,20,0.8); text-align:left;">
                    <h3 style="color:#f0f; margin:0;">${up.name}</h3>
                    <p style="color:#aaa; font-size:0.8rem;">${up.desc}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                        <span style="color:#fff;">Lvl ${level}/${up.max}</span>
                        <button onclick="game.buyLegacy('${key}')"
                            style="padding:5px 10px; background:${canAfford ? '#f0f' : '#444'}; border:none; color:#fff; cursor:${canAfford ? 'pointer' : 'default'};">
                            ${isMax ? 'MAX' : cost + ' DNA'}
                        </button>
                    </div>
                </div>
            `;
        }

        html += `</div>
            <button id="legacy-back-btn" class="btn-neon" style="margin-top:30px;">BACK</button>
        `;

        menu.innerHTML = html;

        document.getElementById('legacy-back-btn').onclick = () => {
            menu.style.display = 'none';
            document.getElementById('main-menu').style.display = 'flex';
        };
    }

    buyLegacy(key) {
        if (this.legacyManager.buyUpgrade(key)) {
            if(navigator.vibrate) navigator.vibrate([50, 50]);
            this.renderLegacyUI(); // Refresh
        } else {
            if(navigator.vibrate) navigator.vibrate(200); // Error
        }
    }

    pauseGame(isUnlock = false) {
        if (this.stateMachine.currentState instanceof PlayState) {
            this.stateMachine.currentState.paused = true;
            if (!isUnlock) {
                document.getElementById('pause-menu').style.display = 'flex';
                this.updateSettingsButtons();
            }
        }
    }

    resumeGame() {
        if (this.stateMachine.currentState instanceof PlayState) {
            this.stateMachine.currentState.paused = false;
            document.getElementById('pause-menu').style.display = 'none';
        }
    }

    startIntro() {
        this.stateMachine.change('intro');
        if (this.settings.audioEnabled) this.audio.ctx.resume();
    }

    startGame() {
        this.stateMachine.change('playing', { load: true });
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.resetCreature();
        this.saveManager.load();
        this.initBackground();
        this.spawnEnemies();
        this.spawnFood(50);
        document.getElementById('game-hud').style.display = 'none';

        // Start in Menu
        this.stateMachine.change('menu');
        this.start();

        setInterval(() => {
            if (this.stateMachine.currentState instanceof PlayState) this.saveManager.save();
        }, 30000);
    }

    resetCreature() {
        this.creature.points = [];
        this.creature.constraints = [];
        this.creature.gameStats = this.creature.gameStats || { dna: 0, mass: 10, health: 100, maxHealth: 100 };
        this.headAngle = 0;

        const spineLength = 3;
        const startX = 0;
        const startY = 0;
        const sizes = [25, 20, 15];

        for (let i = 0; i < spineLength; i++) {
            const baseRad = sizes[i];
            const p = Physics.createPoint(startX, startY + i * 30, baseRad, 1);
            p.baseRadius = baseRad;
            p.initialBaseRadius = baseRad;
            p.scaleFactor = 1.0;
            this.creature.points.push(p);

            if (i > 0) {
                const prev = this.creature.points[i - 1];
                const link = Physics.createConstraint(prev, p, 0.5, 25);
                link.baseLength = 25;
                this.creature.constraints.push(link);
            }
        }
        this.creature.stats.calculate(this.creature.parts, this.legacyManager.getBuffs());
    }

    respawn() {
        // RESPAWN NOW LOADS LAST CHECKPOINT
        if (this.saveManager.load()) {
            this.creature.gameStats.health = this.creature.gameStats.maxHealth;
            // Maybe apply some penalty? Or just simple checkpoint reload
            document.getElementById('game-over').style.display = 'none';
            this.stateMachine.change('playing');
        } else {
            // Full Reset if no save
            const earned = this.legacyManager.convertMassToLegacy(this.creature.gameStats.mass);
            alert(`Extinction Event.\nAncestral DNA Gained: ${earned}`);
            document.getElementById('game-over').style.display = 'none';
            this.resetCreature();
            this.saveManager.reset(); // Clear corrupt/bad save?
            this.stateMachine.change('menu');
        }
    }

    spawnMate() {
        const head = this.creature.points[0];
        const angle = Math.random() * Math.PI * 2;
        const dist = 800;
        const x = head.x + Math.cos(angle) * dist;
        const y = head.y + Math.sin(angle) * dist;

        const mate = new Enemy(x, y, 10, this.physics, 'hunter');
        mate.type = 'mate';
        mate.color = '#ff69b4';
        mate.behavior = 'idle'; // Just floats
        // Remove parts for simple look
        mate.parts = [];
        // Or give it some default parts?

        this.mate = mate;
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        const adHeight = 50;
        this.height -= adHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.camera.resize(this.width, this.height);
        if (this.lighting) this.lighting.resize(this.width, this.height);
    }

    spawnFood(count) {
        const head = this.creature.points[0];
        const center = head ? {x: head.x, y: head.y} : {x:0, y:0};

        for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 500 + Math.random() * 2000;
            this.food.push({
                x: center.x + Math.cos(angle) * dist,
                y: center.y + Math.sin(angle) * dist,
                radius: 5,
                color: '#0f0'
            });
        }
    }

    spawnMeat(x, y, count) {
        for(let i=0; i<count; i++) {
            this.food.push({
                x: x + (Math.random()-0.5)*50,
                y: y + (Math.random()-0.5)*50,
                radius: 8,
                color: '#ff4444',
                type: 'meat',
                dnaValue: 5
            });
        }
    }

    spawnAlly(data, x, y) {
        this.allies = [];
        const offsetX = (Math.random() - 0.5) * 50;
        const offsetY = (Math.random() - 0.5) * 50;
        const ally = new Ally(data, x + offsetX, y + offsetY, this.physics);
        this.allies.push(ally);
        this.spawnParticles(x, y, '#00ffff', 20, 300);
        if(this.settings.audioEnabled) this.audio.playTone(600, 'sine', 1.0);
    }

    spawnRival(code) {
        const data = Social.importCreature(code);
        if (!data) { alert("Invalid DNA"); return; }
        const head = this.creature.points[0];
        const dist = 1000;
        const angle = Math.random() * Math.PI * 2;
        const x = head.x + Math.cos(angle) * dist;
        const y = head.y + Math.sin(angle) * dist;
        const rival = new Enemy(x, y, 10, this.physics, 'titan');
        rival.parts = data.parts;
        rival.color = data.color;
        rival.stats.calculate(rival.parts);
        rival.health = 500; rival.maxHealth = 500;
        rival.active = true;
        this.enemies.push(rival);
        alert("RIVAL DETECTED: A new apex predator has entered the ecosystem.");
    }

    spawnEnemies() {
        const targetCount = 12 + Math.floor(this.creature.gameStats.mass / 50);
        if (this.enemies.length >= targetCount) return;

        const playerScale = Math.sqrt(this.creature.gameStats.mass / 10);
        const playerX = this.creature.points[0] ? this.creature.points[0].x : 0;
        const playerY = this.creature.points[0] ? this.creature.points[0].y : 0;

        if (this.creature.gameStats.mass > 2000 && !this.bossActive && Math.random() < 0.0005) {
             this.spawnBoss('Leviathan');
             return;
        }

        const currentBiome = this.biomeManager.getCurrentBiome(playerX, playerY);
        const difficulty = Math.max(1, playerScale + (Math.random()-0.5)*2);
        const minSpawn = 1200;
        const maxSpawn = 2500;
        const spawnDist = minSpawn + Math.random() * (maxSpawn - minSpawn);
        const angle = Math.random() * Math.PI * 2;
        const ex = playerX + Math.cos(angle) * spawnDist;
        const ey = playerY + Math.sin(angle) * spawnDist;
        const type = currentBiome.enemyTypes[Math.floor(Math.random() * currentBiome.enemyTypes.length)];

        if (type === 'titan') {
             this.enemies.push(new Enemy(ex, ey, difficulty * 1.5, this.physics, 'titan'));
        } else if (type === 'grazer') {
             const flockSize = 3 + Math.floor(Math.random() * 4);
             const flock = this.boidManager.createFlock(ex, ey, flockSize, difficulty, 'grazer');
             this.enemies.push(...flock);
        } else {
             this.enemies.push(new Enemy(ex, ey, difficulty, this.physics, 'hunter'));
        }
    }

    spawnBoss(type) {
        const head = this.creature.points[0];
        const angle = Math.random() * Math.PI * 2;
        const dist = 1500;
        const x = head.x + Math.cos(angle) * dist;
        const y = head.y + Math.sin(angle) * dist;
        const boss = new Boss(x, y, type, this.physics, this);
        this.enemies.push(boss);
        this.bossActive = true;
        this.distortion.addShockwave(head.x, head.y);
        if(this.settings.audioEnabled) this.audio.playTone(50, 'sawtooth', 3.0);
        const warning = document.createElement('div');
        warning.style = "position:absolute; top:20%; width:100%; text-align:center; color:red; font-size:2rem; font-family:Orbitron; animation:pulse 0.5s infinite;";
        warning.innerText = `WARNING: ${type.toUpperCase()} DETECTED`;
        document.body.appendChild(warning);
        setTimeout(() => warning.remove(), 4000);
    }

    initBackground() {
        this.bgAbyssal = []; this.bgDeep = []; this.bgMid = []; this.bgFore = [];
        for(let i=0; i<6; i++) {
            this.bgAbyssal.push({
                type: i % 2 === 0 ? 'giant_worm' : 'giant_jelly',
                x: (Math.random() - 0.5) * 8000,
                y: (Math.random() - 0.5) * 8000,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 5,
                scale: 2 + Math.random() * 2,
                angle: Math.random() * Math.PI * 2
            });
        }
        for(let i=0; i<100; i++) this.bgDeep.push({ x: (Math.random() - 0.5) * 6000, y: (Math.random() - 0.5) * 6000, r: Math.random() * 4 + 2, alpha: Math.random() * 0.2 });
        for(let i=0; i<200; i++) this.bgMid.push({ x: (Math.random() - 0.5) * 4000, y: (Math.random() - 0.5) * 4000, r: Math.random() * 3, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, alpha: Math.random() * 0.3 });
        for(let i=0; i<50; i++) this.bgFore.push({ x: (Math.random() - 0.5) * 3000, y: (Math.random() - 0.5) * 3000, r: Math.random() * 2, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, alpha: Math.random() * 0.5 + 0.2 });
    }

    start() {
        if (!this.running) {
            this.running = true;
            this.lastTime = performance.now();
            requestAnimationFrame((t) => this.loop(t));
        }
    }

    loop(timestamp) {
        if (!this.running) return;
        let dt = (timestamp - this.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;
        this.lastTime = timestamp;

        if (this.hitstop > 0) {
            this.hitstop -= dt;
            this.stateMachine.render(this.ctx); // Use state machine render
            requestAnimationFrame((t) => this.loop(t));
            return;
        }

        this.stateMachine.update(dt);
        this.stateMachine.render(this.ctx);

        requestAnimationFrame((t) => this.loop(t));
    }

    updateBackgroundOnly(dt) {
        this.bgRays.angle += dt * 0.05;
        this.bgAbyssal.forEach(g => { g.x += g.vx * dt; g.y += g.vy * dt; g.angle += dt * 0.01; });
        this.bgMid.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; });
        this.bgFore.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; });
    }

    renderBackgroundLayers(ctx) {
        // --- LAYER 0: GOD RAYS (Parallax 0.0) ---
        if (this.settings.fxEnabled) {
            const rays = this.assets.get('god_rays');
            ctx.save();
            ctx.translate(this.width/2, this.height/2);
            ctx.rotate(this.bgRays.angle);
            ctx.scale(3, 3);
            ctx.translate(-400, -400); // Center image
            ctx.drawImage(rays, 0, 0);
            ctx.restore();
        }

        // --- LAYER 1: ABYSSAL GIANTS (Parallax 0.05) ---
        ctx.save();
        ctx.translate(this.width/2, this.height/2);
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.translate(-this.camera.x * 0.05, -this.camera.y * 0.05);

        this.bgAbyssal.forEach(g => {
            const sprite = this.assets.get(g.type);
            ctx.save();
            ctx.translate(g.x, g.y);
            ctx.rotate(g.angle);
            ctx.scale(g.scale, g.scale);
            ctx.drawImage(sprite, -sprite.width/2, -sprite.height/2);
            ctx.restore();
        });
        ctx.restore();

        // --- LAYER 2: DEEP PARTICLES (Parallax 0.1) ---
        ctx.save();
        ctx.translate(this.width/2, this.height/2);
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.translate(-this.camera.x * 0.1, -this.camera.y * 0.1);
        ctx.fillStyle = '#fff';
        this.bgDeep.forEach(p => { ctx.globalAlpha = p.alpha; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });
        ctx.restore();

        // --- LAYER 3: MID PARTICLES (Parallax 0.5) ---
        ctx.save();
        ctx.translate(this.width/2, this.height/2);
        ctx.scale(this.camera.zoom, this.camera.zoom);
        ctx.translate(-this.camera.x * 0.5, -this.camera.y * 0.5);
        ctx.fillStyle = '#aaffff';
        this.bgMid.forEach(p => { ctx.globalAlpha = p.alpha; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });
        ctx.restore();
    }

    resolveCombat(player, enemy) {
        let result = { hit: false, playerHit: false, enemyHit: false };

        const weaponParts = player.parts.filter(p => p.type === 'Spike' || p.type === 'Jaws' || p.type === 'Poison');
        for (let part of weaponParts) {
            const bone = player.points[part.boneIndex];
            if (!bone) continue;
            const range = bone.radius + 20;

            for (let ePoint of enemy.points) {
                const dist = Math.hypot(bone.x - ePoint.x, bone.y - ePoint.y);
                if (dist < range + ePoint.radius) {
                    result.hit = true;
                    result.enemyHit = true;
                    const angle = Math.atan2(ePoint.y - bone.y, ePoint.x - bone.x);
                    ePoint.x += Math.cos(angle) * 10;
                    ePoint.y += Math.sin(angle) * 10;
                    break;
                }
            }
            if (result.enemyHit) break;
        }

        const enemyWeapons = enemy.parts.filter(p => p.type === 'Spike' || p.type === 'Jaws');
        for (let part of enemyWeapons) {
            const bone = enemy.points[part.boneIndex];
            if (!bone) continue;
            const range = bone.radius + 20;

            for (let pPoint of player.points) {
                const dist = Math.hypot(bone.x - pPoint.x, bone.y - pPoint.y);
                if (dist < range + pPoint.radius) {
                    result.hit = true;
                    result.playerHit = true;
                    const angle = Math.atan2(pPoint.y - bone.y, pPoint.x - bone.x);
                    pPoint.x += Math.cos(angle) * 10;
                    pPoint.y += Math.sin(angle) * 10;
                    break;
                }
            }
            if (result.playerHit) break;
        }

        return result;
    }

    spawnParticles(x, y, color, count, speedVar = 100) {
        if (this.particles.length > 50) return;
        for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * speedVar;
            this.particles.push({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.3 + Math.random() * 0.2, color: color, radius: Math.random() * 4 + 1 });
        }
    }

    drawHUD() {
        const dna = Math.floor(this.creature.gameStats.dna);
        const x = this.width / 2;
        const y = 40;

        this.ctx.save();
        this.ctx.translate(x, y);

        const time = Date.now() * 0.002;
        this.ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
        this.ctx.strokeStyle = '#0ff';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        for (let i = 0; i <= Math.PI * 2; i += 0.1) {
            const r = 30 + Math.sin(i * 5 + time) * 2 + Math.cos(i * 3 - time) * 2;
            const px = Math.cos(i) * r * 1.5;
            const py = Math.sin(i) * r;
            if (i === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 20px Orbitron, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = '#0ff';
        this.ctx.shadowBlur = 10;
        this.ctx.fillText(`DNA: ${dna}`, 0, 0);
        this.ctx.shadowBlur = 0;

        this.ctx.restore();
    }
}

window.game = new GameLoop();
