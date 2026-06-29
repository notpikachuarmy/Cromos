/* =========================================================
   TOTOTO CLICKER 2.0 - ENCYCLOPEDIA.JS
   Enciclopedia de cromos:
   - Registra veces obtenido.
   - Registra duplicados.
   - Registra fragmentos generados.
   - Guarda primera y última obtención.
   - Muestra ficha detallada del cromo.
   ========================================================= */

window.Encyclopedia = (() => {
    function registerCard(card, isDuplicate = false, fragmentsGenerated = 0) {
        if (!card || !card.id) return;

        const state = window.Tototo.getState();

        if (!state.encyclopedia) {
            state.encyclopedia = {};
        }

        if (!state.encyclopedia[card.id]) {
            state.encyclopedia[card.id] = createEntry(card);
        }

        const entry = state.encyclopedia[card.id];

        entry.cardId = card.id;
        entry.name = card.nombre;
        entry.rarity = card.rareza;
        entry.timesObtained = (entry.timesObtained || 0) + 1;
        entry.lastObtainedAt = Date.now();

        if (!entry.firstObtainedAt) {
            entry.firstObtainedAt = Date.now();
        }

        if (isDuplicate) {
            entry.duplicates = (entry.duplicates || 0) + 1;
            entry.fragmentsGenerated = (entry.fragmentsGenerated || 0) + (Number(fragmentsGenerated) || 0);
        }

        window.Tototo.save?.();
    }

    function createEntry(card) {
        return {
            cardId: card.id,
            name: card.nombre,
            rarity: card.rareza,
            timesObtained: 0,
            duplicates: 0,
            fragmentsGenerated: 0,
            firstObtainedAt: null,
            lastObtainedAt: null
        };
    }

    function ensureEntry(card) {
        const state = window.Tototo.getState();

        if (!state.encyclopedia) {
            state.encyclopedia = {};
        }

        if (!state.encyclopedia[card.id]) {
            state.encyclopedia[card.id] = createEntry(card);

            if (state.inventario.includes(card.id)) {
                state.encyclopedia[card.id].timesObtained = 1;
            }
        }

        return state.encyclopedia[card.id];
    }

    function openCard(cardId) {
        const card = window.Tototo.getCards().find(item => item.id === cardId);
        const detail = document.getElementById("card-detail");

        if (!card || !detail) {
            window.Tototo.toast("No se pudo abrir la ficha del cromo.", "danger");
            return;
        }

        const state = window.Tototo.getState();
        const owned = state.inventario.includes(card.id);
        const album = window.Tototo.getMainAlbumOfCard(card);
        const entry = ensureEntry(card);
        const advanced = window.Upgrades?.hasAdvancedEncyclopedia?.() || false;

        detail.innerHTML = renderCardDetail(card, album, entry, owned, advanced);

        window.Tototo.openModal("card-modal");
    }

    function renderCardDetail(card, album, entry, owned, advanced) {
        const lockedClass = owned ? "" : "bloqueado";
        const cardName = owned ? card.nombre : "Cromo bloqueado";
        const status = owned ? "Desbloqueado" : "Bloqueado";
        const albumPrestige = album
            ? (window.Tototo.getState().albumPrestige?.[album.id] || 0)
            : 0;

        const basicRows = [
            ["Rareza", card.rareza],
            ["Álbum", album?.nombre || "Sin álbum"],
            ["Estado", status],
            ["Prestigio del álbum", `⭐ ${window.Tototo.formatNumber(albumPrestige)}`]
        ];

        const advancedRows = [
            ["Veces obtenido", window.Tototo.formatNumber(entry.timesObtained || (owned ? 1 : 0))],
            ["Duplicados", window.Tototo.formatNumber(entry.duplicates || 0)],
            ["Fragmentos generados", window.Tototo.formatNumber(entry.fragmentsGenerated || 0)],
            ["Primera obtención", formatDate(entry.firstObtainedAt)],
            ["Última obtención", formatDate(entry.lastObtainedAt)]
        ];

        const rows = advanced ? [...basicRows, ...advancedRows] : basicRows;

        return `
            <img src="${window.Tototo.escapeHTML(card.imagen)}"
                 alt="${window.Tototo.escapeHTML(cardName)}"
                 class="cromo-img rareza-${window.Tototo.escapeHTML(card.rareza)} ${lockedClass}"
                 onerror="this.style.opacity='0.25'">

            <div class="card-detail-info">
                <h2 id="card-modal-title">${window.Tototo.escapeHTML(cardName)}</h2>

                <p class="text-muted">
                    ${advanced
                        ? "Ficha de enciclopedia avanzada."
                        : "Compra la mejora Enciclopedia avanzada en el Laboratorio para ver estadísticas completas."}
                </p>

                <div class="card-detail-grid">
                    ${rows.map(([label, value]) => `
                        <div class="card-detail-row">
                            <span>${window.Tototo.escapeHTML(label)}</span>
                            <strong>${window.Tototo.escapeHTML(value)}</strong>
                        </div>
                    `).join("")}
                </div>

                ${renderTags(card)}
            </div>
        `;
    }

    function renderTags(card) {
        if (!card.tags || !card.tags.length) return "";

        return `
            <div class="modal-stats" style="margin-top:18px">
                ${card.tags.map(tag => `
                    <span class="stat-pill">${window.Tototo.escapeHTML(tag)}</span>
                `).join("")}
            </div>
        `;
    }

    function formatDate(timestamp) {
        if (!timestamp) return "No registrada";

        try {
            return new Intl.DateTimeFormat("es-ES", {
                dateStyle: "short",
                timeStyle: "short"
            }).format(new Date(timestamp));
        } catch (error) {
            return "No registrada";
        }
    }

    function getEntry(cardId) {
        const state = window.Tototo.getState();
        return state.encyclopedia?.[cardId] || null;
    }

    function getAllEntries() {
        const state = window.Tototo.getState();
        return state.encyclopedia || {};
    }

    function rebuildFromInventory() {
        const state = window.Tototo.getState();
        const cards = window.Tototo.getCards();

        if (!state.encyclopedia) {
            state.encyclopedia = {};
        }

        state.inventario.forEach(cardId => {
            const card = cards.find(item => item.id === cardId);
            if (!card) return;

            const entry = ensureEntry(card);
            if (!entry.timesObtained) {
                entry.timesObtained = 1;
            }
        });

        window.Tototo.save?.();
    }

    function getCardStats(cardId) {
        const card = window.Tototo.getCards().find(item => item.id === cardId);
        if (!card) return null;

        const entry = ensureEntry(card);
        const owned = window.Tototo.getState().inventario.includes(cardId);
        const album = window.Tototo.getMainAlbumOfCard(card);

        return {
            card,
            entry,
            owned,
            album
        };
    }

    return {
        registerCard,
        openCard,
        getEntry,
        getAllEntries,
        rebuildFromInventory,
        getCardStats,
        ensureEntry
    };
})();
"""

path = Path("/mnt/data/encyclopedia.js")
path.write_text(encyclopedia_js, encoding="utf-8")
print(f"Archivo creado: {path}")
