// Default config
// Default config
const defaultConfig = {
    model: 'anime4k_v41_fast',
    resolution: '2x',
    customScale: 2.0,
    sharpen: 0.0,
    vibrance: 0.1, // Default 10% saturation boost
    deband: false,
    compare: false,
    showFps: true,
    showRenderTime: false,
    showLabels: true,
    enabled: true
};

// Elements
const model = document.getElementById('model');
const res = document.getElementById('resolution');
const scale = document.getElementById('scale');
const scaleCont = document.getElementById('scale-container');
const sharp = document.getElementById('sharpen');
const sharpVal = document.getElementById('sharp-val');
const vibrance = document.getElementById('vibrance');
const vibranceVal = document.getElementById('vibrance-val');
const deband = document.getElementById('deband');
const compare = document.getElementById('compare');
const fps = document.getElementById('fps');
const delay = document.getElementById('delay');
const labels = document.getElementById('labels');
const statusContainer = document.getElementById('status-container');
const statusText = document.getElementById('status-text');
const statusDot = document.getElementById('status-dot');
const qualityPreset = document.getElementById('quality-preset');
const maxInstances = document.getElementById('max-instances');
const maxDec = document.getElementById('max-dec');
const maxInc = document.getElementById('max-inc');
const maxValidation = document.getElementById('max-validation');

let currentConfig = { ...defaultConfig };

// Load settings
// Load settings (support both legacy flat keys and `anime4k_config` object)
chrome.storage.sync.get(['anime4k_config'], (res) => {
    if (res && res.anime4k_config) {
        currentConfig = { ...defaultConfig, ...res.anime4k_config };
    } else {
        // fallback to flat keys
        chrome.storage.sync.get(defaultConfig, (items) => {
            currentConfig = items;
            populateFields(currentConfig);
        });
        return;
    }
    populateFields(currentConfig);
});

function populateFields(items) {
    currentConfig = items;
    model.value = items.model;
    res.value = items.resolution;
    scale.value = items.customScale;
    sharp.value = items.sharpen;
    vibrance.value = items.vibrance;
    deband.checked = items.deband;
    compare.checked = items.compare;
    fps.checked = items.showFps;
    delay.checked = items.showRenderTime;
    labels.checked = items.showLabels;
    // New fields
    qualityPreset.value = items.qualityPreset || 'auto';
    maxInstances.value = items.maxInstances || 3;
    // ensure min/max attributes
    try {
        const min = parseInt(maxInstances.getAttribute('min'), 10) || 1;
        const max = parseInt(maxInstances.getAttribute('max'), 10) || 32;
        let v = parseInt(maxInstances.value, 10) || 3;
        if (v < min) v = min;
        if (v > max) v = max;
        maxInstances.value = v;
    } catch (e) {}

    updateUI();
}

// UI Logic
function updateUI() {
    // Resolution Mode
    if (res.value === 'custom') {
        scaleCont.style.display = 'block';
    } else {
        scaleCont.style.display = 'none';
    }

    // Slider Labels
    sharpVal.textContent = Math.round(sharp.value * 100) + '%';
    vibranceVal.textContent = Math.round(vibrance.value * 100) + '%';

    // Status Indicator
    if (currentConfig.enabled) {
        statusText.textContent = 'Active';
        statusText.style.color = '#4ade80';
        statusDot.style.background = '#4ade80';
        statusDot.style.boxShadow = '0 0 8px #4ade80';
        statusContainer.style.opacity = '1';
    } else {
        statusText.textContent = 'Disabled';
        statusText.style.color = '#ef4444';
        statusDot.style.background = '#ef4444';
        statusDot.style.boxShadow = 'none';
        statusContainer.style.opacity = '0.7';
    }
}

// Global Save
function saveSettings() {
    const config = {
        model: model.value,
        resolution: res.value,
        customScale: parseFloat(scale.value) || 2.0,
        sharpen: parseFloat(sharp.value),
        vibrance: parseFloat(vibrance.value),
        deband: deband.checked,
        compare: compare.checked,
        showFps: fps.checked,
        showRenderTime: delay.checked,
        showLabels: labels.checked,
        enabled: currentConfig.enabled
    };

    // include new performance options
    config.qualityPreset = qualityPreset.value || 'auto';
    config.maxInstances = getClampedInstances(maxInstances.value || 3);

    // Update local ref
    currentConfig = config;
    updateUI();

    // Persist under the `anime4k_config` object key so content scripts and other agents read the same schema
    chrome.storage.sync.set({ anime4k_config: config });
}

// Toggle logic
statusContainer.addEventListener('click', () => {
    currentConfig.enabled = !currentConfig.enabled;
    saveSettings();
});

// Event Listeners (Instant Apply)
// Dropdowns
model.addEventListener('change', saveSettings);
res.addEventListener('change', saveSettings);

// Scale Input (Debounce for better UX)
scale.addEventListener('change', saveSettings);
let scaleTimer;
scale.addEventListener('input', () => {
    clearTimeout(scaleTimer);
    scaleTimer = setTimeout(saveSettings, 800);
});

// Sliders
sharp.addEventListener('input', () => {
    sharpVal.textContent = Math.round(sharp.value * 100) + '%';
});
sharp.addEventListener('change', saveSettings);

vibrance.addEventListener('input', () => {
    vibranceVal.textContent = Math.round(vibrance.value * 100) + '%';
});
vibrance.addEventListener('change', saveSettings);

// Toggles
[deband, compare, fps, delay, labels].forEach(el => {
    el.addEventListener('change', saveSettings);
});

// New controls
qualityPreset.addEventListener('change', saveSettings);
maxInstances.addEventListener('change', saveSettings);
maxInstances.addEventListener('input', validateMaxInstances);

// Arrow key support on max-instances
maxInstances.addEventListener('keydown', (e) => {
    const min = parseInt(maxInstances.getAttribute('min'), 10) || 1;
    const max = parseInt(maxInstances.getAttribute('max'), 10) || 32;
    let v = parseInt(maxInstances.value, 10) || min;
    
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        v = Math.min(max, v + 1);
        maxInstances.value = v;
        validateMaxInstances();
        saveSettings();
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        v = Math.max(min, v - 1);
        maxInstances.value = v;
        validateMaxInstances();
        saveSettings();
    }
});

// Stepper buttons
if (maxDec && maxInc) {
    maxDec.addEventListener('click', (e) => {
        e.preventDefault();
        const min = parseInt(maxInstances.getAttribute('min'), 10) || 1;
        let v = parseInt(maxInstances.value, 10) || min;
        v = Math.max(min, v - 1);
        maxInstances.value = v;
        validateMaxInstances();
        saveSettings();
    });
    maxInc.addEventListener('click', (e) => {
        e.preventDefault();
        const max = parseInt(maxInstances.getAttribute('max'), 10) || 32;
        let v = parseInt(maxInstances.value, 10) || 1;
        v = Math.min(max, v + 1);
        maxInstances.value = v;
        validateMaxInstances();
        saveSettings();
    });
}

function getClampedInstances(raw) {
    let v = parseInt(raw, 10);
    if (!isFinite(v) || isNaN(v)) v = 3;
    const min = parseInt(maxInstances.getAttribute('min'), 10) || 1;
    const max = parseInt(maxInstances.getAttribute('max'), 10) || 32;
    if (v < min) v = min;
    if (v > max) v = max;
    return v;
}

function validateMaxInstances() {
    const min = parseInt(maxInstances.getAttribute('min'), 10) || 1;
    const max = parseInt(maxInstances.getAttribute('max'), 10) || 32;
    const v = parseInt(maxInstances.value, 10);
    
    if (isNaN(v) || v < min || v > max) {
        maxValidation.textContent = `Value must be between ${min} and ${max}`;
        maxValidation.classList.add('show');
        return false;
    } else {
        maxValidation.classList.remove('show');
        return true;
    }
}

// Listen for external updates (e.g. Shortcut Alt+U)
chrome.storage.onChanged.addListener((changes) => {
    if (changes.anime4k_config) {
        // Reload values that might have changed externally (mostly enabled state)
        const newConf = changes.anime4k_config.newValue;
        if (newConf) {
            // merge and update fields/status
            currentConfig = { ...currentConfig, ...newConf };
            populateFields(currentConfig);
        }
    } else {
        // support legacy flat-key changes
        for (const key of Object.keys(changes)) {
            const change = changes[key];
            if (change && change.newValue !== undefined) {
                currentConfig[key] = change.newValue;
            }
        }
        populateFields(currentConfig);
    }
});
