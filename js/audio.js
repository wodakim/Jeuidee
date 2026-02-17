const DRONE_BASE64 = "UklGRiSWAABXQVZFZm10EAAAAAEAAQAAKBwAAFAcAAACABAAZGF0YQCWAAAA"; // Truncated for brevity, normally this would be the full string generated

export default class AudioSystem {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);

        // Reverb / Echo
        this.delay = this.ctx.createDelay();
        this.delay.delayTime.value = 0.1; // 100ms echo
        this.delayFeedback = this.ctx.createGain();
        this.delayFeedback.gain.value = 0.4;
        this.delayFilter = this.ctx.createBiquadFilter();
        this.delayFilter.type = 'lowpass';
        this.delayFilter.frequency.value = 1000; // Dampen echo

        // Routing: Input -> Delay -> Feedback -> Input
        this.delay.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayFilter);
        this.delayFilter.connect(this.delay);

        // Connect Delay to Master (Wet Mix)
        this.delay.connect(this.masterGain);

        // Ambience
        this.ambientBuffer = null;
        this.ambientSource = null;
        this.ambientGain = this.ctx.createGain();
        this.ambientGain.connect(this.masterGain);

        // Start loading the drone immediately
        this.loadDrone();
    }

    async loadDrone() {
        // In a real implementation, we would use the full base64 string.
        // For this environment, we will generate a buffer procedurally if the base64 is too short or invalid,
        // to ensure we have sound.

        // Procedural fallback if needed, or decoding the base64
        // Let's use a procedural buffer for guaranteed "Brian Eno" style without massive strings in code
        const sampleRate = this.ctx.sampleRate;
        const duration = 5.0; // 5 seconds loop
        const frameCount = sampleRate * duration;
        const buffer = this.ctx.createBuffer(2, frameCount, sampleRate);

        const channel0 = buffer.getChannelData(0);
        const channel1 = buffer.getChannelData(1);

        for (let i = 0; i < frameCount; i++) {
            const t = i / sampleRate;
            // Deep drone layer
            let val = Math.sin(2 * Math.PI * 55 * t) * 0.3;
            val += Math.sin(2 * Math.PI * 56 * t) * 0.3; // Beating

            // Texture layer (filtered noise approximation)
            val += (Math.random() - 0.5) * 0.05;

            // Stereo separation
            channel0[i] = val * (0.8 + 0.2 * Math.cos(t * 0.5));
            channel1[i] = val * (0.8 + 0.2 * Math.sin(t * 0.5));
        }

        this.ambientBuffer = buffer;
        this.startAmbient();
    }

    startAmbient() {
        if (!this.ambientBuffer) return;
        if (this.ambientSource) this.ambientSource.stop();

        this.ambientSource = this.ctx.createBufferSource();
        this.ambientSource.buffer = this.ambientBuffer;
        this.ambientSource.loop = true;
        this.ambientSource.connect(this.ambientGain);
        this.ambientSource.start();

        this.ambientGain.gain.value = 0.2; // Background level
    }

    playTone(freq, type, duration, x = 0, y = 0, camera = null) {
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();

        // Spatial Audio Logic
        if (camera) {
            const relX = (x - camera.x);
            const pan = Math.max(-1, Math.min(1, relX / (500 / camera.zoom)));
            panner.pan.value = pan;
        }

        osc.type = type;
        osc.frequency.value = freq;

        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.masterGain);
        panner.connect(this.delay); // Send to reverb

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    }

    playEat(x, y, camera) {
        this.playTone(300 + Math.random() * 200, 'triangle', 0.1, x, y, camera);
        this.playTone(500 + Math.random() * 200, 'sine', 0.15, x, y, camera);
    }

    playDash() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }
}
