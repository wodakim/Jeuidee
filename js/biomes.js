import Enemy from './enemy.js';

export default class BiomeManager {
    constructor(game) {
        this.game = game;

        // Define Biomes
        this.biomes = [
            {
                name: "The Shallows",
                color: "#001020", // Deep Blue
                particles: "#aaffff",
                hazard: null,
                enemyTypes: ['hunter', 'grazer'],
                depthStart: 0
            },
            {
                name: "Algae Forest",
                color: "#001810", // Dark Greenish
                particles: "#00ff88",
                hazard: "obscure", // Fog
                enemyTypes: ['grazer', 'hunter'], // More grazers
                depthStart: 2000
            },
            {
                name: "Thermal Vents",
                color: "#180500", // Dark Red
                particles: "#ff4400",
                hazard: "current", // Push force
                enemyTypes: ['hunter', 'titan'],
                depthStart: 5000
            },
            {
                name: "The Void",
                color: "#050010", // Purple Black
                particles: "#aa00ff",
                hazard: "void",
                enemyTypes: ['titan', 'titan'], // Only big stuff
                depthStart: 10000
            }
        ];
    }

    getCurrentBiome(x, y) {
        // Biomes are radial based on distance from origin (Depth)
        // Or perlin noise? User asked for "Infinite Map".
        // Distance-based is easiest for infinite progression feeling.
        const dist = Math.hypot(x, y);

        // Find deepest biome that matches distance
        for (let i = this.biomes.length - 1; i >= 0; i--) {
            if (dist >= this.biomes[i].depthStart) {
                return this.biomes[i];
            }
        }
        return this.biomes[0];
    }

    update(dt, player) {
        const head = player.points[0];
        const biome = this.getCurrentBiome(head.x, head.y);

        // Apply Hazards
        if (biome.hazard === 'current') {
            // Push player in random direction (simulating turbulence)
            const time = Date.now() * 0.001;
            const forceX = Math.cos(time) * 1000;
            const forceY = Math.sin(time) * 1000;

            // Only apply to body points
            player.points.forEach(p => {
                p.x += forceX * dt * dt;
                p.y += forceY * dt * dt;
            });
        }

        // Return biome info for renderer/spawner
        return biome;
    }
}
