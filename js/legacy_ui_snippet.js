// Legacy Menu Logic appended to GameLoop (via overwrite block or new method)
// Ideally I should put this in a separate View class, but for single-file architecture I'll add methods to GameLoop.

    openLegacyMenu() {
        const menu = document.getElementById('legacy-menu');
        menu.style.display = 'flex';
        document.getElementById('main-menu').style.display = 'none';

        this.renderLegacyUI();
    }

    renderLegacyUI() {
        const menu = document.getElementById('legacy-menu');
        const dna = this.legacyManager.legacyDNA;

        let html = `
            <h1 style="color:#f0f; font-family:Orbitron;">ANCESTRAL MEMORY</h1>
            <h3 style="color:#fff;">LEGACY DNA: ${dna}</h3>
            <div class="upgrade-grid" style="display:flex; flex-wrap:wrap; gap:20px; justify-content:center; width:100%; max-width:600px;">
        `;

        for (const [key, up] of Object.entries(LEGACY_UPGRADES)) {
            const level = this.legacyManager.upgrades[key] || 0;
            const cost = up.cost * (level + 1);
            const isMax = level >= up.max;
            const canAfford = dna >= cost && !isMax;

            html += `
                <div class="upgrade-card" style="border:1px solid #f0f; padding:15px; width:250px; background:rgba(20,0,20,0.8); text-align:left;">
                    <h3 style="color:#f0f; margin:0;">${up.name}</h3>
                    <p style="color:#aaa; font-size:0.8rem;">${up.desc}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                        <span style="color:#fff;">Lvl ${level}/${up.max}</span>
                        <button onclick="game.buyLegacy('${key}')"
                            style="padding:5px 10px; background:${canAfford ? '#f0f' : '#444'}; border:none; color:#fff; cursor:${canAfford ? 'pointer' : 'default'};">
                            ${isMax ? 'MAX' : cost + ' DNA'}
                        </button>
                    </div>
                </div>
            `;
        }

        html += `</div>
            <button id="legacy-back-btn" class="btn-neon" style="margin-top:30px;">BACK</button>
        `;

        menu.innerHTML = html;

        document.getElementById('legacy-back-btn').onclick = () => {
            menu.style.display = 'none';
            document.getElementById('main-menu').style.display = 'flex';
        };
    }

    buyLegacy(key) {
        if (this.legacyManager.buyUpgrade(key)) {
            if(navigator.vibrate) navigator.vibrate([50, 50]);
            this.renderLegacyUI(); // Refresh
        } else {
            if(navigator.vibrate) navigator.vibrate(200); // Error
        }
    }
