/* =========================================================
   TOTOTO CLICKER 2.0 - SAVE.JS
   Sistema de guardado, carga y migración desde versiones antiguas.
   ========================================================= */

window.SaveSystem = (() => {
    const SAVE_KEY_V2 = "tototo_save_v2";
    const SAVE_KEY_OLD = "tototo_save_pro";

    function save(state) {
        try {
            const cleanState = structuredCloneSafe(state);
            cleanState.stats = cleanState.stats || {};
            cleanState.stats.lastPlayedAt = Date.now();

            localStorage.setItem(SAVE_KEY_V2, JSON.stringify(cleanState));
            return true;
        } catch (error) {
            console.error("Error guardando la partida:", error);
            return false;
        }
    }

    function load(defaultState) {
        try {
            const v2 = localStorage.getItem(SAVE_KEY_V2);
            if (v2) {
                return mergeWithDefault(JSON.parse(v2), defaultState);
            }

            const old = localStorage.getItem(SAVE_KEY_OLD);
            if (old) {
                const migrated = migrateOldSave(JSON.parse(old), defaultState);
                save(migrated);
                return migrated;
            }

            return structuredCloneSafe(defaultState);
        } catch (error) {
            console.error("Error cargando la partida:", error);
            return structuredCloneSafe(defaultState);
        }
    }

    function deleteSave() {
        localStorage.removeItem(SAVE_KEY_V2);
    }

    function hasSave() {
        return Boolean(localStorage.getItem(SAVE_KEY_V2) || localStorage.getItem(SAVE_KEY_OLD));
    }

    function exportSave(state) {
        return JSON.stringify(state, null, 2);
    }

    function importSave(jsonText, defaultState) {
        const parsed = JSON.parse(jsonText);
        const merged = mergeWithDefault(parsed, defaultState);
        save(merged);
        return merged;
    }

    function migrateOldSave(oldState, defaultState) {
        const migrated = structuredCloneSafe(defaultState);

        migrated.coins = Number(oldState.coins) || 0;
        migrated.clickValue = Number(oldState.clickValue) || 1;
        migrated.baseClickValue = Number(oldState.clickValue) || 1;

        migrated.inventario = Array.isArray(oldState.inventario)
            ? [...new Set(oldState.inventario)]
            : [];

        migrated.fragmentos = isPlainObject(oldState.fragmentos)
            ? { ...oldState.fragmentos }
            : {};

        migrated.stats = {
            ...migrated.stats,
            coinsEarned: Number(oldState.coins) || 0,
            startedAt: Date.now(),
            lastPlayedAt: Date.now()
        };

        migrated.upgrades = {
            click_power: Number(oldState.lvlClick || 1) - 1,
            passive_basic: Number(oldState.lvlAuto || 0)
        };

        return migrated;
    }

    function mergeWithDefault(loaded, defaultState) {
        const merged = deepMerge(structuredCloneSafe(defaultState), loaded || {});

        if (!Array.isArray(merged.inventario)) merged.inventario = [];
        merged.inventario = [...new Set(merged.inventario)];

        if (!isPlainObject(merged.fragmentos)) merged.fragmentos = {};
        if (!isPlainObject(merged.albumPrestige)) merged.albumPrestige = {};
        if (!isPlainObject(merged.albumPassiveClaims)) merged.albumPassiveClaims = {};
        if (!isPlainObject(merged.upgrades)) merged.upgrades = {};
        if (!isPlainObject(merged.encyclopedia)) merged.encyclopedia = {};

        if (!isPlainObject(merged.achievements)) merged.achievements = { claimed: {} };
        if (!isPlainObject(merged.achievements.claimed)) merged.achievements.claimed = {};

        if (!isPlainObject(merged.missions)) merged.missions = {};
        if (!Number.isFinite(merged.missions.completed)) merged.missions.completed = 0;

        if (!isPlainObject(merged.stats)) merged.stats = structuredCloneSafe(defaultState.stats);

        return merged;
    }

    function deepMerge(target, source) {
        if (!isPlainObject(source)) return target;

        Object.keys(source).forEach(key => {
            const sourceValue = source[key];
            const targetValue = target[key];

            if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
                target[key] = deepMerge(targetValue, sourceValue);
            } else if (Array.isArray(sourceValue)) {
                target[key] = [...sourceValue];
            } else {
                target[key] = sourceValue;
            }
        });

        return target;
    }

    function structuredCloneSafe(value) {
        if (typeof structuredClone === "function") {
            return structuredClone(value);
        }

        return JSON.parse(JSON.stringify(value));
    }

    function isPlainObject(value) {
        return Boolean(value) && typeof value === "object" && !Array.isArray(value);
    }

    return {
        save,
        load,
        deleteSave,
        hasSave,
        exportSave,
        importSave,
        migrateOldSave,
        SAVE_KEY_V2,
        SAVE_KEY_OLD
    };
})();
"""

path = Path("/mnt/data/save.js")
path.write_text(save_js, encoding="utf-8")
print(f"Archivo creado: {path}")
