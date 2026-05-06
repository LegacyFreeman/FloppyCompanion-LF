// Sound Control Tweak

let scCurrentState = { hp_l: '0', hp_r: '0', mic: '0' };
let scSavedState = {};
let scPendingState = { hp_l: '0', hp_r: '0', mic: '0' };
let scSplitMode = false;
let scReferenceState = { hp_l: '0', hp_r: '0', mic: '0' };
let scDefaultState = { hp_l: '0', hp_r: '0', mic: '0' };

const runSoundControlBackend = (...args) => window.runTweakBackend('soundcontrol', ...args);
const SOUND_CONTROL_HP_MIN = -40;
const SOUND_CONTROL_HP_MAX = 20;
const SOUND_CONTROL_MIC_MIN = -10;
const SOUND_CONTROL_MIC_MAX = 20;

function clampSoundControlGain(val, min, max) {
    const parsed = parseInt(val, 10);
    if (Number.isNaN(parsed)) return 0;
    return Math.max(min, Math.min(max, parsed));
}

function clampHeadphoneGain(val) {
    return clampSoundControlGain(val, SOUND_CONTROL_HP_MIN, SOUND_CONTROL_HP_MAX);
}

function clampMicGain(val) {
    return clampSoundControlGain(val, SOUND_CONTROL_MIC_MIN, SOUND_CONTROL_MIC_MAX);
}

function normalizeSoundControlState(state = {}) {
    return {
        hp_l: String(clampHeadphoneGain(state.hp_l || '0')),
        hp_r: String(clampHeadphoneGain(state.hp_r || '0')),
        mic: String(clampMicGain(state.mic || '0'))
    };
}

function getNormalizedSoundControlPendingState() {
    const normalizedState = { ...scPendingState };

    const inputMic = document.getElementById('soundcontrol-input-mic');
    if (inputMic && String(inputMic.value ?? '').trim() === '') {
        normalizedState.mic = window.getTweakDefaultValue('mic', scCurrentState, scDefaultState, '0');
    }

    if (scSplitMode) {
        const inputHpL = document.getElementById('soundcontrol-input-hp-l');
        const inputHpR = document.getElementById('soundcontrol-input-hp-r');

        if (inputHpL && String(inputHpL.value ?? '').trim() === '') {
            normalizedState.hp_l = window.getTweakDefaultValue('hp_l', scCurrentState, scDefaultState, '0');
        }
        if (inputHpR && String(inputHpR.value ?? '').trim() === '') {
            normalizedState.hp_r = window.getTweakDefaultValue('hp_r', scCurrentState, scDefaultState, '0');
        }
    } else {
        const inputHp = document.getElementById('soundcontrol-input-hp');
        if (inputHp && String(inputHp.value ?? '').trim() === '') {
            normalizedState.hp_l = window.getTweakDefaultValue('hp_l', scCurrentState, scDefaultState, '0');
            normalizedState.hp_r = window.getTweakDefaultValue('hp_r', scCurrentState, scDefaultState, '0');
        }
    }

    return normalizeSoundControlState(normalizedState);
}

function renderSoundControlCard() {
    // Update value labels from current state
    const valHp = document.getElementById('soundcontrol-val-hp');
    const valHpL = document.getElementById('soundcontrol-val-hp-l');
    const valHpR = document.getElementById('soundcontrol-val-hp-r');
    const valMic = document.getElementById('soundcontrol-val-mic');

    if (valHp) valHp.textContent = scCurrentState.hp_l + ' dB';
    if (valHpL) valHpL.textContent = scCurrentState.hp_l + ' dB';
    if (valHpR) valHpR.textContent = scCurrentState.hp_r + ' dB';
    if (valMic) valMic.textContent = scCurrentState.mic + ' dB';

    // Update sliders/inputs from pending state
    const sliderHp = document.getElementById('soundcontrol-slider-hp');
    const inputHp = document.getElementById('soundcontrol-input-hp');
    const sliderHpL = document.getElementById('soundcontrol-slider-hp-l');
    const inputHpL = document.getElementById('soundcontrol-input-hp-l');
    const sliderHpR = document.getElementById('soundcontrol-slider-hp-r');
    const inputHpR = document.getElementById('soundcontrol-input-hp-r');
    const sliderMic = document.getElementById('soundcontrol-slider-mic');
    const inputMic = document.getElementById('soundcontrol-input-mic');

    // In combined mode, use hp_l value for the combined slider
    if (sliderHp) sliderHp.value = scPendingState.hp_l;
    if (inputHp) inputHp.value = scPendingState.hp_l;
    if (sliderHpL) sliderHpL.value = scPendingState.hp_l;
    if (inputHpL) inputHpL.value = scPendingState.hp_l;
    if (sliderHpR) sliderHpR.value = scPendingState.hp_r;
    if (inputHpR) inputHpR.value = scPendingState.hp_r;
    if (sliderMic) sliderMic.value = scPendingState.mic;
    if (inputMic) inputMic.value = scPendingState.mic;

    [sliderHp, sliderHpL, sliderHpR, sliderMic].forEach((slider) => {
        if (slider) updateSoundControlSliderTicks(slider);
    });

    updateSoundControlPendingIndicator();
}

function updateSoundControlPendingIndicator() {
    const hasChanges =
        scPendingState.hp_l !== scReferenceState.hp_l ||
        scPendingState.hp_r !== scReferenceState.hp_r ||
        scPendingState.mic !== scReferenceState.mic;

    window.setPendingIndicator('soundcontrol-pending-indicator', hasChanges);
}

function toggleSoundControlSplitMode(split) {
    scSplitMode = split;
    const hpCombined = document.getElementById('soundcontrol-hp-combined');
    const hpLeft = document.getElementById('soundcontrol-hp-left');
    const hpRight = document.getElementById('soundcontrol-hp-right');

    if (split) {
        if (hpCombined) hpCombined.classList.add('hidden');
        if (hpLeft) hpLeft.classList.remove('hidden');
        if (hpRight) hpRight.classList.remove('hidden');
    } else {
        if (hpCombined) hpCombined.classList.remove('hidden');
        if (hpLeft) hpLeft.classList.add('hidden');
        if (hpRight) hpRight.classList.add('hidden');
        // When going back to combined, sync hp_r to hp_l
        scPendingState.hp_r = scPendingState.hp_l;
    }
    renderSoundControlCard();
}

async function loadSoundControlState() {
    const { current, saved } = await window.loadTweakState('soundcontrol');
    scCurrentState = normalizeSoundControlState(current);
    scDefaultState = normalizeSoundControlState(window.getDefaultTweakPreset('soundcontrol') || {});
    scSavedState = window.buildSparseStateAgainstDefaults(saved, scDefaultState);

    const { reference, hasSaved } = window.resolveTweakReference(scCurrentState, scSavedState, scDefaultState);

    if (hasSaved) {
        scPendingState = normalizeSoundControlState(
            window.initPendingState(scCurrentState, scSavedState, scDefaultState)
        );
        scReferenceState = normalizeSoundControlState(reference);
    } else {
        const baseState = Object.keys(scDefaultState).length > 0 ? scDefaultState : scCurrentState;
        scPendingState = normalizeSoundControlState(baseState);
        scReferenceState = normalizeSoundControlState(baseState);
    }

    // Check if L and R are different - if so, enable split mode
    if (scPendingState.hp_l !== scPendingState.hp_r) {
        const splitSwitch = document.getElementById('soundcontrol-split-switch');
        if (splitSwitch) splitSwitch.checked = true;
        toggleSoundControlSplitMode(true);
    }

    renderSoundControlCard();
}
window.loadSoundControlState = loadSoundControlState;

async function saveSoundControl() {
    const sparseState = window.buildSparseStateAgainstDefaults(getNormalizedSoundControlPendingState(), scDefaultState);
    if (Object.keys(sparseState).length === 0) {
        await runSoundControlBackend('clear_saved');
        scSavedState = {};
        const baseState = Object.keys(scDefaultState).length > 0 ? scDefaultState : scCurrentState;
        scReferenceState = normalizeSoundControlState(baseState);
        scPendingState = normalizeSoundControlState(baseState);
        renderSoundControlCard();
    } else {
        await runSoundControlBackend('save', ...Object.entries(sparseState).map(([key, value]) => `${key}=${value}`));
        scSavedState = { ...sparseState };
        const effectiveReferenceState = window.initPendingState(scCurrentState, scSavedState, scDefaultState);
        scReferenceState = normalizeSoundControlState(effectiveReferenceState);
        scPendingState = normalizeSoundControlState(effectiveReferenceState);
        renderSoundControlCard();
    }

    showToast(window.t ? window.t('toast.settingsSaved') : 'Saved');
}

async function applySoundControl() {
    const normalizedPendingState = getNormalizedSoundControlPendingState();
    await runSoundControlBackend('apply', normalizedPendingState.hp_l, normalizedPendingState.hp_r, normalizedPendingState.mic);

    // Refresh only current kernel state so active values update,
    // but do NOT reset pending state back to saved.
    const currentOutput = await runSoundControlBackend('get_current');
    if (!currentOutput) {
        showToast(window.t ? window.t('toast.settingsFailed') : 'Failed to apply settings', true);
        return;
    }

    const current = parseKeyValue(currentOutput);
    scCurrentState = {
        hp_l: current.hp_l || '0',
        hp_r: current.hp_r || '0',
        mic: current.mic || '0'
    };

    renderSoundControlCard();
    showToast(window.t ? window.t('toast.settingsApplied') : 'Applied');
}

function updateSoundControlSliderTicks(slider) {
    if (!slider) return;
    const sliderShell = slider.closest('.tweak-beer-slider') || slider;
    const color = getComputedStyle(document.body).getPropertyValue('--md-sys-color-outline').trim() || '#747775';
    const ticks = 13;

    const lines = [];
    for (let i = 0; i < ticks; i++) {
        const pct = (i / (ticks - 1)) * 100;
        let transform = '';
        if (i === 0) transform = "transform='translate(0.5, 0)'";
        if (i === ticks - 1) transform = "transform='translate(-0.5, 0)'";
        lines.push(`<line x1='${pct}%' y1='0' x2='${pct}%' y2='100%' stroke='${color}' stroke-width='1' ${transform} />`);
    }

    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'>${lines.join('')}</svg>`;
    const encoded = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    sliderShell.style.setProperty('--track-ticks', encoded);

    if (window.syncBeerRangeSlider) {
        window.syncBeerRangeSlider(slider);
    }
}

function initSoundControlTweak() {
    // Register tweak immediately (Early Registration)
    if (typeof window.registerTweak === 'function') {
        window.registerTweak('soundcontrol', {
            getState: () => getNormalizedSoundControlPendingState(),
            setState: (config) => {
                scPendingState = { ...scPendingState, ...config };
                // Handle split mode logic during restore
                if (scPendingState.hp_l !== scPendingState.hp_r) {
                    toggleSoundControlSplitMode(true);
                    const splitSwitch = document.getElementById('soundcontrol-split-switch');
                    if (splitSwitch) splitSwitch.checked = true;
                }
                renderSoundControlCard();
            },
            render: renderSoundControlCard,
            save: saveSoundControl,
            apply: applySoundControl
        });
    }

    const card = document.getElementById('soundcontrol-card');
    if (!card) return;

    // Only show on FloppyTrinketMi
    if (window.KERNEL_NAME !== 'FloppyTrinketMi') {
        card.classList.add('hidden');
        return;
    }

    card.classList.remove('hidden');

    // Split mode toggle
    const splitSwitch = document.getElementById('soundcontrol-split-switch');
    if (splitSwitch) {
        splitSwitch.addEventListener('change', (e) => {
            toggleSoundControlSplitMode(e.target.checked);
        });
    }

    // Combined headphone slider
    const sliderHp = document.getElementById('soundcontrol-slider-hp');
    const inputHp = document.getElementById('soundcontrol-input-hp');

    function syncCombinedHp(val) {
        val = clampHeadphoneGain(val);
        scPendingState.hp_l = String(val);
        scPendingState.hp_r = String(val);
        if (sliderHp) sliderHp.value = val;
        if (inputHp) inputHp.value = val;
        if (sliderHp && window.syncBeerRangeSlider) window.syncBeerRangeSlider(sliderHp);
        updateSoundControlPendingIndicator();
    }

    if (sliderHp) sliderHp.addEventListener('input', (e) => syncCombinedHp(e.target.value));
    if (inputHp) inputHp.addEventListener('change', (e) => syncCombinedHp(e.target.value));

    // Split L slider
    const sliderHpL = document.getElementById('soundcontrol-slider-hp-l');
    const inputHpL = document.getElementById('soundcontrol-input-hp-l');

    function syncHpL(val) {
        val = clampHeadphoneGain(val);
        scPendingState.hp_l = String(val);
        if (sliderHpL) sliderHpL.value = val;
        if (inputHpL) inputHpL.value = val;
        if (sliderHpL && window.syncBeerRangeSlider) window.syncBeerRangeSlider(sliderHpL);
        updateSoundControlPendingIndicator();
    }

    if (sliderHpL) sliderHpL.addEventListener('input', (e) => syncHpL(e.target.value));
    if (inputHpL) inputHpL.addEventListener('change', (e) => syncHpL(e.target.value));

    // Split R slider
    const sliderHpR = document.getElementById('soundcontrol-slider-hp-r');
    const inputHpR = document.getElementById('soundcontrol-input-hp-r');

    function syncHpR(val) {
        val = clampHeadphoneGain(val);
        scPendingState.hp_r = String(val);
        if (sliderHpR) sliderHpR.value = val;
        if (inputHpR) inputHpR.value = val;
        if (sliderHpR && window.syncBeerRangeSlider) window.syncBeerRangeSlider(sliderHpR);
        updateSoundControlPendingIndicator();
    }

    if (sliderHpR) sliderHpR.addEventListener('input', (e) => syncHpR(e.target.value));
    if (inputHpR) inputHpR.addEventListener('change', (e) => syncHpR(e.target.value));

    // Mic slider
    const sliderMic = document.getElementById('soundcontrol-slider-mic');
    const inputMic = document.getElementById('soundcontrol-input-mic');

    function syncMic(val) {
        val = clampMicGain(val);
        scPendingState.mic = String(val);
        if (sliderMic) sliderMic.value = val;
        if (inputMic) inputMic.value = val;
        if (sliderMic && window.syncBeerRangeSlider) window.syncBeerRangeSlider(sliderMic);
        updateSoundControlPendingIndicator();
    }

    if (sliderMic) sliderMic.addEventListener('input', (e) => syncMic(e.target.value));
    if (inputMic) inputMic.addEventListener('change', (e) => syncMic(e.target.value));

    // Prevent swipe conflicts on all sliders and inputs
    [sliderHp, sliderHpL, sliderHpR, sliderMic, inputHp, inputHpL, inputHpR, inputMic].forEach(el => {
        if (el && window.preventSwipePropagation) window.preventSwipePropagation(el);
    });

    // Add ticks to sliders
    [sliderHp, sliderHpL, sliderHpR, sliderMic].forEach(slider => {
        if (slider) updateSoundControlSliderTicks(slider);
    });

    // Button handlers
    window.bindSaveApplyButtons('soundcontrol', saveSoundControl, applySoundControl);

    // Load initial state
    loadSoundControlState();

    // Language change listener
    document.addEventListener('languageChanged', () => {
        renderSoundControlCard();
    });
}
