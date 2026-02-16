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
                    speedMod += 200;
                    turnMod += 1;
                    break;
                case 'Spike':
                    damageMod += 10;
                    defenseMod += 2;
                    break;
                case 'Eye':
                    // Enhanced vision (could affect zoom or food detection range)
                    break;
                case 'Poison':
                    damageMod += 5; // Passive DoT
                    defenseMod += 1; // Deterrent
                    break;
                case 'Tentacle':
                    turnMod += 2; // Better maneuvering
                    damageMod += 2; // Slight damage
                    break;
                case 'Shield':
                    defenseMod += 15;
                    speedMod -= 50; // Heavy
                    break;
                case 'Booster':
                    speedMod += 400;
                    turnMod -= 0.5; // Harder to steer
                    break;
            }
        });

        this.speed = Math.max(100, this.baseSpeed + speedMod);
        this.damage = this.baseDamage + damageMod;
        this.defense = this.baseDefense + defenseMod;
        this.turnSpeed = Math.max(1, this.baseTurnSpeed + turnMod);
    }
}
