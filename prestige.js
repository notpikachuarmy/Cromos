/* =========================================================
   TOTOTO CLICKER 2.0 - PRESTIGE.JS
   Prestigio por álbum:
   - Solo afecta al álbum elegido.
   - Elimina del inventario los cromos de ese álbum.
   - Mantiene la producción pasiva ya ganada.
   - Permite volver a completar el álbum para sumar otra vez.
   ========================================================= */

window.Prestige = (() => {
    function prestigeAlbum(albumId) {
        const state = window.Tototo.getState();
        const album = window.Tototo.getAlbums().find(item => item.id === albumId);
        const cards = window.Tototo.getCardsByAlbum(albumId);

        if (!album) {
            window.Tototo.toast("Álbum no encontrado.", "danger");
            window.Sounds?.play?.("error");
            return false;
        }

        if (!cards.length) {
            window.Tototo.toast("Este álbum no tiene cromos asociados.", "warning");
            window.Sounds?.play?.("error");
            return false;
        }

        if (!window.Tototo.isAlbumComplete(albumId)) {
            window.Tototo.toast("Solo puedes prestigiar un álbum completo.", "warning");
            window.Sounds?.play?.("error");
            return false;
        }

        const currentPrestige = state.albumPrestige[albumId] || 0;
        const currentClaims = state.albumPassiveClaims[albumId] || 0;
        const passiveNow = cards.length * 10 * currentClaims;
        const nextPassiveReward = cards.length * 10;

        const ok = confirm(
            `¿Prestigiar el álbum "${album.nombre}"?\n\n` +
            `Se eliminarán SOLO los cromos de este álbum.\n` +
            `Mantendrás la producción pasiva ya obtenida: ${window.Tototo.formatNumber(passiveNow)}/s.\n\n` +
            `Prestigio actual: ${currentPrestige}\n` +
            `Al completarlo otra vez ganarás otros +${window.Tototo.formatNumber(nextPassiveReward)}/s.`
        );

        if (!ok) return false;

        removeAlbumCardsFromInventory(albumId);

        state.albumPrestige[albumId] = currentPrestige + 1;

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

        window.Tototo.toast(
            `Prestigio aplicado a ${album.nombre}. Ahora tiene prestigio ${state.albumPrestige[albumId]}.`,
            "success"
        );

        window.Sounds?.play?.("prestige");

        refreshAfterPrestige(albumId);

        return true;
    }

    function removeAlbumCardsFromInventory(albumId) {
        const state = window.Tototo.getState();
        const cards = window.Tototo.getCardsByAlbum(albumId);
        const idsToRemove = new Set(cards.map(card => card.id));

        state.inventario = state.inventario.filter(cardId => !idsToRemove.has(cardId));
    }

    function refreshAfterPrestige(albumId) {
        if (window.Albums?.render) {
            window.Albums.render();
        }

        if (window.Albums?.openAlbum) {
            window.Albums.openAlbum(albumId);
        }

        if (window.Statistics?.renderIfVisible) {
            window.Statistics.renderIfVisible();
        }

        if (window.Achievements?.checkAll) {
            window.Achievements.checkAll();
        }

        if (window.Missions?.render) {
            window.Missions.render();
        }

        if (window.Upgrades?.renderSummary) {
            window.Upgrades.renderSummary();
        }

        window.Tototo.renderLight();
    }

    function canPrestige(albumId) {
        return window.Tototo.isAlbumComplete(albumId);
    }

    function getAlbumPrestigeInfo(albumId) {
        const state = window.Tototo.getState();
        const album = window.Tototo.getAlbums().find(item => item.id === albumId);
        const cards = window.Tototo.getCardsByAlbum(albumId);
        const prestige = state.albumPrestige[albumId] || 0;
        const claims = state.albumPassiveClaims[albumId] || 0;

        return {
            album,
            totalCards: cards.length,
            prestige,
            passiveClaims: claims,
            currentPassive: cards.length * 10 * claims,
            nextCompletionReward: cards.length * 10,
            canPrestige: canPrestige(albumId)
        };
    }

    function getTotalPrestigeCount() {
        const state = window.Tototo.getState();

        return Object.values(state.albumPrestige || {})
            .reduce((sum, value) => sum + (Number(value) || 0), 0);
    }

    function getMaxPrestige() {
        const state = window.Tototo.getState();
        const values = Object.values(state.albumPrestige || {}).map(value => Number(value) || 0);

        return values.length ? Math.max(...values) : 0;
    }

    function getAlbumWithMaxPrestige() {
        const state = window.Tototo.getState();
        const albums = window.Tototo.getAlbums();

        let best = null;
        let bestValue = -1;

        albums.forEach(album => {
            const value = state.albumPrestige[album.id] || 0;

            if (value > bestValue) {
                best = album;
                bestValue = value;
            }
        });

        return {
            album: best,
            prestige: Math.max(0, bestValue)
        };
    }

    return {
        prestigeAlbum,
        canPrestige,
        getAlbumPrestigeInfo,
        getTotalPrestigeCount,
        getMaxPrestige,
        getAlbumWithMaxPrestige,
        removeAlbumCardsFromInventory
    };
})();
"""

path = Path("/mnt/data/prestige.js")
path.write_text(prestige_js, encoding="utf-8")
print(f"Archivo creado: {path}")
