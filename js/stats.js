export default class Stats {
    constructor() {
        this.baseSpeed = 1500;
        this.baseDamage = 5;
        this.baseDefense = 0;
        this.baseTurnSpeed = 5;

        // Calculated
        this.speed = this.baseSpeed;
        this.damage = this.baseDamage;
        this.defense = this.baseDefense;
        this.turnSpeed = this.baseTurnSpeed;
    }

    calculate(parts) {
        let speedMod = 0;
        let damageMod = 0;
        let defenseMod = 0;
        let turnMod = 0;

        parts.forEach(part => {
            switch(part.type) {
                case 'Fin':
                    speedMod += 200; // Force units
                    turnMod += 1;
                    break;
                case 'Spike':
                    damageMod += 10;
                    defenseMod += 2; // Spikes hurt attacker
                    break;
                case 'Eye':
                    // Zoom out view? Or just cosmetic for now?
                    // Maybe 'Critical Hit Chance'
                    break;
                case 'Poison':
                    damageMod += 5; // DoT logic later
                    break;
            }
        });

        this.speed = this.baseSpeed + speedMod;
        this.damage = this.baseDamage + damageMod;
        this.defense = this.baseDefense + defenseMod;
        this.turnSpeed = this.baseTurnSpeed + turnMod;
    }
}
