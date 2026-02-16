export default class AudioSystem {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterVolume = 0.5;
    }

    playTone(freq, type, duration) {
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playEat() {
        this.playTone(400 + Math.random()*200, 'sine', 0.1);
    }

    playSwim() {
        // Low bubbling noise?
        // Hard with basic osc, maybe filtered noise.
        // For now, simple low blip
        // this.playTone(100, 'triangle', 0.2);
    }
}
