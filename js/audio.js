export default class AudioSystem {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.6;
        this.masterGain.connect(this.ctx.destination);

        // --- FX CHAIN ---
        // 1. Reverb (Convolver) - Generates "Space"
        this.reverb = this.ctx.createConvolver();
        this.reverb.buffer = this.createImpulseResponse(3.0, 2.0); // 3s decay
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = 0.4; // Wet mix

        // 2. Delay (Echo) - Generates "Distance"
        this.delay = this.ctx.createDelay();
        this.delay.delayTime.value = 0.5;
        this.delayFeedback = this.ctx.createGain();
        this.delayFeedback.gain.value = 0.4;

        // Filter feedback to simulate absorption
        this.delayFilter = this.ctx.createBiquadFilter();
        this.delayFilter.type = 'lowpass';
        this.delayFilter.frequency.value = 800;

        this.delay.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayFilter);
        this.delayFilter.connect(this.delay);

        // Master FX Bus
        this.delay.connect(this.reverb);
        this.reverb.connect(this.masterGain);
        this.delay.connect(this.masterGain); // Dry echo

        // --- MUSIC GENERATOR ---
        this.scale = [196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // G Major Pentatonic approx (G, A, C, D, E)
        // Or deeper: C Minor Pentatonic: C2, Eb2, F2, G2, Bb2
        this.deepScale = [65.41, 77.78, 87.31, 98.00, 116.54, 130.81]; // Low C Minor

        this.nextNoteTime = 0;
        this.isPlaying = false;

        // Start Loop
        this.scheduleNextNote();
    }

    createImpulseResponse(duration, decay) {
        const rate = this.ctx.sampleRate;
        const length = rate * duration;
        const impulse = this.ctx.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            // White noise with exponential decay
            const n = i / length;
            const env = Math.pow(1 - n, decay);
            left[i] = (Math.random() * 2 - 1) * env;
            right[i] = (Math.random() * 2 - 1) * env;
        }
        return impulse;
    }

    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.isPlaying = true;
    }

    scheduleNextNote() {
        if (!this.isPlaying) {
             requestAnimationFrame(() => this.scheduleNextNote());
             return;
        }

        const now = this.ctx.currentTime;
        if (now >= this.nextNoteTime) {
            // Play a note
            this.playProceduralNote();
            // Schedule next (Random interval 2s - 6s)
            this.nextNoteTime = now + 2 + Math.random() * 4;
        }
        requestAnimationFrame(() => this.scheduleNextNote());
    }

    playProceduralNote() {
        // Pick random note from Deep Scale
        const freq = this.deepScale[Math.floor(Math.random() * this.deepScale.length)];

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = Math.random() > 0.5 ? 'sine' : 'triangle';
        osc.frequency.value = freq;

        // Random Detune for "organic" feel
        osc.detune.value = (Math.random() - 0.5) * 20;

        // Envelope (Pad style: Slow attack, long release)
        const attack = 2 + Math.random() * 2;
        const release = 4 + Math.random() * 4;
        const now = this.ctx.currentTime;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + attack); // Quiet volume
        gain.gain.exponentialRampToValueAtTime(0.001, now + attack + release);

        // Connections
        osc.connect(gain);
        gain.connect(this.reverb); // Send to reverb
        gain.connect(this.delay); // Send to delay

        osc.start(now);
        osc.stop(now + attack + release + 1);
    }

    startAmbient() {
        this.resume();
        if (!this.droneOsc) {
            // Deep Drone
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = 32.70; // C1 (Deep Sub)

            const gain = this.ctx.createGain();
            gain.gain.value = 0.2;

            // LFO for movement
            const lfo = this.ctx.createOscillator();
            lfo.frequency.value = 0.1; // Very slow
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 10; // +/- 10Hz modulation? No, maybe amplitude.
            // Let's modulate filter instead? Or just gain.

            // Amplitude Modulation
            const ampLfo = this.ctx.createOscillator();
            ampLfo.frequency.value = 0.05;
            const ampGain = this.ctx.createGain();
            ampGain.gain.value = 0.1;

            ampLfo.connect(ampGain);
            ampGain.connect(gain.gain);

            osc.connect(gain);
            gain.connect(this.masterGain); // Direct sub bass

            osc.start();
            lfo.start();
            ampLfo.start();

            this.droneOsc = osc;
        }
    }

    playTone(freq, type, duration = 0.1, x = 0, y = 0, camera = null) {
        if (this.ctx.state === 'suspended') return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();

        if (camera) {
            // Normalize X (-1 to 1) based on screen position
            const screenX = (x - camera.x) * camera.zoom;
            // Visible width approx game.width/2
            const pan = Math.max(-1, Math.min(1, screenX / (window.innerWidth/2)));
            panner.pan.value = pan;
        }

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        // Pitch slide for "liquid" feel?
        osc.frequency.exponentialRampToValueAtTime(freq * 0.8, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.masterGain);
        panner.connect(this.reverb); // Send FX

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    }

    playEat() {
        // High pitched "bloop"
        this.playTone(800 + Math.random()*200, 'sine', 0.1);
    }

    playDash() {
        // Filtered Noise Burst
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.2;
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        gain.connect(this.reverb);

        noise.start();
    }
}
