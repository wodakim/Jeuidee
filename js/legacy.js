// Legacy System (Roguelite Progression)

const LEGACY_UPGRADES = {
    'StartSize': { name: 'Cell Division', desc: 'Start with more mass.', cost: 100, max: 5 },
    'Speed': { name: 'Flagella Boost', desc: 'Permanent +5% Speed.', cost: 150, max: 10 },
    'Vision': { name: 'Compound Eyes', desc: 'Permanent +10% View Distance.', cost: 200, max: 5 },
    'Efficiency': { name: 'Metabolism', desc: 'Food gives +10% more DNA.', cost: 300, max: 5 }
};

export default class LegacyManager {
    constructor() {
        this.legacyDNA = 0;
        this.upgrades = {};
        this.load();
    }

    load() {
        const saved = localStorage.getItem('jelly_legacy');
        if (saved) {
            const data = JSON.parse(saved);
            this.legacyDNA = data.dna || 0;
            this.upgrades = data.upgrades || {};
        }
    }

    save() {
        localStorage.setItem('jelly_legacy', JSON.stringify({
            dna: this.legacyDNA,
            upgrades: this.upgrades
        }));
    }

    // Called on Death
    convertMassToLegacy(mass) {
        // Exchange Rate: 10 Mass = 1 Legacy DNA
        const earned = Math.floor(mass / 10);
        this.legacyDNA += earned;
        this.save();
        return earned;
    }

    buyUpgrade(key) {
        const up = LEGACY_UPGRADES[key];
        if (!up) return false;

        const currentLevel = this.upgrades[key] || 0;
        if (currentLevel >= up.max) return false;

        // Cost Scaling: Base * (Level + 1)
        const cost = up.cost * (currentLevel + 1);

        if (this.legacyDNA >= cost) {
            this.legacyDNA -= cost;
            this.upgrades[key] = currentLevel + 1;
            this.save();
            return true;
        }
        return false;
    }

    getBuffs() {
        return {
            startMass: (this.upgrades['StartSize'] || 0) * 5,
            speedMult: 1 + (this.upgrades['Speed'] || 0) * 0.05,
            visionMult: 1 + (this.upgrades['Vision'] || 0) * 0.1,
            dnaMult: 1 + (this.upgrades['Efficiency'] || 0) * 0.1
        };
    }
}

export { LEGACY_UPGRADES };
