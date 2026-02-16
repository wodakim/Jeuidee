export default class Settings {
    constructor() {
        this.fxEnabled = true;
        this.audioEnabled = true;
        this.load();
    }

    load() {
        const data = localStorage.getItem('jelly_settings');
        if (data) {
            const parsed = JSON.parse(data);
            this.fxEnabled = parsed.fxEnabled;
            this.audioEnabled = parsed.audioEnabled;
        }
    }

    save() {
        localStorage.setItem('jelly_settings', JSON.stringify({
            fxEnabled: this.fxEnabled,
            audioEnabled: this.audioEnabled
        }));
    }

    toggleFX() {
        this.fxEnabled = !this.fxEnabled;
        this.save();
        return this.fxEnabled;
    }

    toggleAudio() {
        this.audioEnabled = !this.audioEnabled;
        this.save();
        return this.audioEnabled;
    }
}
