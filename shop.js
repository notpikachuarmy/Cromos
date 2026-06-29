/* =========================================================
   TOTOTO CLICKER 2.0 - SHOP.JS
   Tienda de sobres: compra por monedas, canje por fragmentos,
   tiradas por rareza, duplicados, fragmentos y resultado visual.
   Incluye apertura múltiple: 1, 5, 10, 100.
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
        const amount = getOpenAmount();

        if (!packIds.length) {
            container.innerHTML = `<div class="empty-state">No hay sobres disponibles.</div>`;
            return;
        }

        container.innerHTML = packIds.map(packId => {
            const pack = packs[packId];
            const tagBase = getTagBase(pack);
            const fragments = state.fragmentos[tagBase] || 0;
            const cost = getPackCost(pack);
            const totalCost = cost * amount;
            const totalFragments = FRAGMENTOS_POR_SOBRE * amount;
            const canBuy = state.coins >= totalCost;
            const canExchange = fragments >= totalFragments;

            return `
                <article class="shop-card">
                    <img src="${window.Tototo.escapeHTML(pack.portada)}" 
                         alt="Sobre ${window.Tototo.escapeHTML(pack.nombre || pack.id)}" 
                         class="pack-img"
                         loading="lazy"
                         onerror="this.style.opacity='0.25'">

                    <h3>${window.Tototo.escapeHTML(pack.nombre || pack.id)}</h3>

                    <p>Coste por sobre: <strong class="money">${window.Tototo.formatNumber(cost)} 🪙</strong></p>
                    <p>Coste x${window.Tototo.formatNumber(amount)}: <strong class="money">${window.Tototo.formatNumber(totalCost)} 🪙</strong></p>

                    <p>
                        Fragmentos ${window.Tototo.escapeHTML(tagBase)}:
                        <strong>${window.Tototo.formatNumber(fragments)} / ${window.Tototo.formatNumber(totalFragments)}</strong>
                    </p>

                    <div class="shop-actions">
                        <button class="card-button full-button"
                                data-buy-pack="${window.Tototo.escapeHTML(pack.id)}"
                                ${canBuy ? "" : "disabled"}>
                            Comprar x${window.Tototo.formatNumber(amount)}
                        </button>

                        <button class="secondary-button full-button"
                                data-exchange-pack="${window.Tototo.escapeHTML(pack.id)}"
                                ${canExchange ? "" : "disabled"}>
                            Canjear x${window.Tototo.formatNumber(amount)}
                        </button>
                    </div>
                </article>
            `;
        }).join("");

        bindShopButtons();
        bindAmountSelector();
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

    function bindAmountSelector() {
        const selector = document.getElementById("pack-open-amount");
        if (!selector || selector.dataset.boundPackAmount) return;

        selector.dataset.boundPackAmount = "true";
        selector.addEventListener("change", () => render());
    }

    function getOpenAmount() {
        const select = document.getElementById("pack-open-amount");
        const value = Number(select?.value || 1);
        return [1, 5, 10, 100].includes(value) ? value : 1;
    }

    function comprarSobre(packId, conFragmentos = false) {
        const amount = getOpenAmount();

        if (amount === 1) {
            return comprarUnSobre(packId, conFragmentos, true);
        }

        let abiertos = 0;
        let nuevos = 0;
        let duplicados = 0;
        let fragmentosTotales = 0;

        const rarezas = { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 };

        for (let i = 0; i < amount; i++) {
            const resultado = comprarUnSobre(packId, conFragmentos, false);

            if (!resultado) break;

            abiertos++;

            if (resultado.prize?.rareza) {
                rarezas[resultado.prize.rareza] = (rarezas[resultado.prize.rareza] || 0) + 1;
            }

            if (resultado.isDuplicate) {
                duplicados++;
                fragmentosTotales += resultado.fragmentsEarned || 0;
            } else {
                nuevos++;
            }
        }

        if (abiertos > 0) {
            mostrarResumenMultiple({
                abiertos,
                nuevos,
                duplicados,
                fragmentosTotales,
                rarezas
            });

            window.Tototo.toast(`Has abierto ${abiertos} sobres.`, "success");
            refrescarTrasCompra();
        }

        return abiertos;
    }

    function comprarUnSobre(packId, conFragmentos = false, mostrarModal = true) {
        const packs = window.Tototo.getShopPacks();
        const pack = packs[packId];

        if (!pack) {
            if (mostrarModal) {
                window.Tototo.toast("Ese sobre no existe.", "danger");
                window.Sounds?.play?.("error");
            }
            return null;
        }

        const state = window.Tototo.getState();
        const tagBase = getTagBase(pack);

        if (conFragmentos) {
            const fragments = state.fragmentos[tagBase] || 0;

            if (fragments < FRAGMENTOS_POR_SOBRE) {
                if (mostrarModal) {
                    window.Tototo.toast(`Necesitas ${FRAGMENTOS_POR_SOBRE} fragmentos ${tagBase}.`, "warning");
                    window.Sounds?.play?.("error");
                }
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
                if (mostrarModal) {
                    window.Tototo.toast("No tienes monedas suficientes.", "warning");
                    window.Sounds?.play?.("error");
                }
                return null;
            }
        }

        const prize = obtenerCromoDeSobre(pack);

        if (!prize) {
            if (mostrarModal) {
                window.Tototo.toast("Este sobre no tiene cromos disponibles. Revisa tags y CSV.", "danger");
                window.Sounds?.play?.("error");
            }
            return null;
        }

        const isDuplicate = state.inventario.includes(prize.id);
        let fragmentsEarned = 0;

        if (isDuplicate) {
            fragmentsEarned = calcularFragmentosDuplicado(prize);
            const tagDestino = getTagDestinoFragmentos(prize, tagBase);

            state.fragmentos[tagDestino] = (state.fragmentos[tagDestino] || 0) + fragmentsEarned;

            if (mostrarModal) {
                window.Tototo.toast(
                    `Duplicado: ${prize.nombre}. +${fragmentsEarned} fragmentos ${tagDestino}.`,
                    "warning"
                );
                window.Sounds?.play?.("duplicate");
            }

            if (window.Missions?.onProgress) {
                window.Missions.onProgress("fragments", fragmentsEarned);
            }
        } else {
            state.inventario.push(prize.id);

            if (mostrarModal) {
                window.Tototo.toast(`Nuevo cromo: ${prize.nombre} (${prize.rareza})`, "success");

                if (prize.rareza === "UR") {
                    window.Sounds?.play?.("ur");
                } else {
                    window.Sounds?.play?.("newCard");
                }
            } else if (prize.rareza === "UR") {
                window.Sounds?.play?.("ur");
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

        if (mostrarModal) {
            mostrarResultadoSobre(pack, prize, isDuplicate, fragmentsEarned);
            refrescarTrasCompra();
        }

        return {
            prize,
            isDuplicate,
            fragmentsEarned
        };
    }

    function refrescarTrasCompra() {
        window.Tototo.recalculate();
        window.Tototo.save();

        render();

        if (window.Tototo.renderBackpack) window.Tototo.renderBackpack();
        if (window.Albums?.render) window.Albums.render();
        if (window.Statistics?.renderIfVisible) window.Statistics.renderIfVisible();

        if (window.Albums?.checkAllAlbumCompletionRewards) {
            window.Albums.checkAllAlbumCompletionRewards();
        }

        if (window.Achievements?.checkAll) window.Achievements.checkAll();
        if (window.Missions?.render) window.Missions.render();
        if (window.Upgrades?.renderSummary) window.Upgrades.renderSummary();

        window.Tototo.renderLight();
    }

    function mostrarResumenMultiple(data) {
        const body = document.getElementById("pack-result-body");
        const title = document.getElementById("pack-result-title");

        if (!body || !title) return;

        title.textContent = "Resumen de apertura";

        body.innerHTML = `
            <div class="card-detail-grid" style="width:100%">
                <div class="card-detail-row">
                    <span>Sobres abiertos</span>
                    <strong>${window.Tototo.formatNumber(data.abiertos)}</strong>
                </div>
                <div class="card-detail-row">
                    <span>Nuevos cromos</span>
                    <strong class="success-text">${window.Tototo.formatNumber(data.nuevos)}</strong>
                </div>
                <div class="card-detail-row">
                    <span>Duplicados</span>
                    <strong>${window.Tototo.formatNumber(data.duplicados)}</strong>
                </div>
                <div class="card-detail-row">
                    <span>Fragmentos obtenidos</span>
                    <strong class="money">+${window.Tototo.formatNumber(data.fragmentosTotales)}</strong>
                </div>
            </div>

            <div class="modal-stats" style="justify-content:center">
                ${Object.entries(data.rarezas).map(([rareza, cantidad]) => `
                    <span class="stat-pill rarity-${window.Tototo.escapeHTML(rareza)}">
                        ${window.Tototo.escapeHTML(rareza)}: ${window.Tototo.formatNumber(cantidad)}
                    </span>
                `).join("")}
            </div>

            <button class="secondary-button" type="button" data-result-close>
                Cerrar
            </button>
        `;

        body.querySelector("[data-result-close]")?.addEventListener("click", () => {
            window.Tototo.closeModals();
        });

        window.Tototo.openModal("pack-result-modal");
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
