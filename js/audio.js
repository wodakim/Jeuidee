export default class AudioSystem {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);

        // Reverb / Echo
        this.delay = this.ctx.createDelay();
        this.delay.delayTime.value = 0.3; // 300ms echo
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
        this.droneOsc = null;
        this.startDrone();
    }

    startDrone() {
        // Deep Sea Drone (Low sine + modulation)
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 50;

        const mod = this.ctx.createOscillator();
        mod.type = 'sine';
        mod.frequency.value = 0.1; // Slow throb

        const modGain = this.ctx.createGain();
        modGain.gain.value = 10;

        mod.connect(modGain);
        modGain.connect(osc.frequency);

        const gain = this.ctx.createGain();
        gain.gain.value = 0.1; // Quiet

        osc.connect(gain);
        gain.connect(this.masterGain); // Direct to master, no reverb for clean bass

        osc.start();
        mod.start();

        this.droneOsc = { osc, mod, gain };
    }

    playTone(freq, type, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.value = freq;

        osc.connect(gain);
        gain.connect(this.masterGain);
        gain.connect(this.delay); // Send to reverb

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    }

    playEat() {
        this.playTone(300 + Math.random() * 200, 'triangle', 0.1);
        this.playTone(500 + Math.random() * 200, 'sine', 0.15);
    }

    playDash() {
        // White noise burst for dash?
        // Simple sweep
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
