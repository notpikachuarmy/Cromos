/* =========================================================
   TOTOTO CLICKER 2.0 - STATISTICS.JS
   Renderizado y utilidades de estadísticas.
   ========================================================= */

window.Statistics = (() => {
    function render() {
        const state = window.Tototo.getState();
        const albums = window.Tototo.getAlbums();
        const cards = window.Tototo.getCards();
        const format = window.Tototo.formatNumber;

        renderGeneral(state, albums, cards, format);
        renderPacks(state, albums, format);
        renderRarities(state, format);
        renderCollection(state, cards, format);
    }

    function renderIfVisible() {
        const statsTab = document.getElementById("tab-estadisticas");
        if (statsTab?.classList.contains("active")) {
            render();
        }
    }

    function renderGeneral(state, albums, cards, format) {
        const container = document.getElementById("stats-general");
        if (!container) return;

        const completedAlbums = albums.filter(album => window.Tototo.isAlbumComplete(album.id)).length;
        const achievementsUnlocked = Object.values(state.achievements.claimed || {}).filter(Boolean).length;

        const rows = [
            ["Clicks", format(state.stats.clicks)],
            ["Monedas obtenidas", `${format(Math.floor(state.stats.coinsEarned))} 🪙`],
            ["Monedas gastadas", `${format(Math.floor(state.stats.coinsSpent))} 🪙`],
            ["Producción pasiva total", `${format(state.totalPassive || 0)}/s`],
            ["Álbumes completos ahora", `${format(completedAlbums)} / ${format(albums.length)}`],
            ["Máximo prestigio en un álbum", format(state.stats.maxAlbumPrestige || 0)],
            ["Logros reclamados", format(achievementsUnlocked)],
            ["Misiones completadas", format(state.missions.completed || 0)],
            ["Tiempo jugado", formatTime(state.stats.playTimeSeconds || 0)]
        ];

        container.innerHTML = rows.map(rowHTML).join("");
    }

    function renderPacks(state, albums, format) {
        const container = document.getElementById("stats-packs");
        if (!container) return;

        const rows = albums.map(album => {
            const opened = state.stats.packsByAlbum?.[album.id] || 0;
            return [album.nombre, format(opened)];
        });

        rows.push(["TOTAL", format(state.stats.totalPacksOpened || 0)]);

        container.innerHTML = rows.map(rowHTML).join("");
    }

    function renderRarities(state, format) {
        const container = document.getElementById("stats-rarities");
        if (!container) return;

        const rarities = window.Tototo.getRarities();
        const rows = rarities.map(rarity => {
            const value = state.stats.raritiesObtained?.[rarity] || 0;
            return [rarity, format(value)];
        });

        container.innerHTML = rows.map(([label, value]) => `
            <div class="stat-row">
                <span><span class="rarity-pill rarity-${label}">${label}</span></span>
                <strong>${value}</strong>
            </div>
        `).join("");
    }

    function renderCollection(state, cards, format) {
        const container = document.getElementById("stats-collection");
        if (!container) return;

        const totalPrestiges = Object.values(state.albumPrestige || {})
            .reduce((sum, value) => sum + (Number(value) || 0), 0);

        const rows = [
            ["Cromos únicos", `${format(state.inventario.length)} / ${format(cards.length)}`],
            ["Cromos nuevos obtenidos", format(state.stats.newCardsObtained || 0)],
            ["Duplicados", format(state.stats.duplicates || 0)],
            ["Fragmentos obtenidos", format(state.stats.fragmentsEarned || 0)],
            ["Fragmentos gastados", format(state.stats.fragmentsSpent || 0)],
            ["Prestigios de álbum realizados", format(totalPrestiges)]
        ];

        container.innerHTML = rows.map(rowHTML).join("");
    }

    function rowHTML([label, value]) {
        return `
            <div class="stat-row">
                <span>${window.Tototo.escapeHTML(label)}</span>
                <strong>${window.Tototo.escapeHTML(value)}</strong>
            </div>
        `;
    }

    function increment(path, amount = 1) {
        const state = window.Tototo.getState();
        const keys = path.split(".");
        let obj = state;

        while (keys.length > 1) {
            const key = keys.shift();
            if (!obj[key] || typeof obj[key] !== "object") obj[key] = {};
            obj = obj[key];
        }

        const finalKey = keys[0];
        obj[finalKey] = (Number(obj[finalKey]) || 0) + amount;
    }

    function set(path, value) {
        const state = window.Tototo.getState();
        const keys = path.split(".");
        let obj = state;

        while (keys.length > 1) {
            const key = keys.shift();
            if (!obj[key] || typeof obj[key] !== "object") obj[key] = {};
            obj = obj[key];
        }

        obj[keys[0]] = value;
    }

    function registerPackOpened(albumId) {
        const state = window.Tototo.getState();

        state.stats.totalPacksOpened = (state.stats.totalPacksOpened || 0) + 1;
        state.stats.packsByAlbum[albumId] = (state.stats.packsByAlbum[albumId] || 0) + 1;
    }

    function registerCardObtained(card, isDuplicate, fragmentAmount = 0) {
        const state = window.Tototo.getState();

        if (card?.rareza) {
            state.stats.raritiesObtained[card.rareza] = (state.stats.raritiesObtained[card.rareza] || 0) + 1;
        }

        if (isDuplicate) {
            state.stats.duplicates = (state.stats.duplicates || 0) + 1;
            state.stats.fragmentsEarned = (state.stats.fragmentsEarned || 0) + fragmentAmount;
        } else {
            state.stats.newCardsObtained = (state.stats.newCardsObtained || 0) + 1;
        }
    }

    function registerFragmentsSpent(amount) {
        const state = window.Tototo.getState();
        state.stats.fragmentsSpent = (state.stats.fragmentsSpent || 0) + amount;
    }

    function registerAlbumPrestige(albumId) {
        const state = window.Tototo.getState();

        state.stats.totalAlbumPrestiges = (state.stats.totalAlbumPrestiges || 0) + 1;
        state.stats.maxAlbumPrestige = Math.max(
            state.stats.maxAlbumPrestige || 0,
            state.albumPrestige[albumId] || 0
        );
    }

    function formatTime(totalSeconds) {
        const seconds = Math.max(0, Number(totalSeconds) || 0);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        }

        if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        }

        return `${secs}s`;
    }

    return {
        render,
        renderIfVisible,
        increment,
        set,
        registerPackOpened,
        registerCardObtained,
        registerFragmentsSpent,
        registerAlbumPrestige,
        formatTime
    };
})();
"""

path = Path("/mnt/data/statistics.js")
path.write_text(statistics_js, encoding="utf-8")
print(f"Archivo creado: {path}")
