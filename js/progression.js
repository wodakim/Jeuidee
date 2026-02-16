const PARTS_DB = {
    'Fin': {
        name: 'Fin',
        desc: 'Increases Swim Speed and Turn Rate.',
        stat: '+ Speed',
        unlocked: true, // Default
        cost: 5
    },
    'Spike': {
        name: 'Spike',
        desc: 'Deals damage on contact. Increases Defense.',
        stat: '+ Damage',
        unlocked: true, // Default
        cost: 5
    },
    'Jaws': {
        name: 'Carnivore Jaw',
        desc: 'Frontal weapon. High damage.',
        stat: '++ Damage',
        unlocked: true, // Default
        cost: 10
    },
    'Eye': {
        name: 'Eye',
        desc: 'Increases Field of View.',
        stat: '+ Vision',
        unlocked: true, // Default
        cost: 5
    },
    'Tentacle': {
        name: 'Tentacle',
        desc: 'Wiggles and pushes enemies away.',
        stat: '+ Control',
        unlocked: false,
        cost: 10
    },
    'Shield': {
        name: 'Chitin Plate',
        desc: 'Heavy armor that reduces incoming damage.',
        stat: '++ Defense',
        unlocked: false,
        cost: 10
    },
    'Booster': {
        name: 'Jet Gland',
        desc: 'Burst of speed when moving forward.',
        stat: '++ Speed',
        unlocked: false,
        cost: 15
    },
    'Poison': {
        name: 'Toxin Sac',
        desc: 'Enemies take damage over time after contact.',
        stat: '+ Poison',
        unlocked: false,
        cost: 15
    }
};

export default class Progression {
    constructor(saveManager) {
        this.saveManager = saveManager;
        this.unlocked = ['Fin', 'Spike', 'Eye']; // Start with basics
        this.load();
    }

    load() {
        const saved = localStorage.getItem('jelly_unlocks');
        if (saved) {
            this.unlocked = JSON.parse(saved);
        }
        // Sync with DB
        this.unlocked.forEach(key => {
            if(PARTS_DB[key]) PARTS_DB[key].unlocked = true;
        });
    }

    save() {
        localStorage.setItem('jelly_unlocks', JSON.stringify(this.unlocked));
    }

    unlock(key) {
        if (!this.unlocked.includes(key) && PARTS_DB[key]) {
            this.unlocked.push(key);
            PARTS_DB[key].unlocked = true;
            this.save();
            return true;
        }
        return false;
    }

    isUnlocked(key) {
        return this.unlocked.includes(key);
    }

    getAvailableParts() {
        return Object.keys(PARTS_DB).filter(k => this.unlocked.includes(k));
    }

    checkDrop(enemyType, difficulty) {
        // Chance to unlock based on enemy
        const chance = 0.3; // 30% drop chance
        if (Math.random() > chance) return null;

        // Determine potential drop based on difficulty/type
        let potential = [];
        if (difficulty > 2) potential.push('Tentacle');
        if (difficulty > 4) potential.push('Shield');
        if (difficulty > 6) potential.push('Booster');
        if (difficulty > 8) potential.push('Poison');

        // Filter out already unlocked
        potential = potential.filter(p => !this.unlocked.includes(p));

        if (potential.length > 0) {
            const drop = potential[Math.floor(Math.random() * potential.length)];
            return drop;
        }
        return null;
    }
}

export { PARTS_DB };
