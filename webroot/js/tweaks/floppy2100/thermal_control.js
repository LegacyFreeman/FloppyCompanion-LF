// Thermal Control Tweak (Floppy2100)

const THERMAL_CONTROL_MIN_C = -50;
const THERMAL_CONTROL_MAX_C = 15;
const THERMAL_CONTROL_KEYS = ['little', 'big', 'prime', 'g3d'];

let thermalControlAvailable = false;
let thermalControlCurrentRawState = {
    big_offset: '-10000',
    mid_offset: '-10000',
    little_offset: '-8000',
    g3d_offset: '-13000'
};
let thermalControlCurrentState = {
    performance_mode: '0',
    little: '-8',
    big: '-10',
    prime: '-10',
    g3d: '-13'
};
let thermalControlSavedState = {};
let thermalControlPendingState = {
    performance_mode: '0',
    little: '-8',
    big: '-10',
    prime: '-10',
    g3d: '-13'
};
let thermalControlReferenceState = {
    performance_mode: '0',
    little: '-8',
    big: '-10',
    prime: '-10',
    g3d: '-13'
};
let thermalControlDefaultState = {
    performance_mode: '0',
    little: '-8',
    big: '-10',
    prime: '-10',
    g3d: '-13'
};
let thermalControlUiDefaults = {
    performance_mode: '0',
    little: '-8',
    big: '-10',
    prime: '-10',
    g3d: '-13'
};
let thermalControlLastManualState = {
    little: '-8',
    big: '-10',
    prime: '-10',
    g3d: '-13'
};

const runThermalControlBackend = (...args) => window.runTweakBackend('thermal_control', ...args);

function parseThermalControlInt(value, fallback = 0) {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function clampThermalControlValue(value) {
    const numeric = parseThermalControlInt(value, 0);
    return String(Math.max(THERMAL_CONTROL_MIN_C, Math.min(THERMAL_CONTROL_MAX_C, numeric)));
}

function normalizeThermalControlUiState(state = {}) {
    return {
        performance_mode: String(parseThermalControlInt(state.performance_mode, 0) ? 1 : 0),
        little: clampThermalControlValue(state.little ?? '-8'),
        big: clampThermalControlValue(state.big ?? '-10'),
        prime: clampThermalControlValue(state.prime ?? '-10'),
        g3d: clampThermalControlValue(state.g3d ?? '-13')
    };
}

function normalizeThermalControlRawState(state = {}) {
    return {
        big_offset: String(parseThermalControlInt(state.big_offset, -10000)),
        mid_offset: String(parseThermalControlInt(state.mid_offset, -10000)),
        little_offset: String(parseThermalControlInt(state.little_offset, -8000)),
        g3d_offset: String(parseThermalControlInt(state.g3d_offset, -13000))
    };
}

function rawThermalControlToUiState(rawState = thermalControlCurrentRawState) {
    return {
        performance_mode: '0',
        little: clampThermalControlValue(Math.round(parseThermalControlInt(rawState.little_offset, -8000) / 1000)),
        big: clampThermalControlValue(Math.round(parseThermalControlInt(rawState.mid_offset, -10000) / 1000)),
        prime: clampThermalControlValue(Math.round(parseThermalControlInt(rawState.big_offset, -10000) / 1000)),
        g3d: clampThermalControlValue(Math.round(parseThermalControlInt(rawState.g3d_offset, -13000) / 1000))
    };
}

function formatThermalControlValue(value) {
    const numeric = parseThermalControlInt(value, 0);
    if (numeric > 0) return `+${numeric} °C`;
    return `${numeric} °C`;
}

function getThermalControlManualState(state = thermalControlPendingState) {
    return {
        little: clampThermalControlValue(state.little),
        big: clampThermalControlValue(state.big),
        prime: clampThermalControlValue(state.prime),
        g3d: clampThermalControlValue(state.g3d)
    };
}

function isThermalControlPerformanceActive(state = thermalControlPendingState) {
    return String(state.performance_mode) === '1';
}

function updateThermalControlSliderTicks(slider) {
    if (!slider) return;

    const sliderShell = slider.closest('.tweak-beer-slider') || slider;
    const color = getComputedStyle(document.body).getPropertyValue('--md-sys-color-outline').trim() || '#747775';
    const min = parseThermalControlInt(slider.min, THERMAL_CONTROL_MIN_C);
    const max = parseThermalControlInt(slider.max, THERMAL_CONTROL_MAX_C);
    const ticks = Math.max(2, (max - min) + 1);

    const lines = [];
    for (let i = 0; i < ticks; i++) {
        const pct = ticks === 1 ? 0 : (i / (ticks - 1)) * 100;
        let transform = '';
        if (i === 0) transform = "transform='translate(0.5, 0)'";
        if (i === ticks - 1) transform = "transform='translate(-0.5, 0)'";
        lines.push(`<line x1='${pct}%' y1='0' x2='${pct}%' y2='100%' stroke='${color}' stroke-width='1' ${transform} />`);
    }

    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'>${lines.join('')}</svg>`;
    sliderShell.style.setProperty('--track-ticks', `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);

    if (window.syncBeerRangeSlider) {
        window.syncBeerRangeSlider(slider);
    }
}

function updateThermalControlPendingIndicator() {
    const hasChanges =
        thermalControlPendingState.performance_mode !== thermalControlReferenceState.performance_mode ||
        THERMAL_CONTROL_KEYS.some((key) => thermalControlPendingState[key] !== thermalControlReferenceState[key]);
    window.setPendingIndicator('thermal-control-pending-indicator', hasChanges);
}

function renderThermalControlCard() {
    const performanceModeActive = isThermalControlPerformanceActive();
    const performanceSwitch = document.getElementById('thermal-control-performance-switch');
    const fields = document.getElementById('thermal-control-fields');

    if (performanceSwitch) {
        performanceSwitch.checked = performanceModeActive;
    }

    if (fields) {
        fields.classList.toggle('is-disabled', performanceModeActive);
    }

    THERMAL_CONTROL_KEYS.forEach((key) => {
        const slider = document.getElementById(`thermal-control-slider-${key}`);
        const input = document.getElementById(`thermal-control-input-${key}`);
        const value = document.getElementById(`thermal-control-val-${key}`);
        const effectivePendingValue = performanceModeActive ? '0' : clampThermalControlValue(thermalControlPendingState[key]);

        if (!performanceModeActive) {
            thermalControlPendingState[key] = effectivePendingValue;
        }

        if (slider) {
            slider.min = String(THERMAL_CONTROL_MIN_C);
            slider.max = String(THERMAL_CONTROL_MAX_C);
            slider.step = '1';
            slider.value = effectivePendingValue;
            slider.disabled = performanceModeActive;
            updateThermalControlSliderTicks(slider);
        }

        if (input) {
            input.min = String(THERMAL_CONTROL_MIN_C);
            input.max = String(THERMAL_CONTROL_MAX_C);
            input.step = '1';
            input.disabled = performanceModeActive;

            if (performanceModeActive) {
                input.placeholder = window.getTweakDefaultValue(
                    key,
                    thermalControlCurrentState,
                    thermalControlDefaultState
                );
                input.value = '0';
            } else {
                const inputState = window.getTweakTextInputState(
                    key,
                    thermalControlPendingState,
                    thermalControlSavedState,
                    thermalControlReferenceState,
                    thermalControlDefaultState,
                    thermalControlCurrentState
                );
                input.placeholder = inputState.placeholder;
                input.value = inputState.value;
            }
        }

        if (value) {
            value.textContent = formatThermalControlValue(thermalControlCurrentState[key]);
        }
    });

    updateThermalControlPendingIndicator();
}

function setThermalControlPendingValue(key, value) {
    thermalControlPendingState[key] = clampThermalControlValue(value);
    if (!isThermalControlPerformanceActive()) {
        thermalControlLastManualState = getThermalControlManualState(thermalControlPendingState);
    }
    renderThermalControlCard();
}

async function setThermalControlPerformanceMode(enabled) {
    if (enabled) {
        const confirmed = await showConfirmModal({
            title: window.t ? window.t('modal.thermalControlPerformanceTitle') : 'Enable Performance mode?',
            body: window.t ? window.t('modal.thermalControlPerformanceBody') : 'This can cause significant overheating.',
            iconClass: 'warning',
            confirmText: window.t ? window.t('modal.enable') : 'Enable',
            cancelText: window.t ? window.t('modal.cancel') : 'Cancel'
        });

        if (!confirmed) {
            renderThermalControlCard();
            return;
        }

        thermalControlLastManualState = getThermalControlManualState(thermalControlPendingState);
        thermalControlPendingState.performance_mode = '1';
    } else {
        thermalControlPendingState.performance_mode = '0';
        thermalControlPendingState = {
            ...thermalControlPendingState,
            ...thermalControlLastManualState
        };
    }

    renderThermalControlCard();
}

async function checkThermalControlAvailable() {
    if (window.KERNEL_NAME !== 'Floppy2100') {
        thermalControlAvailable = false;
        return false;
    }

    const output = await runThermalControlBackend('is_available');
    const parsed = parseKeyValue(output);
    thermalControlAvailable = parsed.available === '1';
    return thermalControlAvailable;
}

async function loadThermalControlState() {
    const card = document.getElementById('thermal-control-card');
    const available = await checkThermalControlAvailable();

    if (!available) {
        if (card) card.classList.add('hidden');
        return;
    }

    if (card) card.classList.remove('hidden');

    const { current, saved } = await window.loadTweakState('thermal_control');
    thermalControlCurrentRawState = normalizeThermalControlRawState(current);
    const currentUiState = normalizeThermalControlUiState(rawThermalControlToUiState(thermalControlCurrentRawState));
    thermalControlDefaultState = normalizeThermalControlUiState(
        window.getDefaultTweakPreset('thermal_control') || currentUiState
    );
    thermalControlUiDefaults = { ...thermalControlDefaultState, performance_mode: '0' };
    thermalControlSavedState = window.buildSparseStateAgainstDefaults(saved, thermalControlUiDefaults);

    const { hasSaved } = window.resolveTweakReference(currentUiState, thermalControlSavedState, thermalControlUiDefaults);
    thermalControlCurrentState = hasSaved ? currentUiState : { ...thermalControlDefaultState };

    const effectiveReferenceState = window.initPendingState(
        currentUiState,
        thermalControlSavedState,
        thermalControlUiDefaults
    );

    thermalControlPendingState = normalizeThermalControlUiState(effectiveReferenceState);
    thermalControlReferenceState = normalizeThermalControlUiState(effectiveReferenceState);
    thermalControlLastManualState = getThermalControlManualState(thermalControlReferenceState);

    renderThermalControlCard();
}
window.loadThermalControlState = loadThermalControlState;

async function saveThermalControl() {
    const effectiveState = isThermalControlPerformanceActive()
        ? { performance_mode: '1' }
        : {
            performance_mode: '0',
            ...getThermalControlManualState(thermalControlPendingState)
        };
    const sparseState = window.buildSparseStateAgainstDefaults(effectiveState, thermalControlUiDefaults);

    if (Object.keys(sparseState).length === 0) {
        await runThermalControlBackend('clear_saved');
        thermalControlSavedState = {};
        thermalControlReferenceState = { ...thermalControlUiDefaults };
        thermalControlPendingState = { ...thermalControlUiDefaults };
        thermalControlLastManualState = getThermalControlManualState(thermalControlUiDefaults);
    } else {
        await runThermalControlBackend('save', ...Object.entries(sparseState).map(([key, value]) => `${key}=${value}`));
        thermalControlSavedState = { ...sparseState };
        thermalControlReferenceState = normalizeThermalControlUiState(
            window.initPendingState(thermalControlCurrentState, thermalControlSavedState, thermalControlUiDefaults)
        );
        thermalControlPendingState = { ...thermalControlReferenceState };
        thermalControlLastManualState = getThermalControlManualState(thermalControlReferenceState);
    }

    renderThermalControlCard();
    showToast(window.t ? window.t('toast.settingsSaved') : 'Settings saved');
}

async function applyThermalControl() {
    const performanceModeActive = isThermalControlPerformanceActive();
    await runThermalControlBackend(
        'apply',
        performanceModeActive ? '0' : thermalControlPendingState.little,
        performanceModeActive ? '0' : thermalControlPendingState.big,
        performanceModeActive ? '0' : thermalControlPendingState.prime,
        performanceModeActive ? '0' : thermalControlPendingState.g3d
    );

    const currentOutput = await runThermalControlBackend('get_current');
    thermalControlCurrentRawState = normalizeThermalControlRawState(parseKeyValue(currentOutput));
    thermalControlCurrentState = normalizeThermalControlUiState(rawThermalControlToUiState(thermalControlCurrentRawState));

    renderThermalControlCard();
    showToast(window.t ? window.t('toast.settingsApplied') : 'Settings applied');
}

function bindThermalControlInput(key) {
    const slider = document.getElementById(`thermal-control-slider-${key}`);
    const input = document.getElementById(`thermal-control-input-${key}`);

    if (slider) {
        slider.addEventListener('input', (event) => {
            setThermalControlPendingValue(key, event.target.value);
        });
    }

    if (input) {
        input.addEventListener('input', (event) => {
            const value = event.target.value;
            if (value === '' || value === '-') return;
            setThermalControlPendingValue(key, value);
        });
        input.addEventListener('change', (event) => {
            const value = event.target.value === '' || event.target.value === '-' ? thermalControlReferenceState[key] : event.target.value;
            setThermalControlPendingValue(key, value);
        });
    }
}

function initThermalControlTweak() {
    if (typeof window.registerTweak === 'function') {
        window.registerTweak('thermal_control', {
            getState: () => ({ ...thermalControlPendingState }),
            setState: (config) => {
                thermalControlPendingState = normalizeThermalControlUiState({
                    ...thermalControlReferenceState,
                    ...config
                });
                thermalControlLastManualState = getThermalControlManualState(thermalControlPendingState);
                renderThermalControlCard();
            },
            render: renderThermalControlCard,
            save: saveThermalControl,
            apply: applyThermalControl
        });
    }

    const card = document.getElementById('thermal-control-card');
    if (!card) return;

    if (window.KERNEL_NAME !== 'Floppy2100') {
        card.classList.add('hidden');
        return;
    }

    loadThermalControlState();

    const performanceSwitch = document.getElementById('thermal-control-performance-switch');
    if (performanceSwitch) {
        performanceSwitch.addEventListener('change', (event) => {
            setThermalControlPerformanceMode(event.target.checked);
        });
    }

    THERMAL_CONTROL_KEYS.forEach(bindThermalControlInput);

    window.bindSaveApplyButtons('thermal-control', saveThermalControl, applyThermalControl);

    document.addEventListener('languageChanged', () => {
        if (thermalControlAvailable) {
            renderThermalControlCard();
        }
    });
}
