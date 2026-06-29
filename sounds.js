/* =========================================================
   TOTOTO CLICKER 2.0 - SOUNDS.JS
   Sonidos generados por JavaScript. No necesita archivos MP3.
   ========================================================= */

window.Sounds = (() => {
    let audioContext = null;
    let unlocked = false;

    const SOUND_PRESETS = {
        click: {
            type: "square",
            frequency: 520,
            duration: 0.045,
            volume: 0.035,
            slideTo: 650
        },
        buy: {
            type: "triangle",
            frequency: 420,
            duration: 0.11,
            volume: 0.055,
            slideTo: 760
        },
        newCard: {
            type: "triangle",
            frequency: 620,
            duration: 0.18,
            volume: 0.065,
            slideTo: 980
        },
        duplicate: {
            type: "sawtooth",
            frequency: 220,
            duration: 0.11,
            volume: 0.04,
            slideTo: 170
        },
        achievement: {
            type: "triangle",
            frequency: 740,
            duration: 0.16,
            volume: 0.06,
            slideTo: 1100
        },
        mission: {
            type: "square",
            frequency: 550,
            duration: 0.12,
            volume: 0.055,
            slideTo: 880
        },
        prestige: {
            type: "triangle",
            frequency: 300,
            duration: 0.28,
            volume: 0.07,
            slideTo: 1200
        },
        error: {
            type: "sawtooth",
            frequency: 150,
            duration: 0.16,
            volume: 0.05,
            slideTo: 90
        },
        ur: {
            type: "triangle",
            frequency: 880,
            duration: 0.4,
            volume: 0.075,
            slideTo: 1500
        }
    };

    function init() {
        document.addEventListener("pointerdown", unlock, { once: true });
        document.addEventListener("keydown", unlock, { once: true });
    }

    function unlock() {
        try {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            if (audioContext.state === "suspended") {
                audioContext.resume();
            }

            unlocked = true;
        } catch (error) {
            console.warn("No se pudo iniciar el audio:", error);
        }
    }

    function isEnabled() {
        const state = window.Tototo?.getState?.();
        return state?.settings?.soundEnabled !== false;
    }

    function setEnabled(value) {
        const state = window.Tototo?.getState?.();
        if (!state) return;

        state.settings.soundEnabled = Boolean(value);
        window.Tototo.save?.();
    }

    function toggle() {
        const state = window.Tototo?.getState?.();
        if (!state) return false;

        state.settings.soundEnabled = !isEnabled();
        window.Tototo.save?.();

        if (state.settings.soundEnabled) {
            play("buy");
        }

        return state.settings.soundEnabled;
    }

    function play(name) {
        if (!isEnabled()) return;

        if (!unlocked) {
            unlock();
        }

        const preset = SOUND_PRESETS[name] || SOUND_PRESETS.click;
        playTone(preset);

        if (name === "achievement") {
            setTimeout(() => playTone({ ...preset, frequency: 930, slideTo: 1250, duration: 0.12 }), 90);
        }

        if (name === "mission") {
            setTimeout(() => playTone({ ...preset, frequency: 740, slideTo: 980, duration: 0.10 }), 80);
        }

        if (name === "prestige") {
            setTimeout(() => playTone({ type: "triangle", frequency: 520, slideTo: 1300, duration: 0.22, volume: 0.06 }), 90);
            setTimeout(() => playTone({ type: "triangle", frequency: 760, slideTo: 1600, duration: 0.20, volume: 0.055 }), 180);
        }

        if (name === "ur") {
            setTimeout(() => playTone({ type: "triangle", frequency: 1100, slideTo: 1700, duration: 0.28, volume: 0.06 }), 120);
            setTimeout(() => playTone({ type: "triangle", frequency: 1320, slideTo: 1900, duration: 0.26, volume: 0.055 }), 230);
        }
    }

    function playTone(options) {
        try {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            const now = audioContext.currentTime;
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();

            oscillator.type = options.type || "sine";
            oscillator.frequency.setValueAtTime(options.frequency || 440, now);

            if (options.slideTo) {
                oscillator.frequency.exponentialRampToValueAtTime(
                    Math.max(1, options.slideTo),
                    now + (options.duration || 0.1)
                );
            }

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(options.volume || 0.04, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + (options.duration || 0.1));

            oscillator.connect(gain);
            gain.connect(audioContext.destination);

            oscillator.start(now);
            oscillator.stop(now + (options.duration || 0.1) + 0.03);
        } catch (error) {
            console.warn("Error reproduciendo sonido:", error);
        }
    }

    init();

    return {
        play,
        toggle,
        setEnabled,
        isEnabled
    };
})();
"""

path = Path("/mnt/data/sounds.js")
path.write_text(sounds_js, encoding="utf-8")
print(f"Archivo creado: {path}")
