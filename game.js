/* =========================================================
   TOTOTO CLICKER 2.0 - GAME.JS
   Núcleo del juego: carga CSV, estado global, navegación,
   click principal, bucle pasivo e inicialización.
   ========================================================= */

/* =========================
   CONFIGURACIÓN CSV
   ========================= */

const LINK_CSV_CROMOS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQVmg-Qn17A0Ms4NLdYAbQHcwkVrvwPD7ORJxKlMDNcY6JGTfQ7p_i4LCiy0-B74Wcs_9Jwc1nZ1KfO/pub?output=csv";
const LINK_CSV_ALBUMES = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwFTVpC8PBxaPzki-PImk153OhSllxX3_iot9FdLpnVzYWJpxq8DbU5NHTkiXsZN2peQI9XkbD9gh1/pub?output=csv";

/* =========================
   BASE DE DATOS EN MEMORIA
   ========================= */

let BASE_DE_CROMOS = [];
let CONFIG_ALBUMES = [];
let SOBRES_TIENDA = {};

let CURRENT_ALBUM_ID = null;
let CURRENT_ACHIEVEMENT_FILTER = "todos";

const RAREZAS = ["N", "R", "SR", "SSR", "UR"];

const DEFAULT_RARITY_STATS = {
    N: 0,
    R: 0,
    SR: 0,
    SSR: 0,
    UR: 0
};

/* =========================
   ESTADO DEL JUEGO
   ========================= */

function crearEstadoBase() {
    return {
        version: 2,

        coins: 0,
        totalPassive: 0,

        clickValue: 1,
        baseClickValue: 1,

        inventario: [],
        fragmentos: {},

        albumPrestige: {},
        albumPassiveClaims: {},

        upgrades: {},

        achievements: {
            claimed: {}
        },

        missions: {
            current: null,
            completed: 0
        },

        encyclopedia: {},

        stats: {
            clicks: 0,
            coinsEarned: 0,
            coinsSpent: 0,

            totalPacksOpened: 0,
            packsByAlbum: {},

            raritiesObtained: { ...DEFAULT_RARITY_STATS },

            duplicates: 0,
            fragmentsEarned: 0,
            fragmentsSpent: 0,

            newCardsObtained: 0,
            completedAlbums: 0,
            maxAlbumPrestige: 0,
            totalAlbumPrestiges: 0,

            achievementsUnlocked: 0,
            missionsCompleted: 0,

            startedAt: Date.now(),
            lastPlayedAt: Date.now(),
            playTimeSeconds: 0
        },

        settings: {
            soundEnabled: true
        }
    };
}

let gameState = crearEstadoBase();

/* =========================
   INICIO
   ========================= */

document.addEventListener("DOMContentLoaded", () => {
    iniciarJuego();
});

async function iniciarJuego() {
    try {
        prepararNavegacion();
        prepararModales();
        prepararBotonesSistema();

        await cargarDatosCSV();

        if (window.SaveSystem?.load) {
            gameState = window.SaveSystem.load(crearEstadoBase());
        } else {
            const raw = localStorage.getItem("tototo_save_v2");
            gameState = raw ? JSON.parse(raw) : crearEstadoBase();
        }

        normalizarEstado();
        recalcularDerivados();

        if (window.Achievements?.buildAlbumAchievements) {
            window.Achievements.buildAlbumAchievements(CONFIG_ALBUMES);
        }

        if (window.Missions?.ensureMission) {
            window.Missions.ensureMission();
        }

        renderTodo();
        iniciarLoops();

        toast("Tototo Clicker 2.0 cargado.", "success");
    } catch (error) {
        console.error(error);
        toast("Error cargando el juego. Revisa la consola.", "danger");
    }
}

/* =========================
   CARGA CSV
   ========================= */

async function cargarDatosCSV() {
    const [resCromos, resAlbumes] = await Promise.all([
        fetch(LINK_CSV_CROMOS),
        fetch(LINK_CSV_ALBUMES)
    ]);

    if (!resCromos.ok || !resAlbumes.ok) {
        throw new Error("No se pudieron cargar los CSV.");
    }

    const cromosCSV = await resCromos.text();
    const albumesCSV = await resAlbumes.text();

    parsearCromos(cromosCSV);
    parsearAlbumes(albumesCSV);
}

function parseCSVLine(line) {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const next = line[i + 1];

        if (char === '"' && insideQuotes && next === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
            result.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

function parsearCromos(csv) {
    BASE_DE_CROMOS = [];

    const filas = csv
        .split(/\r?\n/)
        .filter(fila => fila.trim() !== "")
        .slice(1);

    BASE_DE_CROMOS = filas.map(fila => {
        const columnas = parseCSVLine(fila);
        const [id, nombre, rareza, tags] = columnas;

        const rarezaNormalizada = String(rareza || "N").trim().toUpperCase();

        return {
            id: String(id || "").trim(),
            nombre: String(nombre || "Cromo sin nombre").trim(),
            rareza: RAREZAS.includes(rarezaNormalizada) ? rarezaNormalizada : "N",
            tags: tags
                ? String(tags).split(";").map(tag => tag.toUpperCase().trim()).filter(Boolean)
                : [],
            imagen: `Cromos/${String(id || "").trim()}.png`
        };
    }).filter(cromo => cromo.id);
}

function parsearAlbumes(csv) {
    CONFIG_ALBUMES = [];
    SOBRES_TIENDA = {};

    const filas = csv
        .split(/\r?\n/)
        .filter(fila => fila.trim() !== "")
        .slice(1);

    filas.forEach(fila => {
        const columnas = parseCSVLine(fila);
        const [id, nombre, tags, inicio, fin, costo] = columnas;

        const albumId = String(id || "").trim();
        if (!albumId) return;

        const tagsArr = tags
            ? String(tags).split(";").map(tag => tag.toUpperCase().trim()).filter(Boolean)
            : [];

        const album = {
            id: albumId,
            nombre: String(nombre || albumId).trim(),
            tags: tagsArr,
            portada: `Portadas/${albumId}.png`,
            inicio: inicio || "",
            fin: fin || "",
            costo: parseInt(costo, 10) || 100
        };

        CONFIG_ALBUMES.push(album);

        SOBRES_TIENDA[albumId] = {
            id: albumId,
            nombre: album.nombre,
            costo: album.costo,
            portada: album.portada,
            tags: tagsArr
        };
    });
}

/* =========================
   NORMALIZACIÓN DEL ESTADO
   ========================= */

function normalizarEstado() {
    const base = crearEstadoBase();

    gameState = {
        ...base,
        ...gameState,
        stats: {
            ...base.stats,
            ...(gameState.stats || {}),
            raritiesObtained: {
                ...DEFAULT_RARITY_STATS,
                ...((gameState.stats && gameState.stats.raritiesObtained) || {})
            },
            packsByAlbum: {
                ...((gameState.stats && gameState.stats.packsByAlbum) || {})
            }
        },
        achievements: {
            ...base.achievements,
            ...(gameState.achievements || {}),
            claimed: {
                ...((gameState.achievements && gameState.achievements.claimed) || {})
            }
        },
        missions: {
            ...base.missions,
            ...(gameState.missions || {})
        },
        settings: {
            ...base.settings,
            ...(gameState.settings || {})
        },
        upgrades: {
            ...(gameState.upgrades || {})
        },
        encyclopedia: {
            ...(gameState.encyclopedia || {})
        },
        albumPrestige: {
            ...(gameState.albumPrestige || {})
        },
        albumPassiveClaims: {
            ...(gameState.albumPassiveClaims || {})
        },
        fragmentos: {
            ...(gameState.fragmentos || {})
        },
        inventario: Array.isArray(gameState.inventario) ? gameState.inventario : []
    };

    CONFIG_ALBUMES.forEach(album => {
        if (!Number.isFinite(gameState.albumPrestige[album.id])) {
            gameState.albumPrestige[album.id] = 0;
        }

        if (!Number.isFinite(gameState.albumPassiveClaims[album.id])) {
            gameState.albumPassiveClaims[album.id] = 0;
        }

        if (!Number.isFinite(gameState.stats.packsByAlbum[album.id])) {
            gameState.stats.packsByAlbum[album.id] = 0;
        }
    });

    RAREZAS.forEach(rareza => {
        if (!Number.isFinite(gameState.stats.raritiesObtained[rareza])) {
            gameState.stats.raritiesObtained[rareza] = 0;
        }
    });

    gameState.coins = Number(gameState.coins) || 0;
    gameState.clickValue = Number(gameState.clickValue) || 1;
    gameState.baseClickValue = Number(gameState.baseClickValue) || 1;
}

/* =========================
   CÁLCULOS GENERALES
   ========================= */

function recalcularDerivados() {
    gameState.clickValue = calcularClickValue();
    gameState.totalPassive = calcularProduccionPasivaTotal();

    gameState.stats.completedAlbums = contarAlbumesCompletos();
    gameState.stats.maxAlbumPrestige = calcularMaximoPrestigioAlbum();
    gameState.stats.achievementsUnlocked = Object.values(gameState.achievements.claimed || {}).filter(Boolean).length;
    gameState.stats.missionsCompleted = gameState.missions.completed || 0;
}

function calcularClickValue() {
    let value = gameState.baseClickValue || 1;

    if (window.Upgrades?.getClickBonusMultiplier) {
        value *= window.Upgrades.getClickBonusMultiplier();
    }

    return Math.max(1, Math.floor(value));
}

function calcularProduccionPasivaTotal() {
    let total = 0;

    if (window.Upgrades?.getPassiveFlatBonus) {
        total += window.Upgrades.getPassiveFlatBonus();
    }

    CONFIG_ALBUMES.forEach(album => {
        const cromosAlbum = getCromosDeAlbum(album.id);
        const claims = gameState.albumPassiveClaims[album.id] || 0;
        total += cromosAlbum.length * 10 * claims;
    });

    if (window.Upgrades?.getPassiveBonusMultiplier) {
        total *= window.Upgrades.getPassiveBonusMultiplier();
    }

    return Math.floor(total);
}

function contarAlbumesCompletos() {
    return CONFIG_ALBUMES.filter(album => albumEstaCompleto(album.id)).length;
}

function calcularMaximoPrestigioAlbum() {
    const valores = Object.values(gameState.albumPrestige || {});
    return valores.length ? Math.max(...valores.map(v => Number(v) || 0)) : 0;
}

function getCromosDeAlbum(albumId) {
    const album = CONFIG_ALBUMES.find(a => a.id === albumId);
    if (!album) return [];

    return BASE_DE_CROMOS.filter(cromo =>
        cromo.tags.some(tag => album.tags.includes(tag))
    );
}

function albumEstaCompleto(albumId) {
    const cromos = getCromosDeAlbum(albumId);
    if (!cromos.length) return false;

    return cromos.every(cromo => gameState.inventario.includes(cromo.id));
}

function getAlbumPrincipalDeCromo(cromo) {
    if (!cromo) return null;

    return CONFIG_ALBUMES.find(album =>
        cromo.tags.some(tag => album.tags.includes(tag))
    ) || null;
}

function getTagBaseDeAlbum(albumId) {
    const album = CONFIG_ALBUMES.find(a => a.id === albumId);
    return album?.tags?.[0] || "GENERAL";
}

/* =========================
   NAVEGACIÓN POR PESTAÑAS
   ========================= */

function prepararNavegacion() {
    document.querySelectorAll("[data-tab]").forEach(button => {
        button.addEventListener("click", () => {
            cambiarTab(button.dataset.tab);
        });
    });

    document.querySelectorAll("[data-tab-target]").forEach(button => {
        button.addEventListener("click", () => {
            cambiarTab(button.dataset.tabTarget);
        });
    });
}

function cambiarTab(tabId) {
    document.querySelectorAll(".tab-button").forEach(button => {
        button.classList.toggle("active", button.dataset.tab === tabId);
    });

    document.querySelectorAll(".tab-section").forEach(section => {
        section.classList.toggle("active", section.id === `tab-${tabId}`);
    });

    if (tabId === "estadisticas" && window.Statistics?.render) {
        window.Statistics.render();
    }

    if (tabId === "logros" && window.Achievements?.render) {
        window.Achievements.render(CURRENT_ACHIEVEMENT_FILTER);
    }

    if (tabId === "misiones" && window.Missions?.render) {
        window.Missions.render();
    }

    if (tabId === "laboratorio" && window.Upgrades?.render) {
        window.Upgrades.render();
    }
}

/* =========================
   CLICKS Y PASIVA
   ========================= */

function prepararClickPrincipal() {
    const button = document.getElementById("main-click-button");
    if (!button) return;

    button.addEventListener("click", event => {
        const gain = gameState.clickValue;
        ganarMonedas(gain);

        gameState.stats.clicks += 1;

        if (window.Missions?.onProgress) {
            window.Missions.onProgress("clicks", 1);
        }

        if (window.Sounds?.play) {
            window.Sounds.play("click");
        }

        crearNumeroFlotante(event, `+${gain}`);

        renderTodoLigero();
        guardar();
    });
}

function ganarMonedas(cantidad) {
    const value = Math.max(0, Number(cantidad) || 0);

    gameState.coins += value;
    gameState.stats.coinsEarned += value;

    actualizarInterfazEconomia();
}

function gastarMonedas(cantidad) {
    const value = Math.max(0, Number(cantidad) || 0);

    if (gameState.coins < value) {
        return false;
    }

    gameState.coins -= value;
    gameState.stats.coinsSpent += value;

    if (window.Missions?.onProgress) {
        window.Missions.onProgress("spendCoins", value);
    }

    actualizarInterfazEconomia();

    return true;
}

function actualizarInterfazEconomia() {

    recalcularDerivados();

    renderHeader();

    if (window.Shop?.render) {
        window.Shop.render();
    }

    if (window.Upgrades?.render) {
        window.Upgrades.render();
    }

    if (window.Missions?.renderPreview) {
        window.Missions.renderPreview();
    }

    if (window.Statistics?.renderIfVisible) {
        window.Statistics.renderIfVisible();
    }
}

function iniciarLoops() {
    prepararClickPrincipal();

    setInterval(() => {
        gameState.stats.playTimeSeconds += 1;
        gameState.stats.lastPlayedAt = Date.now();

        recalcularDerivados();

        if (gameState.totalPassive > 0) {
            ganarMonedas(gameState.totalPassive);
        }

        renderTodoLigero();

        if (gameState.stats.playTimeSeconds % 10 === 0) {
            guardar();
        }
    }, 1000);
}

function crearNumeroFlotante(event, texto) {
    const container = document.getElementById("floating-click-container");
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const span = document.createElement("span");
    span.className = "floating-number";
    span.textContent = texto;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    span.style.left = `${x}px`;
    span.style.top = `${y}px`;

    container.appendChild(span);

    setTimeout(() => span.remove(), 850);
}

/* =========================
   RENDER GLOBAL
   ========================= */

function renderTodo() {
    recalcularDerivados();

    renderHeader();
    renderHome();

    if (window.Shop?.render) window.Shop.render();
    if (window.Albums?.render) window.Albums.render();
    if (window.Upgrades?.render) window.Upgrades.render();
    if (window.Achievements?.render) window.Achievements.render(CURRENT_ACHIEVEMENT_FILTER);
    if (window.Missions?.render) window.Missions.render();
    if (window.Statistics?.render) window.Statistics.render();

    renderMochila();

    if (window.Achievements?.checkAll) {
        window.Achievements.checkAll();
    }
}

function renderTodoLigero() {
    recalcularDerivados();

    renderHeader();
    renderHome();

    if (window.Missions?.renderPreview) window.Missions.renderPreview();
    if (window.Statistics?.renderIfVisible) window.Statistics.renderIfVisible();
    if (window.Upgrades?.renderSummary) window.Upgrades.renderSummary();
}

function renderHeader() {
    setText("coin-count", formatNumber(Math.floor(gameState.coins)));
    setText("cps-count", formatNumber(gameState.totalPassive));
    setText("total-prestige-count", formatNumber(gameState.stats.totalAlbumPrestiges || 0));
}

function renderHome() {
    setText("click-value-label", formatNumber(gameState.clickValue));

    const totalCromos = BASE_DE_CROMOS.length;
    const unicos = gameState.inventario.length;

    setText("home-unique-cards", `${formatNumber(unicos)} / ${formatNumber(totalCromos)}`);
    setText("home-completed-albums", formatNumber(gameState.stats.completedAlbums || 0));
    setText("home-achievements", formatNumber(gameState.stats.achievementsUnlocked || 0));
}

function renderMochila() {
    const container = document.getElementById("fragment-inventory");
    if (!container) return;

    const tags = Object.keys(gameState.fragmentos || {})
        .filter(tag => (gameState.fragmentos[tag] || 0) > 0)
        .sort();

    if (!tags.length) {
        container.innerHTML = `<div class="empty-state">Mochila vacía.</div>`;
        return;
    }

    container.innerHTML = tags.map(tag => {
        const cantidad = gameState.fragmentos[tag] || 0;
        const progreso = Math.min(100, (cantidad / 50) * 100);

        return `
            <article class="fragment-card">
                <strong>${escapeHTML(tag)}</strong>
                <p>${formatNumber(cantidad)} / 50 fragmentos</p>
                <div class="frag-bar-bg">
                    <div class="frag-bar-fill" style="width:${progreso}%"></div>
                </div>
            </article>
        `;
    }).join("");
}

/* =========================
   MODALES
   ========================= */

function prepararModales() {
    document.querySelectorAll("[data-close-modal]").forEach(button => {
        button.addEventListener("click", cerrarModales);
    });

    document.querySelectorAll(".modal").forEach(modal => {
        modal.addEventListener("click", event => {
            if (event.target === modal) cerrarModales();
        });
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") cerrarModales();
    });
}

function abrirModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
}

function cerrarModales() {
    document.querySelectorAll(".modal").forEach(modal => {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    });
}

/* =========================
   SISTEMA DE GUARDADO UI
   ========================= */

function prepararBotonesSistema() {
    const exportBtn = document.getElementById("export-save-button");
    const importBtn = document.getElementById("import-save-button");
    const importInput = document.getElementById("import-input");
    const resetBtn = document.getElementById("reset-save-button");

    exportBtn?.addEventListener("click", exportarPartida);

    importBtn?.addEventListener("click", () => {
        importInput?.click();
    });

    importInput?.addEventListener("change", importarPartida);

    resetBtn?.addEventListener("click", () => {
        const ok = confirm("¿Seguro que quieres reiniciar la partida? Esta acción no se puede deshacer.");
        if (!ok) return;

        gameState = crearEstadoBase();
        normalizarEstado();
        guardar();
        location.reload();
    });
}

function guardar() {
    if (window.SaveSystem?.save) {
        window.SaveSystem.save(gameState);
    } else {
        localStorage.setItem("tototo_save_v2", JSON.stringify(gameState));
    }
}

function exportarPartida() {
    guardar();

    const blob = new Blob([JSON.stringify(gameState, null, 2)], {
        type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "tototo_clicker_v2_save.json";
    link.click();

    URL.revokeObjectURL(url);

    toast("Partida exportada.", "success");
}

function importarPartida(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = e => {
        try {
            const imported = JSON.parse(e.target.result);
            gameState = imported;
            normalizarEstado();
            guardar();
            toast("Partida importada correctamente.", "success");
            location.reload();
        } catch (error) {
            console.error(error);
            toast("No se pudo importar la partida.", "danger");
        }
    };

    reader.readAsText(file);
}

/* =========================
   UTILIDADES
   ========================= */

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function formatNumber(value) {
    const number = Number(value) || 0;

    return new Intl.NumberFormat("es-ES", {
        maximumFractionDigits: 0
    }).format(number);
}

function formatDecimal(value, decimals = 2) {
    const number = Number(value) || 0;

    return new Intl.NumberFormat("es-ES", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(number);
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function porcentaje(actual, total) {
    if (!total) return 0;
    return clamp((actual / total) * 100, 0, 100);
}

function toast(message, type = "default", duration = 3000) {
    const container = document.getElementById("toast-container");
    if (!container) {
        console.log(message);
        return;
    }

    const div = document.createElement("div");
    div.className = `toast ${type}`;
    div.textContent = message;

    container.appendChild(div);

    setTimeout(() => {
        div.style.opacity = "0";
        div.style.transform = "translateY(8px)";
        setTimeout(() => div.remove(), 180);
    }, duration);
}

function elegirAleatorio(lista) {
    if (!Array.isArray(lista) || lista.length === 0) return null;
    return lista[Math.floor(Math.random() * lista.length)];
}

function ahoraISO() {
    return new Date().toISOString();
}

/* =========================
   API GLOBAL PARA MÓDULOS
   ========================= */

window.Tototo = {
    getState: () => gameState,
    setState: newState => {
        gameState = newState;
        normalizarEstado();
        recalcularDerivados();
        guardar();
        renderTodo();
    },

    getCards: () => BASE_DE_CROMOS,
    getAlbums: () => CONFIG_ALBUMES,
    getShopPacks: () => SOBRES_TIENDA,
    getRarities: () => RAREZAS,

    getCardsByAlbum: getCromosDeAlbum,
    isAlbumComplete: albumEstaCompleto,
    getMainAlbumOfCard: getAlbumPrincipalDeCromo,
    getBaseTagOfAlbum: getTagBaseDeAlbum,

    earnCoins: ganarMonedas,
    spendCoins: gastarMonedas,

    recalculate: recalcularDerivados,
    renderAll: renderTodo,
    renderLight: renderTodoLigero,
    renderBackpack: renderMochila,

    save: guardar,

    openModal: abrirModal,
    closeModals: cerrarModales,
    changeTab: cambiarTab,

    setAchievementFilter: filter => {
        CURRENT_ACHIEVEMENT_FILTER = filter;
    },
    getAchievementFilter: () => CURRENT_ACHIEVEMENT_FILTER,

    setCurrentAlbum: albumId => {
        CURRENT_ALBUM_ID = albumId;
    },
    getCurrentAlbum: () => CURRENT_ALBUM_ID,

    toast,
    formatNumber,
    formatDecimal,
    escapeHTML,
    clamp,
    percentage: porcentaje,
    randomFrom: elegirAleatorio,
    nowISO: ahoraISO
};
