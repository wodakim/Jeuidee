export default class SkillManager {
    constructor(game) {
        this.game = game;
        this.skills = {
            'Dash': { cooldown: 2.0, timer: 0, unlocked: false, icon: '⚡' },
            'Ink': { cooldown: 5.0, timer: 0, unlocked: false, icon: '🦑' },
            'Shock': { cooldown: 8.0, timer: 0, unlocked: false, icon: '🔆' },
            'Shield': { cooldown: 12.0, timer: 0, unlocked: false, icon: '🛡️' }
        };
        this.activeEffects = [];
    }

    unlock(skillName) {
        if(this.skills[skillName]) this.skills[skillName].unlocked = true;
    }

    update(dt) {
        // Cooldowns
        for (let key in this.skills) {
            if (this.skills[key].timer > 0) this.skills[key].timer -= dt;
        }

        // Active Effects
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const fx = this.activeEffects[i];
            fx.life -= dt;
            if (fx.life <= 0) {
                this.activeEffects.splice(i, 1);
            } else {
                if (fx.type === 'shield') {
                    // Draw shield
                    const head = this.game.creature.points[0];
                    this.game.ctx.save();
                    this.game.ctx.translate(head.x, head.y);
                    this.game.ctx.beginPath();
                    this.game.ctx.arc(0, 0, head.radius + 20, 0, Math.PI*2);
                    this.game.ctx.strokeStyle = `rgba(0, 255, 255, ${fx.life / 3})`;
                    this.game.ctx.lineWidth = 5;
                    this.game.ctx.stroke();
                    this.game.ctx.restore();
                }
            }
        }
    }

    activate(skillName) {
        const skill = this.skills[skillName];
        if (!skill || !skill.unlocked || skill.timer > 0) return false;

        skill.timer = skill.cooldown;
        const head = this.game.creature.points[0];

        switch(skillName) {
            case 'Dash':
                // Impulse handled in gameloop, but we can manage cooldown here
                // Actually gameloop handles logic, maybe move it here?
                // For now, gameloop calls this to check cooldown/unlock
                return true;
            case 'Ink':
                this.spawnInk(head.x, head.y);
                return true;
            case 'Shock':
                this.spawnShock(head.x, head.y);
                return true;
            case 'Shield':
                this.activeEffects.push({ type: 'shield', life: 3.0 });
                this.game.creature.stats.defense += 100; // Temp buff
                setTimeout(() => { this.game.creature.stats.defense -= 100; }, 3000);
                return true;
        }
        return false;
    }

    spawnInk(x, y) {
        // Blind enemies
        this.game.spawnParticles(x, y, '#000', 20, 100);
        this.game.enemies.forEach(e => {
            const dist = Math.hypot(e.points[0].x - x, e.points[0].y - y);
            if(dist < 300) {
                e.stunned = 3.0; // Stun mechanic needs to be in Enemy class
            }
        });
    }

    spawnShock(x, y) {
        // AOE Damage
        this.game.distortion.addShockwave(x, y);
        this.game.enemies.forEach(e => {
            const dist = Math.hypot(e.points[0].x - x, e.points[0].y - y);
            if(dist < 200) {
                e.health -= 20;
                // Push back
                const angle = Math.atan2(e.points[0].y - y, e.points[0].x - x);
                e.points[0].x += Math.cos(angle) * 50;
                e.points[0].y += Math.sin(angle) * 50;
            }
        });
    }
}
