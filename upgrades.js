/* =========================================================
   TOTOTO CLICKER 2.0 - UPGRADES.JS
   Laboratorio:
   - Mejoras con niveles.
   - Compras únicas.
   - Bonus de click, pasiva, fragmentos, descuento de sobres
     y probabilidades de rareza.
   ========================================================= */

window.Upgrades = (() => {
    const UPGRADE_DEFINITIONS = [
        {
            id: "click_power",
            type: "level",
            title: "Poder de click",
            description: level => `Aumenta las monedas por click. Nivel actual: ${level}.`,
            maxLevel: 50,
            baseCost: 50,
            costMultiplier: 1.35,
            category: "Click"
        },
        {
            id: "passive_efficiency",
            type: "level",
            title: "Minería pasiva eficiente",
            description: level => `+5% producción pasiva por nivel. Nivel actual: ${level}.`,
            maxLevel: 40,
            baseCost: 250,
            costMultiplier: 1.42,
            category: "Pasiva"
        },
        {
            id: "fragment_recycler",
            type: "level",
            title: "Reciclaje avanzado",
            description: level => `+10% fragmentos por duplicado por nivel. Nivel actual: ${level}.`,
            maxLevel: 20,
            baseCost: 300,
            costMultiplier: 1.45,
            category: "Fragmentos"
        },
        {
            id: "flat_fragments",
            type: "level",
            title: "Mochila mejorada",
            description: level => `+1 fragmento plano por duplicado por nivel. Nivel actual: ${level}.`,
            maxLevel: 10,
            baseCost: 750,
            costMultiplier: 1.65,
            category: "Fragmentos"
        },
        {
            id: "pack_discount",
            type: "level",
            title: "Regateo de sobres",
            description: level => `-2% coste de sobres por nivel. Nivel actual: ${level}.`,
            maxLevel: 15,
            baseCost: 500,
            costMultiplier: 1.55,
            category: "Tienda"
        },
        {
            id: "sr_magnet",
            type: "level",
            title: "Imán de SR",
            description: level => `Mejora ligeramente la probabilidad de SR. Nivel actual: ${level}.`,
            maxLevel: 10,
            baseCost: 900,
            costMultiplier: 1.7,
            category: "Suerte"
        },
        {
            id: "ssr_magnet",
            type: "level",
            title: "Imán de SSR",
            description: level => `Mejora ligeramente la probabilidad de SSR. Nivel actual: ${level}.`,
            maxLevel: 8,
            baseCost: 1800,
            costMultiplier: 1.85,
            category: "Suerte"
        },
        {
            id: "ur_magnet",
            type: "level",
            title: "Imán de UR",
            description: level => `Mejora muy ligeramente la probabilidad de UR. Nivel actual: ${level}.`,
            maxLevel: 5,
            baseCost: 5000,
            costMultiplier: 2.1,
            category: "Suerte"
        },
        {
            id: "encyclopedia_unlock",
            type: "unique",
            title: "Enciclopedia avanzada",
            description: () => "Desbloquea información ampliada de cada cromo: veces obtenido, duplicados y fragmentos generados.",
            cost: 1000,
            category: "Colección"
        },
        {
            id: "visible_odds",
            type: "unique",
            title: "Probabilidades visibles",
            description: () => "Permite consultar las probabilidades exactas de rareza en el laboratorio.",
            cost: 1500,
            category: "Suerte"
        },
        {
            id: "collector_engine",
            type: "unique",
            title: "Motor coleccionista",
            description: () => "Cada álbum con al menos 1 prestigio aporta +5% extra a la producción pasiva.",
            cost: 8000,
            category: "Pasiva"
        },
        {
            id: "premium_recycler",
            type: "unique",
            title: "Reciclador premium",
            description: () => "Los duplicados generan un 50% más de fragmentos.",
            cost: 6000,
            category: "Fragmentos"
        }
    ];

    function render() {
        renderSummary();

        const container = document.getElementById("upgrades-container");
        if (!container) return;

        const state = window.Tototo.getState();

        container.innerHTML = UPGRADE_DEFINITIONS.map(def => {
            const level = getLevel(def.id);
            const owned = isOwned(def.id);
            const maxed = isMaxed(def);
            const cost = getUpgradeCost(def);
            const canBuy = state.coins >= cost && !maxed;
            const status = getStatusText(def, level, owned, maxed);

            return `
                <article class="upgrade-card ${maxed ? "maxed" : ""}">
                    <h3>${getIcon(def)} ${window.Tototo.escapeHTML(def.title)}</h3>
                    <p class="text-muted">${window.Tototo.escapeHTML(def.category)}</p>
                    <p>${window.Tototo.escapeHTML(def.description(level))}</p>

                    <div class="progress-line">
                        <span>Estado</span>
                        <strong>${window.Tototo.escapeHTML(status)}</strong>
                    </div>

                    <div class="progress-line">
                        <span>Coste</span>
                        <strong class="money">${maxed ? "MÁX" : `${window.Tototo.formatNumber(cost)} 🪙`}</strong>
                    </div>

                    ${renderProgress(def, level)}

                    <button class="card-button full-button"
                            type="button"
                            data-buy-upgrade="${window.Tototo.escapeHTML(def.id)}"
                            ${canBuy ? "" : "disabled"}>
                        ${maxed ? "Completado" : def.type === "unique" ? "Comprar" : "Mejorar"}
                    </button>
                </article>
            `;
        }).join("");

        bindButtons();
    }

    function renderSummary() {
        const state = window.Tototo?.getState?.();
        if (!state) return;

        setText("lab-click-power", window.Tototo.formatNumber(window.Tototo.getState().clickValue || 1));
        setText("lab-passive-multiplier", `x${window.Tototo.formatDecimal(getPassiveBonusMultiplier(), 2)}`);
        setText("lab-fragment-bonus", `+${Math.round((getFragmentMultiplier() - 1) * 100)}%`);

        const summary = document.querySelector(".upgrade-summary");
        if (!summary) return;

        const oddsId = "lab-rarity-odds";

        let oddsBlock = document.getElementById(oddsId);

        if (isOwned("visible_odds") && window.Shop?.getRarityChancesForDisplay) {
            const odds = window.Shop.getRarityChancesForDisplay();

            if (!oddsBlock) {
                oddsBlock = document.createElement("div");
                oddsBlock.id = oddsId;
                oddsBlock.className = "progress-line";
                summary.appendChild(oddsBlock);
            }

            oddsBlock.innerHTML = `
                <span>Probabilidades</span>
                <strong>
                    N ${odds.N}% · R ${odds.R}% · SR ${odds.SR}% · SSR ${odds.SSR}% · UR ${odds.UR}%
                </strong>
            `;
        } else if (oddsBlock) {
            oddsBlock.remove();
        }
    }

    function bindButtons() {
        document.querySelectorAll("[data-buy-upgrade]").forEach(button => {
            if (button.dataset.boundUpgradeBuy) return;
            button.dataset.boundUpgradeBuy = "true";

            button.addEventListener("click", () => {
                buy(button.dataset.buyUpgrade);
            });
        });
    }

    function buy(id) {
        const def = UPGRADE_DEFINITIONS.find(item => item.id === id);

        if (!def) {
            window.Tototo.toast("Mejora no encontrada.", "danger");
            window.Sounds?.play?.("error");
            return false;
        }

        if (isMaxed(def)) {
            window.Tototo.toast("Esa mejora ya está al máximo.", "warning");
            window.Sounds?.play?.("error");
            return false;
        }

        const cost = getUpgradeCost(def);

        if (!window.Tototo.spendCoins(cost)) {
            window.Tototo.toast("No tienes monedas suficientes.", "warning");
            window.Sounds?.play?.("error");
            return false;
        }

        const state = window.Tototo.getState();

        if (def.type === "unique") {
            state.upgrades[def.id] = true;
        } else {
            state.upgrades[def.id] = getLevel(def.id) + 1;
        }

        window.Tototo.recalculate();
        window.Tototo.save();

        window.Tototo.toast(`Mejora comprada: ${def.title}.`, "success");
        window.Sounds?.play?.("buy");

        render();

        if (window.Shop?.render) window.Shop.render();
        if (window.Albums?.render) window.Albums.render();
        if (window.Statistics?.renderIfVisible) window.Statistics.renderIfVisible();

        window.Tototo.renderLight();

        return true;
    }

    function getUpgradeCost(def) {
        if (def.type === "unique") {
            return def.cost;
        }

        const level = getLevel(def.id);
        return Math.floor(def.baseCost * Math.pow(def.costMultiplier, level));
    }

    function getLevel(id) {
        const state = window.Tototo.getState();
        const value = state.upgrades?.[id];

        if (typeof value === "number") return value;
        return 0;
    }

    function isOwned(id) {
        const state = window.Tototo.getState();
        const value = state.upgrades?.[id];

        return value === true || Number(value) > 0;
    }

    function isMaxed(def) {
        if (def.type === "unique") {
            return isOwned(def.id);
        }

        return getLevel(def.id) >= def.maxLevel;
    }

    function getStatusText(def, level, owned, maxed) {
        if (def.type === "unique") {
            return owned ? "Comprada" : "No comprada";
        }

        return maxed
            ? `Nivel ${def.maxLevel} / ${def.maxLevel}`
            : `Nivel ${level} / ${def.maxLevel}`;
    }

    function renderProgress(def, level) {
        if (def.type === "unique") {
            const percent = isOwned(def.id) ? 100 : 0;
            return `
                <div class="achievement-progress-bar">
                    <div class="achievement-progress-fill" style="width:${percent}%"></div>
                </div>
            `;
        }

        const percent = window.Tototo.percentage(level, def.maxLevel);

        return `
            <div class="achievement-progress-bar">
                <div class="achievement-progress-fill" style="width:${percent}%"></div>
            </div>
        `;
    }

    function getIcon(def) {
        const icons = {
            Click: "👆",
            Pasiva: "⚙️",
            Fragmentos: "♻️",
            Tienda: "🛒",
            Suerte: "🍀",
            Colección: "📚"
        };

        return icons[def.category] || "🧪";
    }

    function getClickBonusMultiplier() {
        const level = getLevel("click_power");
        return 1 + level * 0.25;
    }

    function getPassiveBonusMultiplier() {
        const passiveLevel = getLevel("passive_efficiency");
        let multiplier = 1 + passiveLevel * 0.05;

        if (isOwned("collector_engine")) {
            const state = window.Tototo.getState();
            const albumPrestige = state.albumPrestige || {};
            const prestigedAlbums = Object.values(albumPrestige)
                .filter(value => (Number(value) || 0) > 0)
                .length;

            multiplier += prestigedAlbums * 0.05;
        }

        return multiplier;
    }

    function getFragmentMultiplier() {
        const level = getLevel("fragment_recycler");
        let multiplier = 1 + level * 0.10;

        if (isOwned("premium_recycler")) {
            multiplier += 0.50;
        }

        return multiplier;
    }

    function getFlatFragmentBonus() {
        return getLevel("flat_fragments");
    }

    function getPackDiscountMultiplier() {
        const level = getLevel("pack_discount");
        const discount = Math.min(0.60, level * 0.02);

        return 1 - discount;
    }

    function applyRarityBonuses(chances) {
        const result = { ...chances };

        const sr = getLevel("sr_magnet");
        const ssr = getLevel("ssr_magnet");
        const ur = getLevel("ur_magnet");

        result.SR = (result.SR || 0) + sr * 0.003;
        result.SSR = (result.SSR || 0) + ssr * 0.0015;
        result.UR = (result.UR || 0) + ur * 0.0006;

        const added = sr * 0.003 + ssr * 0.0015 + ur * 0.0006;

        result.N = Math.max(0.01, (result.N || 0) - added * 0.75);
        result.R = Math.max(0.01, (result.R || 0) - added * 0.25);

        return result;
    }

    function hasAdvancedEncyclopedia() {
        return isOwned("encyclopedia_unlock");
    }

    function getDefinitions() {
        return UPGRADE_DEFINITIONS.map(item => ({ ...item }));
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    return {
        render,
        renderSummary,
        buy,
        getDefinitions,
        getUpgradeCost,
        getLevel,
        isOwned,
        hasAdvancedEncyclopedia,

        getClickBonusMultiplier,
        getPassiveBonusMultiplier,
        getFragmentMultiplier,
        getFlatFragmentBonus,
        getPackDiscountMultiplier,
        applyRarityBonuses
    };
})();
