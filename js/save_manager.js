export default class SaveManager {
    constructor(game) {
        this.game = game;
        this.key = 'jelly_evolution_save_v1';
    }

    save() {
        const data = {
            dna: this.game.creature.gameStats.dna,
            mass: this.game.creature.gameStats.mass,
            health: this.game.creature.gameStats.health,
            maxHealth: this.game.creature.gameStats.maxHealth,
            parts: this.game.creature.parts,
            color: this.game.creature.color || '#00ffff' // Default color if not set
        };
        localStorage.setItem(this.key, JSON.stringify(data));
        console.log("Game Saved", data);
    }

    load() {
        const saved = localStorage.getItem(this.key);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.game.creature.gameStats.dna = data.dna || 0;
                this.game.creature.gameStats.mass = data.mass || 10;
                this.game.creature.gameStats.health = data.health || 100;
                this.game.creature.gameStats.maxHealth = data.maxHealth || 100;
                this.game.creature.parts = data.parts || [];
                this.game.creature.color = data.color || '#00ffff';

                // Recalculate stats based on loaded parts
                this.game.creature.stats.calculate(this.game.creature.parts);
                console.log("Game Loaded", data);
                return true;
            } catch (e) {
                console.error("Failed to load save", e);
                return false;
            }
        }
        return false;
    }

    reset() {
        localStorage.removeItem(this.key);
    }
}
