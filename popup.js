// Default config
const defaultConfig = {
    model: 'anime4k_v41_fast',
    resolution: '2x',
    customScale: 2.0,
    sharpen: 0.0,
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
const compare = document.getElementById('compare');
const fps = document.getElementById('fps');
const delay = document.getElementById('delay');
const labels = document.getElementById('labels');
const statusContainer = document.getElementById('status-container');
const statusText = document.getElementById('status-text');
const statusDot = document.getElementById('status-dot');

let currentConfig = { ...defaultConfig };

// Load settings
chrome.storage.sync.get(defaultConfig, (items) => {
    currentConfig = items;
    model.value = items.model;
    res.value = items.resolution;
    scale.value = items.customScale;
    sharp.value = items.sharpen;
    compare.checked = items.compare;
    fps.checked = items.showFps;
    delay.checked = items.showRenderTime;
    labels.checked = items.showLabels;

    updateUI();
});

// UI Logic
function updateUI() {
    // Resolution Mode
    if (res.value === 'custom') {
        scaleCont.style.display = 'block';
    } else {
        scaleCont.style.display = 'none';
    }

    // Sharpen Label
    sharpVal.textContent = Math.round(sharp.value * 100) + '%';

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
        compare: compare.checked,
        showFps: fps.checked,
        showRenderTime: delay.checked,
        showLabels: labels.checked,
        enabled: currentConfig.enabled
    };

    // Update local ref
    currentConfig = config;
    updateUI();

    chrome.storage.sync.set(config);
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

// Scale Input (Debounced slightly or just on change/blur)
scale.addEventListener('change', saveSettings);
scale.addEventListener('input', () => {
    // Optional: Regex check for numbers
});

// Slider (Instant on drag? Maybe too heavy. On input update label, on change save)
sharp.addEventListener('input', () => {
    sharpVal.textContent = Math.round(sharp.value * 100) + '%';
});
sharp.addEventListener('change', saveSettings);

// Toggles
[compare, fps, delay, labels].forEach(el => {
    el.addEventListener('change', saveSettings);
});

// Listen for external updates (e.g. Shortcut Alt+U)
chrome.storage.onChanged.addListener((changes) => {
    if (changes.anime4k_config) {
        // Reload values that might have changed externally (mostly enabled state)
        const newConf = changes.anime4k_config.newValue;
        if (newConf) {
            currentConfig = newConf;
            // We usually don't need to update inputs here to avoid fighting user, 
            // but status is important
            updateUI();
        }
    }
});
