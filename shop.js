/* =========================================================
   TOTOTO CLICKER 2.0 - SHOP.JS
   Tienda de sobres: compra por monedas, canje por fragmentos,
   tiradas por rareza, duplicados, fragmentos y resultado visual.
   ========================================================= */

window.Shop = (() => {
    const FRAGMENTOS_POR_SOBRE = 50;

    const BASE_RARITY_CHANCES = {
        N: 0.60,
        R: 0.25,
        SR: 0.10,
        SSR: 0.04,
        UR: 0.01
    };

    const DUPLICATE_FRAGMENT_VALUES = {
        N: 1,
        R: 2,
        SR: 5,
        SSR: 10,
        UR: 25
    };

    function render() {
        const container = document.getElementById("pack-list");
        if (!container) return;

        const packs = window.Tototo.getShopPacks();
        const state = window.Tototo.getState();
        const packIds = Object.keys(packs);

        if (!packIds.length) {
            container.innerHTML = `<div class="empty-state">No hay sobres disponibles.</div>`;
            return;
        }

        container.innerHTML = packIds.map(packId => {
            const pack = packs[packId];
            const tagBase = getTagBase(pack);
            const fragments = state.fragmentos[tagBase] || 0;
            const canBuy = state.coins >= getPackCost(pack);
            const canExchange = fragments >= FRAGMENTOS_POR_SOBRE;
            const cost = getPackCost(pack);

            return `
                <article class="shop-card">
                    <img src="${window.Tototo.escapeHTML(pack.portada)}" 
                         alt="Sobre ${window.Tototo.escapeHTML(pack.nombre || pack.id)}" 
                         class="pack-img"
                         loading="lazy"
                         onerror="this.style.opacity='0.25'">

                    <h3>${window.Tototo.escapeHTML(pack.nombre || pack.id)}</h3>

                    <p>
                        Coste:
                        <strong class="money">${window.Tototo.formatNumber(cost)} 🪙</strong>
                    </p>

                    <p>
                        Fragmentos ${window.Tototo.escapeHTML(tagBase)}:
                        <strong>${window.Tototo.formatNumber(fragments)} / ${FRAGMENTOS_POR_SOBRE}</strong>
                    </p>

                    <div class="shop-actions">
                        <button class="card-button full-button"
                                data-buy-pack="${window.Tototo.escapeHTML(pack.id)}"
                                ${canBuy ? "" : "disabled"}>
                            Comprar
                        </button>

                        <button class="secondary-button full-button"
                                data-exchange-pack="${window.Tototo.escapeHTML(pack.id)}"
                                ${canExchange ? "" : "disabled"}>
                            Canjear 50 F
                        </button>
                    </div>
                </article>
            `;
        }).join("");

        bindShopButtons();
    }

    function bindShopButtons() {
        document.querySelectorAll("[data-buy-pack]").forEach(button => {
            if (button.dataset.boundShopBuy) return;
            button.dataset.boundShopBuy = "true";

            button.addEventListener("click", () => {
                comprarSobre(button.dataset.buyPack, false);
            });
        });

        document.querySelectorAll("[data-exchange-pack]").forEach(button => {
            if (button.dataset.boundShopExchange) return;
            button.dataset.boundShopExchange = "true";

            button.addEventListener("click", () => {
                comprarSobre(button.dataset.exchangePack, true);
            });
        });
    }

    function comprarSobre(packId, conFragmentos = false) {
        const packs = window.Tototo.getShopPacks();
        const pack = packs[packId];

        if (!pack) {
            window.Tototo.toast("Ese sobre no existe.", "danger");
            window.Sounds?.play?.("error");
            return null;
        }

        const state = window.Tototo.getState();
        const tagBase = getTagBase(pack);

        if (conFragmentos) {
            const fragments = state.fragmentos[tagBase] || 0;

            if (fragments < FRAGMENTOS_POR_SOBRE) {
                window.Tototo.toast(`Necesitas ${FRAGMENTOS_POR_SOBRE} fragmentos ${tagBase}.`, "warning");
                window.Sounds?.play?.("error");
                return null;
            }

            state.fragmentos[tagBase] -= FRAGMENTOS_POR_SOBRE;

            if (window.Statistics?.registerFragmentsSpent) {
                window.Statistics.registerFragmentsSpent(FRAGMENTOS_POR_SOBRE);
            }
        } else {
            const cost = getPackCost(pack);
            const paid = window.Tototo.spendCoins(cost);

            if (!paid) {
                window.Tototo.toast("No tienes monedas suficientes.", "warning");
                window.Sounds?.play?.("error");
                return null;
            }
        }

        const prize = obtenerCromoDeSobre(pack);

        if (!prize) {
            window.Tototo.toast("Este sobre no tiene cromos disponibles. Revisa tags y CSV.", "danger");
            window.Sounds?.play?.("error");
            return null;
        }

        const isDuplicate = state.inventario.includes(prize.id);
        let fragmentsEarned = 0;

        if (isDuplicate) {
            fragmentsEarned = calcularFragmentosDuplicado(prize);
            const tagDestino = getTagDestinoFragmentos(prize, tagBase);

            state.fragmentos[tagDestino] = (state.fragmentos[tagDestino] || 0) + fragmentsEarned;

            window.Tototo.toast(
                `Duplicado: ${prize.nombre}. +${fragmentsEarned} fragmentos ${tagDestino}.`,
                "warning"
            );

            window.Sounds?.play?.("duplicate");

            if (window.Missions?.onProgress) {
                window.Missions.onProgress("fragments", fragmentsEarned);
            }
        } else {
            state.inventario.push(prize.id);

            window.Tototo.toast(`Nuevo cromo: ${prize.nombre} (${prize.rareza})`, "success");

            if (prize.rareza === "UR") {
                window.Sounds?.play?.("ur");
            } else {
                window.Sounds?.play?.("newCard");
            }

            if (window.Missions?.onProgress) {
                window.Missions.onProgress("newCards", 1);
            }
        }

        if (window.Statistics?.registerPackOpened) {
            window.Statistics.registerPackOpened(pack.id);
        }

        if (window.Statistics?.registerCardObtained) {
            window.Statistics.registerCardObtained(prize, isDuplicate, fragmentsEarned);
        }

        if (window.Encyclopedia?.registerCard) {
            window.Encyclopedia.registerCard(prize, isDuplicate, fragmentsEarned);
        }

        if (window.Missions?.onProgress) {
            window.Missions.onProgress("packs", 1);
        }

        mostrarResultadoSobre(pack, prize, isDuplicate, fragmentsEarned);

        window.Tototo.recalculate();
        window.Tototo.save();

        render();
        window.Tototo.renderBackpack();

        if (window.Albums?.render) window.Albums.render();
        if (window.Statistics?.renderIfVisible) window.Statistics.renderIfVisible();
        if (window.Albums?.checkAllAlbumCompletionRewards) {
            window.Albums.checkAllAlbumCompletionRewards();
        }

        if (window.Achievements?.checkAll) window.Achievements.checkAll();
        if (window.Missions?.render) window.Missions.render();
        if (window.Upgrades?.renderSummary) window.Upgrades.renderSummary();

        window.Tototo.renderLight();

        return prize;
    }

    function obtenerCromoDeSobre(pack) {
        const cards = window.Tototo.getCards();
        const packTags = pack.tags || [];

        let posiblesDelPack = cards.filter(card =>
            card.tags.some(tag => packTags.includes(tag))
        );

        if (!posiblesDelPack.length) {
            return null;
        }

        const rarity = tirarRareza();
        let candidatos = posiblesDelPack.filter(card => card.rareza === rarity);

        if (!candidatos.length) {
            candidatos = posiblesDelPack;
        }

        return window.Tototo.randomFrom(candidatos);
    }

    function tirarRareza() {
        const chances = getEffectiveRarityChances();
        const roll = Math.random();

        let acumulado = 0;

        for (const rarity of ["UR", "SSR", "SR", "R", "N"]) {
            acumulado += chances[rarity] || 0;
            if (roll < acumulado) return rarity;
        }

        return "N";
    }

    function getEffectiveRarityChances() {
        let chances = { ...BASE_RARITY_CHANCES };

        if (window.Upgrades?.applyRarityBonuses) {
            chances = window.Upgrades.applyRarityBonuses(chances);
        }

        return normalizeChances(chances);
    }

    function normalizeChances(chances) {
        const clean = {};
        let total = 0;

        window.Tototo.getRarities().forEach(rarity => {
            clean[rarity] = Math.max(0, Number(chances[rarity]) || 0);
            total += clean[rarity];
        });

        if (total <= 0) {
            return { ...BASE_RARITY_CHANCES };
        }

        Object.keys(clean).forEach(rarity => {
            clean[rarity] = clean[rarity] / total;
        });

        return clean;
    }

    function calcularFragmentosDuplicado(card) {
        let base = DUPLICATE_FRAGMENT_VALUES[card.rareza] || 1;

        if (window.Upgrades?.getFragmentMultiplier) {
            base *= window.Upgrades.getFragmentMultiplier();
        }

        if (window.Upgrades?.getFlatFragmentBonus) {
            base += window.Upgrades.getFlatFragmentBonus();
        }

        return Math.max(1, Math.floor(base));
    }

    function getPackCost(pack) {
        let cost = Number(pack.costo) || 100;

        if (window.Upgrades?.getPackDiscountMultiplier) {
            cost *= window.Upgrades.getPackDiscountMultiplier();
        }

        return Math.max(1, Math.floor(cost));
    }

    function getTagBase(pack) {
        return pack?.tags?.[0] || "GENERAL";
    }

    function getTagDestinoFragmentos(card, fallbackTag) {
        const mainAlbum = window.Tototo.getMainAlbumOfCard(card);

        if (mainAlbum?.tags?.[0]) {
            return mainAlbum.tags[0];
        }

        return card.tags?.[0] || fallbackTag || "GENERAL";
    }

    function mostrarResultadoSobre(pack, card, duplicate, fragmentsEarned) {
        const body = document.getElementById("pack-result-body");
        const title = document.getElementById("pack-result-title");

        if (!body || !title) return;

        title.textContent = duplicate ? "Cromo repetido" : "Nuevo cromo";

        const rarezaClass = `rareza-${card.rareza}`;
        const album = window.Tototo.getMainAlbumOfCard(card);
        const status = duplicate
            ? `Repetido · +${window.Tototo.formatNumber(fragmentsEarned)} fragmentos`
            : "Añadido a la colección";

        body.innerHTML = `
            <img src="${window.Tototo.escapeHTML(card.imagen)}"
                 alt="${window.Tototo.escapeHTML(card.nombre)}"
                 class="cromo-img ${rarezaClass}"
                 onerror="this.style.opacity='0.25'">

            <h3>${window.Tototo.escapeHTML(card.nombre)}</h3>

            <div class="modal-stats" style="justify-content:center">
                <span class="stat-pill rarity-${window.Tototo.escapeHTML(card.rareza)}">
                    ${window.Tototo.escapeHTML(card.rareza)}
                </span>
                <span class="stat-pill">
                    ${window.Tototo.escapeHTML(album?.nombre || pack.nombre || pack.id)}
                </span>
            </div>

            <p class="${duplicate ? "money" : "success-text"}">${window.Tototo.escapeHTML(status)}</p>

            <button class="secondary-button" type="button" data-result-close>
                Cerrar
            </button>
        `;

        body.querySelector("[data-result-close]")?.addEventListener("click", () => {
            window.Tototo.closeModals();
        });

        window.Tototo.openModal("pack-result-modal");
    }

    function getRarityChancesForDisplay() {
        const chances = getEffectiveRarityChances();

        return Object.fromEntries(
            Object.entries(chances).map(([rarity, value]) => [
                rarity,
                Math.round(value * 10000) / 100
            ])
        );
    }

    return {
        render,
        buyPack: comprarSobre,
        getPackCost,
        getEffectiveRarityChances,
        getRarityChancesForDisplay,
        FRAGMENTOS_POR_SOBRE,
        DUPLICATE_FRAGMENT_VALUES
    };
})();
