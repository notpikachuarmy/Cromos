/* =========================================================
   TOTOTO CLICKER 2.0 - MISSIONS.JS
   Misiones generales aleatorias:
   - Siempre hay una misión activa.
   - 5 tipos: clicks, sobres, cromos nuevos, fragmentos, monedas gastadas.
   - Al reclamar la recompensa se genera otra misión.
   ========================================================= */

window.Missions = (() => {
    const MISSION_TYPES = [
        {
            type: "clicks",
            title: "Dedos veloces",
            description: target => `Haz ${fmt(target)} clicks.`,
            targets: [50, 100, 250, 500, 1000, 2500, 5000, 10000],
            rewardMultiplier: 3
        },
        {
            type: "packs",
            title: "Abresobres",
            description: target => `Abre ${fmt(target)} sobres.`,
            targets: [3, 5, 10, 20, 50, 100, 250, 500],
            rewardMultiplier: 80
        },
        {
            type: "newCards",
            title: "Nuevos hallazgos",
            description: target => `Consigue ${fmt(target)} cromos nuevos.`,
            targets: [1, 3, 5, 10, 20, 35, 50, 100],
            rewardMultiplier: 180
        },
        {
            type: "fragments",
            title: "Reciclaje útil",
            description: target => `Obtén ${fmt(target)} fragmentos.`,
            targets: [10, 25, 50, 100, 250, 500, 1000, 2500],
            rewardMultiplier: 12
        },
        {
            type: "spendCoins",
            title: "Inversor compulsivo",
            description: target => `Gasta ${fmt(target)} monedas.`,
            targets: [100, 250, 500, 1000, 2500, 5000, 10000, 50000],
            rewardMultiplier: 1
        }
    ];

    function ensureMission() {
        const state = window.Tototo.getState();

        if (!state.missions) {
            state.missions = { current: null, completed: 0 };
        }

        if (!state.missions.current) {
            state.missions.current = createRandomMission();
            window.Tototo.save?.();
        }
    }

    function createRandomMission() {
        const completed = window.Tototo.getState().missions?.completed || 0;
        const template = window.Tototo.randomFrom(MISSION_TYPES);

        const difficultyIndex = Math.min(
            template.targets.length - 1,
            Math.floor(completed / 3)
        );

        const minIndex = Math.max(0, difficultyIndex - 1);
        const maxIndex = Math.min(template.targets.length - 1, difficultyIndex + 1);
        const possibleTargets = template.targets.slice(minIndex, maxIndex + 1);

        const target = window.Tototo.randomFrom(possibleTargets);
        const reward = calculateReward(template, target, completed);

        return {
            id: `${template.type}_${Date.now()}_${Math.floor(Math.random() * 999999)}`,
            type: template.type,
            title: template.title,
            description: template.description(target),
            target,
            progress: 0,
            reward,
            createdAt: Date.now(),
            completedAt: null
        };
    }

    function calculateReward(template, target, completed) {
        const base = target * template.rewardMultiplier;
        const scaling = 1 + Math.floor(completed / 10) * 0.25;
        return Math.max(50, Math.floor(base * scaling));
    }

    function onProgress(type, amount = 1) {
        ensureMission();

        const state = window.Tototo.getState();
        const mission = state.missions.current;

        if (!mission || mission.type !== type || isCompleted(mission)) {
            return false;
        }

        mission.progress = Math.min(
            mission.target,
            (Number(mission.progress) || 0) + Math.max(0, Number(amount) || 0)
        );

        if (mission.progress >= mission.target && !mission.completedAt) {
            mission.completedAt = Date.now();
            window.Tototo.toast("¡Misión completada! Reclama tu recompensa.", "success");
            window.Sounds?.play?.("mission");
        }

        renderPreview();
        renderIfVisible();
        window.Tototo.save?.();

        return true;
    }

    function claimCurrentMission() {
        ensureMission();

        const state = window.Tototo.getState();
        const mission = state.missions.current;

        if (!mission) return false;

        if (!isCompleted(mission)) {
            window.Tototo.toast("Aún no has completado la misión.", "warning");
            window.Sounds?.play?.("error");
            return false;
        }

        window.Tototo.earnCoins(mission.reward);

        state.missions.completed = (state.missions.completed || 0) + 1;
        state.stats.missionsCompleted = state.missions.completed;

        window.Tototo.toast(
            `Misión reclamada: +${window.Tototo.formatNumber(mission.reward)} 🪙`,
            "success"
        );

        window.Sounds?.play?.("mission");

        state.missions.current = createRandomMission();

        window.Tototo.recalculate();
        window.Tototo.save?.();

        render();
        renderPreview();
        window.Tototo.renderLight();

        if (window.Statistics?.renderIfVisible) {
            window.Statistics.renderIfVisible();
        }

        if (window.Achievements?.checkAll) {
            window.Achievements.checkAll();
        }

        return true;
    }

    function rerollMission(cost = null) {
        ensureMission();

        const state = window.Tototo.getState();
        const finalCost = cost ?? getRerollCost();

        if (state.coins < finalCost) {
            window.Tototo.toast("No tienes monedas suficientes para cambiar la misión.", "warning");
            window.Sounds?.play?.("error");
            return false;
        }

        const ok = confirm(`¿Cambiar la misión actual por ${window.Tototo.formatNumber(finalCost)} monedas?`);
        if (!ok) return false;

        const paid = window.Tototo.spendCoins(finalCost);
        if (!paid) return false;

        state.missions.current = createRandomMission();

        window.Tototo.toast("Misión cambiada.", "success");
        window.Sounds?.play?.("buy");

        window.Tototo.save?.();
        render();
        renderPreview();
        window.Tototo.renderLight();

        return true;
    }

    function getRerollCost() {
        const state = window.Tototo.getState();
        const completed = state.missions?.completed || 0;
        return Math.floor(100 + completed * 25);
    }

    function render() {
        ensureMission();

        const container = document.getElementById("mission-container");
        if (!container) return;

        const state = window.Tototo.getState();
        const mission = state.missions.current;

        if (!mission) {
            container.innerHTML = `<div class="empty-state">No hay misión activa.</div>`;
            return;
        }

        const percent = getProgressPercent(mission);
        const completed = isCompleted(mission);
        const rerollCost = getRerollCost();

        container.innerHTML = `
            <article class="mission-card">
                <div>
                    <h3>${completed ? "✅" : "🎯"} ${window.Tototo.escapeHTML(mission.title)}</h3>
                    <p>${window.Tototo.escapeHTML(mission.description)}</p>
                </div>

                <div>
                    <div class="progress-line">
                        <span>Progreso</span>
                        <strong>${window.Tototo.formatNumber(mission.progress)} / ${window.Tototo.formatNumber(mission.target)}</strong>
                    </div>

                    <div class="mission-progress-bar">
                        <div class="mission-progress-fill" style="width:${percent}%"></div>
                    </div>
                </div>

                <div class="progress-line">
                    <span>Recompensa</span>
                    <strong class="money">+${window.Tototo.formatNumber(mission.reward)} 🪙</strong>
                </div>

                <div class="progress-line">
                    <span>Misiones completadas</span>
                    <strong>${window.Tototo.formatNumber(state.missions.completed || 0)}</strong>
                </div>

                <div class="shop-actions">
                    <button id="claim-mission-button"
                            class="card-button full-button"
                            type="button"
                            ${completed ? "" : "disabled"}>
                        Reclamar recompensa
                    </button>

                    <button id="reroll-mission-button"
                            class="secondary-button full-button"
                            type="button">
                        Cambiar misión (${window.Tototo.formatNumber(rerollCost)} 🪙)
                    </button>
                </div>
            </article>
        `;

        document.getElementById("claim-mission-button")?.addEventListener("click", claimCurrentMission);
        document.getElementById("reroll-mission-button")?.addEventListener("click", () => rerollMission());
    }

    function renderPreview() {
        ensureMission();

        const container = document.getElementById("current-mission-preview");
        if (!container) return;

        const mission = window.Tototo.getState().missions.current;

        if (!mission) {
            container.innerHTML = "No hay misión activa.";
            return;
        }

        const percent = getProgressPercent(mission);
        const completed = isCompleted(mission);

        container.classList.remove("empty-state");
        container.innerHTML = `
            <div class="mission-card">
                <h3>${completed ? "✅" : "🎯"} ${window.Tototo.escapeHTML(mission.title)}</h3>
                <p>${window.Tototo.escapeHTML(mission.description)}</p>

                <div class="progress-line">
                    <span>Progreso</span>
                    <strong>${window.Tototo.formatNumber(mission.progress)} / ${window.Tototo.formatNumber(mission.target)}</strong>
                </div>

                <div class="mission-progress-bar">
                    <div class="mission-progress-fill" style="width:${percent}%"></div>
                </div>

                <p class="${completed ? "success-text" : "money"}">
                    ${completed ? "Lista para reclamar" : `Recompensa: +${window.Tototo.formatNumber(mission.reward)} 🪙`}
                </p>
            </div>
        `;
    }

    function renderIfVisible() {
        const tab = document.getElementById("tab-misiones");

        if (tab?.classList.contains("active")) {
            render();
        }
    }

    function isCompleted(mission) {
        return Boolean(mission && Number(mission.progress) >= Number(mission.target));
    }

    function getProgressPercent(mission) {
        if (!mission || !mission.target) return 0;
        return window.Tototo.percentage(mission.progress || 0, mission.target);
    }

    function fmt(value) {
        return new Intl.NumberFormat("es-ES", {
            maximumFractionDigits: 0
        }).format(value);
    }

    return {
        ensureMission,
        createRandomMission,
        onProgress,
        claimCurrentMission,
        rerollMission,
        getRerollCost,
        render,
        renderPreview,
        renderIfVisible,
        isCompleted,
        getProgressPercent
    };
})();
"""

path = Path("/mnt/data/missions.js")
path.write_text(missions_js, encoding="utf-8")
print(f"Archivo creado: {path}")
