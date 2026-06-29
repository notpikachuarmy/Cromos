/* =========================================================
   TOTOTO CLICKER 2.0 - ACHIEVEMENTS.JS
   Logros con recompensas en monedas.
   ========================================================= */

window.Achievements = (() => {
    let ACHIEVEMENTS = [];

    const BASE_ACHIEVEMENTS = [
        ...makeMilestones("coleccion", "Coleccionista", "Consigue {x} cromos únicos.", [10, 25, 50, 100, 250, 500], 20),
        ...makeMilestones("sobres", "Abresobres", "Abre {x} sobres en total.", [10, 50, 100, 500, 1000, 5000], 15),
        ...makeMilestones("clicks", "Clicker", "Haz {x} clicks.", [100, 1000, 10000, 100000, 500000], 10),

        { id: "rarity_first_N", category: "rareza", title: "Primer común", description: "Consigue tu primer cromo N.", reward: 50, condition: s => (s.stats.raritiesObtained.N || 0) >= 1 },
        { id: "rarity_first_R", category: "rareza", title: "Primer raro", description: "Consigue tu primer cromo R.", reward: 100, condition: s => (s.stats.raritiesObtained.R || 0) >= 1 },
        { id: "rarity_first_SR", category: "rareza", title: "Primer super raro", description: "Consigue tu primer cromo SR.", reward: 250, condition: s => (s.stats.raritiesObtained.SR || 0) >= 1 },
        { id: "rarity_first_SSR", category: "rareza", title: "Primer SSR", description: "Consigue tu primer cromo SSR.", reward: 750, condition: s => (s.stats.raritiesObtained.SSR || 0) >= 1 },
        { id: "rarity_first_UR", category: "rareza", title: "Primer UR", description: "Consigue tu primer cromo UR.", reward: 2500, condition: s => (s.stats.raritiesObtained.UR || 0) >= 1 },

        { id: "rarity_N_25", category: "rareza", title: "Muchos comunes", description: "Consigue 25 cromos N.", reward: 150, condition: s => (s.stats.raritiesObtained.N || 0) >= 25 },
        { id: "rarity_R_25", category: "rareza", title: "Raros de sobra", description: "Consigue 25 cromos R.", reward: 350, condition: s => (s.stats.raritiesObtained.R || 0) >= 25 },
        { id: "rarity_SR_10", category: "rareza", title: "Brillo SR", description: "Consigue 10 cromos SR.", reward: 900, condition: s => (s.stats.raritiesObtained.SR || 0) >= 10 },
        { id: "rarity_SSR_5", category: "rareza", title: "Colección SSR", description: "Consigue 5 cromos SSR.", reward: 2200, condition: s => (s.stats.raritiesObtained.SSR || 0) >= 5 },
        { id: "rarity_UR_3", category: "rareza", title: "Leyenda viviente", description: "Consigue 3 cromos UR.", reward: 6500, condition: s => (s.stats.raritiesObtained.UR || 0) >= 3 }
    ];

    function makeMilestones(category, titlePrefix, description, values, rewardMultiplier) {
        return values.map(value => ({
            id: `${category}_${value}`,
            category,
            title: `${titlePrefix} ${value}`,
            description: description.replace("{x}", value.toLocaleString("es-ES")),
            reward: value * rewardMultiplier,
            condition: state => {
                if (category === "coleccion") return state.inventario.length >= value;
                if (category === "sobres") return (state.stats.totalPacksOpened || 0) >= value;
                if (category === "clicks") return (state.stats.clicks || 0) >= value;
                return false;
            }
        }));
    }

    function buildAlbumAchievements(albums) {
        const albumAchievements = albums.map(album => ({
            id: `album_complete_${album.id}`,
            category: "album",
            title: `Completa ${album.nombre}`,
            description: `Completa el álbum ${album.nombre}.`,
            reward: Math.max(500, window.Tototo.getCardsByAlbum(album.id).length * 100),
            condition: () => window.Tototo.isAlbumComplete(album.id)
        }));

        ACHIEVEMENTS = [...BASE_ACHIEVEMENTS, ...albumAchievements];
    }

    function getAll() {
        return ACHIEVEMENTS;
    }

    function checkAll() {
        const state = window.Tototo.getState();
        let changed = false;

        ACHIEVEMENTS.forEach(achievement => {
            if (state.achievements.claimed[achievement.id]) return;

            if (achievement.condition(state)) {
                claim(achievement.id, false);
                changed = true;
            }
        });

        if (changed) {
            window.Tototo.recalculate();
            render(window.Tototo.getAchievementFilter());
            window.Tototo.save();
        }
    }

    function claim(id, rerender = true) {
        const state = window.Tototo.getState();
        const achievement = ACHIEVEMENTS.find(item => item.id === id);

        if (!achievement) return false;
        if (state.achievements.claimed[id]) return false;
        if (!achievement.condition(state)) return false;

        state.achievements.claimed[id] = true;
        window.Tototo.earnCoins(achievement.reward);

        if (window.Sounds?.play) window.Sounds.play("achievement");
        window.Tototo.toast(`Logro desbloqueado: ${achievement.title} (+${window.Tototo.formatNumber(achievement.reward)} 🪙)`, "success");

        if (rerender) {
            window.Tototo.recalculate();
            render(window.Tototo.getAchievementFilter());
            window.Tototo.renderLight();
            window.Tototo.save();
        }

        return true;
    }

    function render(filter = "todos") {
        const container = document.getElementById("achievements-container");
        if (!container) return;

        window.Tototo.setAchievementFilter(filter);
        prepararFiltros(filter);

        const state = window.Tototo.getState();
        const filtered = filter === "todos"
            ? ACHIEVEMENTS
            : ACHIEVEMENTS.filter(achievement => achievement.category === filter);

        if (!filtered.length) {
            container.innerHTML = `<div class="empty-state">No hay logros en esta categoría.</div>`;
            return;
        }

        container.innerHTML = filtered.map(achievement => {
            const done = Boolean(state.achievements.claimed[achievement.id]);
            const available = achievement.condition(state);
            const progress = getProgress(achievement, state);

            return `
                <article class="achievement-card ${done ? "claimed" : "locked"}">
                    <h3>${done ? "✅" : available ? "🎁" : "🔒"} ${window.Tototo.escapeHTML(achievement.title)}</h3>
                    <p>${window.Tototo.escapeHTML(achievement.description)}</p>
                    <div class="achievement-progress-bar">
                        <div class="achievement-progress-fill" style="width:${progress}%"></div>
                    </div>
                    <span class="achievement-reward">+${window.Tototo.formatNumber(achievement.reward)} 🪙</span>
                    <p class="${done ? "success-text" : available ? "money" : "text-muted"}">
                        ${done ? "Reclamado" : available ? "Disponible" : "Pendiente"}
                    </p>
                </article>
            `;
        }).join("");
    }

    function prepararFiltros(activeFilter) {
        document.querySelectorAll("[data-achievement-filter]").forEach(button => {
            button.classList.toggle("active", button.dataset.achievementFilter === activeFilter);

            if (!button.dataset.boundAchievementFilter) {
                button.dataset.boundAchievementFilter = "true";
                button.addEventListener("click", () => {
                    render(button.dataset.achievementFilter);
                });
            }
        });
    }

    function getProgress(achievement, state) {
        const id = achievement.id;

        if (state.achievements.claimed[id]) return 100;

        if (id.startsWith("coleccion_")) {
            return window.Tototo.percentage(state.inventario.length, Number(id.split("_")[1]));
        }

        if (id.startsWith("sobres_")) {
            return window.Tototo.percentage(state.stats.totalPacksOpened || 0, Number(id.split("_")[1]));
        }

        if (id.startsWith("clicks_")) {
            return window.Tototo.percentage(state.stats.clicks || 0, Number(id.split("_")[1]));
        }

        if (id.startsWith("rarity_")) {
            const parts = id.split("_");
            const rarity = parts[1] === "first" ? parts[2] : parts[1];
            const target = parts[1] === "first" ? 1 : Number(parts[2]);
            return window.Tototo.percentage(state.stats.raritiesObtained[rarity] || 0, target);
        }

        if (id.startsWith("album_complete_")) {
            return achievement.condition(state) ? 100 : 0;
        }

        return achievement.condition(state) ? 100 : 0;
    }

    return {
        buildAlbumAchievements,
        getAll,
        checkAll,
        claim,
        render
    };
})();
