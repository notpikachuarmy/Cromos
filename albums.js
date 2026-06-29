/* =========================================================
   TOTOTO CLICKER 2.0 - ALBUMS.JS
   Render de álbumes, modal de cromos, progreso y conexión
   con prestigio/enciclopedia/logros/estadísticas.
   ========================================================= */

window.Albums = (() => {
    function render() {
        renderGlobalStats();
        renderAlbumList();
    }

    function renderGlobalStats() {
        const cards = window.Tototo.getCards();
        const albums = window.Tototo.getAlbums();
        const state = window.Tototo.getState();

        const totalPercent = document.getElementById("global-total-percent");
        const rarityCounts = document.getElementById("global-rareza-counts");
        const albumsCompleted = document.getElementById("global-albums-completed");

        if (!totalPercent || !rarityCounts || !albumsCompleted) return;

        const totalCards = cards.length;
        const ownedCards = state.inventario.length;
        const progress = window.Tototo.percentage(ownedCards, totalCards);

        const completed = albums.filter(album => window.Tototo.isAlbumComplete(album.id)).length;

        totalPercent.innerHTML = `
            <h3>Progreso global: ${Math.round(progress)}%</h3>
            <p>${window.Tototo.formatNumber(ownedCards)} / ${window.Tototo.formatNumber(totalCards)} cromos únicos</p>
            <div class="album-progress-bar">
                <div class="album-progress-fill" style="width:${progress}%"></div>
            </div>
        `;

        const rarities = window.Tototo.getRarities();
        const totalByRarity = {};
        const ownedByRarity = {};

        rarities.forEach(rarity => {
            totalByRarity[rarity] = 0;
            ownedByRarity[rarity] = 0;
        });

        cards.forEach(card => {
            totalByRarity[card.rareza] = (totalByRarity[card.rareza] || 0) + 1;
            if (state.inventario.includes(card.id)) {
                ownedByRarity[card.rareza] = (ownedByRarity[card.rareza] || 0) + 1;
            }
        });

        rarityCounts.innerHTML = rarities.map(rarity => `
            <span class="rarity-pill rarity-${window.Tototo.escapeHTML(rarity)}">
                ${window.Tototo.escapeHTML(rarity)}:
                ${window.Tototo.formatNumber(ownedByRarity[rarity] || 0)}
                /
                ${window.Tototo.formatNumber(totalByRarity[rarity] || 0)}
            </span>
        `).join("");

        albumsCompleted.textContent = `Álbumes completados ahora: ${window.Tototo.formatNumber(completed)} / ${window.Tototo.formatNumber(albums.length)}`;
    }

    function renderAlbumList() {
        const container = document.getElementById("album-container");
        if (!container) return;

        const albums = window.Tototo.getAlbums();
        const state = window.Tototo.getState();

        if (!albums.length) {
            container.innerHTML = `<div class="empty-state">No hay álbumes configurados.</div>`;
            return;
        }

        container.innerHTML = albums.map(album => {
            const cards = window.Tototo.getCardsByAlbum(album.id);
            const owned = cards.filter(card => state.inventario.includes(card.id)).length;
            const total = cards.length;
            const progress = window.Tototo.percentage(owned, total);
            const complete = total > 0 && owned === total;
            const prestige = state.albumPrestige[album.id] || 0;
            const claims = state.albumPassiveClaims[album.id] || 0;
            const passive = total * 10 * claims;

            return `
                <article class="album-cover-card" data-open-album="${window.Tototo.escapeHTML(album.id)}">
                    <img src="${window.Tototo.escapeHTML(album.portada)}"
                         alt="Portada ${window.Tototo.escapeHTML(album.nombre)}"
                         class="album-cover-img ${complete ? "" : "incompleto"}"
                         loading="lazy"
                         onerror="this.style.opacity='0.25'">

                    <div class="album-meta">
                        <h3>${window.Tototo.escapeHTML(album.nombre)}</h3>

                        ${complete ? `<span class="album-complete-badge">Completado</span>` : ""}

                        <div class="progress-line">
                            <span>Cromos</span>
                            <strong>${window.Tototo.formatNumber(owned)} / ${window.Tototo.formatNumber(total)}</strong>
                        </div>

                        <div class="album-progress-bar">
                            <div class="album-progress-fill" style="width:${progress}%"></div>
                        </div>

                        <div class="progress-line">
                            <span>Prestigio</span>
                            <strong>⭐ ${window.Tototo.formatNumber(prestige)}</strong>
                        </div>

                        <div class="progress-line">
                            <span>Pasiva álbum</span>
                            <strong>${window.Tototo.formatNumber(passive)}/s</strong>
                        </div>
                    </div>
                </article>
            `;
        }).join("");

        bindAlbumButtons();
    }

    function bindAlbumButtons() {
        document.querySelectorAll("[data-open-album]").forEach(card => {
            if (card.dataset.boundAlbumOpen) return;
            card.dataset.boundAlbumOpen = "true";

            card.addEventListener("click", () => {
                openAlbum(card.dataset.openAlbum);
            });
        });
    }

    function openAlbum(albumId) {
        const album = window.Tototo.getAlbums().find(item => item.id === albumId);
        if (!album) return;

        window.Tototo.setCurrentAlbum(albumId);

        const state = window.Tototo.getState();
        const cards = window.Tototo.getCardsByAlbum(albumId);
        const owned = cards.filter(card => state.inventario.includes(card.id)).length;
        const total = cards.length;
        const complete = total > 0 && owned === total;
        const progress = window.Tototo.percentage(owned, total);
        const prestige = state.albumPrestige[albumId] || 0;
        const claims = state.albumPassiveClaims[albumId] || 0;
        const passive = total * 10 * claims;
        const nextReward = total * 10;

        const title = document.getElementById("album-modal-title");
        const subtitle = document.getElementById("album-modal-subtitle");
        const stats = document.getElementById("album-modal-stats");
        const grid = document.getElementById("album-modal-grid");
        const prestigeButton = document.getElementById("prestige-album-button");

        if (!title || !subtitle || !stats || !grid || !prestigeButton) return;

        title.textContent = album.nombre;
        subtitle.textContent = complete
            ? "Álbum completo. Puedes prestigiarlo para vaciar sus cromos y volver a ganar producción pasiva."
            : "Consigue todos los cromos para reclamar su producción pasiva y desbloquear el prestigio.";

        stats.innerHTML = `
            <span class="stat-pill">Cromos: ${window.Tototo.formatNumber(owned)} / ${window.Tototo.formatNumber(total)}</span>
            <span class="stat-pill">Progreso: ${Math.round(progress)}%</span>
            <span class="stat-pill">Prestigio: ⭐ ${window.Tototo.formatNumber(prestige)}</span>
            <span class="stat-pill">Pasiva actual: ${window.Tototo.formatNumber(passive)}/s</span>
            <span class="stat-pill">Nueva recompensa al completar: +${window.Tototo.formatNumber(nextReward)}/s</span>
        `;

        grid.innerHTML = cards.map(card => renderCardInAlbum(card, state)).join("");

        bindCardButtons();

        prestigeButton.disabled = !complete;
        prestigeButton.textContent = complete
            ? `Prestigiar ${album.nombre}`
            : "Completa el álbum para prestigiar";

        prestigeButton.onclick = () => {
            if (window.Prestige?.prestigeAlbum) {
                window.Prestige.prestigeAlbum(albumId);
            } else {
                prestigeAlbumFallback(albumId);
            }
        };

        if (complete) {
            ensureAlbumCompletionReward(albumId);
        }

        window.Tototo.openModal("album-modal");
    }

    function renderCardInAlbum(card, state) {
        const owned = state.inventario.includes(card.id);
        const info = state.encyclopedia?.[card.id] || {};
        const timesObtained = info.timesObtained || (owned ? 1 : 0);

        return `
            <article class="cromo-card ${owned ? "" : "locked"}"
                     data-open-card="${window.Tototo.escapeHTML(card.id)}">
                <img src="${window.Tototo.escapeHTML(card.imagen)}"
                     alt="${owned ? window.Tototo.escapeHTML(card.nombre) : "Cromo bloqueado"}"
                     class="cromo-img rareza-${window.Tototo.escapeHTML(card.rareza)} ${owned ? "" : "bloqueado"}"
                     loading="lazy"
                     onerror="this.style.opacity='0.25'">

                <span class="cromo-name">
                    ${owned ? window.Tototo.escapeHTML(card.nombre) : "???"}
                </span>

                <span class="cromo-name text-muted">
                    ${window.Tototo.escapeHTML(card.rareza)}
                    ${timesObtained > 1 ? ` · x${window.Tototo.formatNumber(timesObtained)}` : ""}
                </span>
            </article>
        `;
    }

    function bindCardButtons() {
        document.querySelectorAll("[data-open-card]").forEach(cardElement => {
            if (cardElement.dataset.boundCardOpen) return;
            cardElement.dataset.boundCardOpen = "true";

            cardElement.addEventListener("click", event => {
                event.stopPropagation();

                const cardId = cardElement.dataset.openCard;

                if (window.Encyclopedia?.openCard) {
                    window.Encyclopedia.openCard(cardId);
                } else {
                    openCardFallback(cardId);
                }
            });
        });
    }

    function ensureAlbumCompletionReward(albumId) {
        const state = window.Tototo.getState();
        const album = window.Tototo.getAlbums().find(item => item.id === albumId);
        const cards = window.Tototo.getCardsByAlbum(albumId);

        if (!album || !cards.length) return false;
        if (!window.Tototo.isAlbumComplete(albumId)) return false;

        const prestige = state.albumPrestige[albumId] || 0;
        const currentClaims = state.albumPassiveClaims[albumId] || 0;
        const expectedClaims = prestige + 1;

        if (currentClaims >= expectedClaims) return false;

        state.albumPassiveClaims[albumId] = expectedClaims;

        const reward = cards.length * 10;

        window.Tototo.recalculate();
        window.Tototo.save();

        window.Tototo.toast(
            `Álbum completado: ${album.nombre}. +${window.Tototo.formatNumber(reward)}/s de producción pasiva.`,
            "success"
        );

        if (window.Sounds?.play) window.Sounds.play("achievement");

        if (window.Achievements?.checkAll) {
            window.Achievements.checkAll();
        }

        return true;
    }

    function checkAllAlbumCompletionRewards() {
        let changed = false;

        window.Tototo.getAlbums().forEach(album => {
            if (ensureAlbumCompletionReward(album.id)) {
                changed = true;
            }
        });

        if (changed) {
            render();
            window.Tototo.renderLight();
        }

        return changed;
    }

    function prestigeAlbumFallback(albumId) {
        const state = window.Tototo.getState();
        const album = window.Tototo.getAlbums().find(item => item.id === albumId);
        const cards = window.Tototo.getCardsByAlbum(albumId);

        if (!album) return;

        if (!window.Tototo.isAlbumComplete(albumId)) {
            window.Tototo.toast("Solo puedes prestigiar un álbum completo.", "warning");
            window.Sounds?.play?.("error");
            return;
        }

        const ok = confirm(
            `¿Prestigiar el álbum "${album.nombre}"?\n\n` +
            "Se eliminarán de tu inventario solo los cromos de este álbum.\n" +
            "Mantendrás la producción pasiva ya conseguida y podrás volver a completarlo para sumarla otra vez."
        );

        if (!ok) return;

        const cardIds = new Set(cards.map(card => card.id));
        state.inventario = state.inventario.filter(cardId => !cardIds.has(cardId));

        state.albumPrestige[albumId] = (state.albumPrestige[albumId] || 0) + 1;

        if (window.Statistics?.registerAlbumPrestige) {
            window.Statistics.registerAlbumPrestige(albumId);
        } else {
            state.stats.totalAlbumPrestiges = (state.stats.totalAlbumPrestiges || 0) + 1;
            state.stats.maxAlbumPrestige = Math.max(
                state.stats.maxAlbumPrestige || 0,
                state.albumPrestige[albumId]
            );
        }

        window.Tototo.recalculate();
        window.Tototo.save();

        window.Tototo.toast(`Prestigio aplicado a ${album.nombre}.`, "success");
        window.Sounds?.play?.("prestige");

        render();
        openAlbum(albumId);
        window.Tototo.renderLight();

        if (window.Statistics?.renderIfVisible) window.Statistics.renderIfVisible();
        if (window.Achievements?.checkAll) window.Achievements.checkAll();
    }

    function openCardFallback(cardId) {
        const state = window.Tototo.getState();
        const card = window.Tototo.getCards().find(item => item.id === cardId);
        const detail = document.getElementById("card-detail");

        if (!card || !detail) return;

        const owned = state.inventario.includes(card.id);
        const album = window.Tototo.getMainAlbumOfCard(card);
        const info = state.encyclopedia?.[card.id] || {};

        detail.innerHTML = `
            <img src="${window.Tototo.escapeHTML(card.imagen)}"
                 alt="${window.Tototo.escapeHTML(card.nombre)}"
                 class="cromo-img rareza-${window.Tototo.escapeHTML(card.rareza)} ${owned ? "" : "bloqueado"}"
                 onerror="this.style.opacity='0.25'">

            <div class="card-detail-info">
                <h2 id="card-modal-title">${owned ? window.Tototo.escapeHTML(card.nombre) : "Cromo bloqueado"}</h2>

                <div class="card-detail-grid">
                    <div class="card-detail-row">
                        <span>Rareza</span>
                        <strong>${window.Tototo.escapeHTML(card.rareza)}</strong>
                    </div>
                    <div class="card-detail-row">
                        <span>Álbum</span>
                        <strong>${window.Tototo.escapeHTML(album?.nombre || "Sin álbum")}</strong>
                    </div>
                    <div class="card-detail-row">
                        <span>Estado</span>
                        <strong>${owned ? "Desbloqueado" : "Bloqueado"}</strong>
                    </div>
                    <div class="card-detail-row">
                        <span>Veces obtenido</span>
                        <strong>${window.Tototo.formatNumber(info.timesObtained || (owned ? 1 : 0))}</strong>
                    </div>
                    <div class="card-detail-row">
                        <span>Duplicados</span>
                        <strong>${window.Tototo.formatNumber(info.duplicates || 0)}</strong>
                    </div>
                    <div class="card-detail-row">
                        <span>Fragmentos generados</span>
                        <strong>${window.Tototo.formatNumber(info.fragmentsGenerated || 0)}</strong>
                    </div>
                </div>
            </div>
        `;

        window.Tototo.openModal("card-modal");
    }

    function getAlbumProgress(albumId) {
        const state = window.Tototo.getState();
        const cards = window.Tototo.getCardsByAlbum(albumId);
        const owned = cards.filter(card => state.inventario.includes(card.id)).length;

        return {
            owned,
            total: cards.length,
            percent: window.Tototo.percentage(owned, cards.length),
            complete: cards.length > 0 && owned === cards.length
        };
    }

    return {
        render,
        renderGlobalStats,
        renderAlbumList,
        openAlbum,
        checkAllAlbumCompletionRewards,
        ensureAlbumCompletionReward,
        getAlbumProgress
    };
})();
