/**
 * @fileoverview Main entry point for Anime4K popup script
 * Handles popup UI, settings management, and user interactions.
 * @version 2.8.1
 */

'use strict';

// Get configuration from shared module
const Config = window.Anime4KConfig || {};
const DEFAULT_CONFIG = Config.DEFAULT_CONFIG || {
    model: 'anime4k_v41_fast',
    resolution: '2x',
    customScale: 2.0,
    sharpen: 0.0,
    vibrance: 0.1,
    deband: false,
    compare: false,
    showFps: true,
    showRenderTime: false,
    showLabels: true,
    enabled: true,
    qualityPreset: 'auto',
    maxInstances: 3
};

const PERFORMANCE = Config.PERFORMANCE_CONSTANTS || {
    MIN_INSTANCES: 1,
    MAX_INSTANCES: 32
};

const STORAGE_KEY = Config.STORAGE_KEYS?.CONFIG || 'anime4k_config';

// ==================== DOM ELEMENTS ====================

const elements = {
    model: document.getElementById('model'),
    resolution: document.getElementById('resolution'),
    scale: document.getElementById('scale'),
    scaleContainer: document.getElementById('scale-container'),
    sharpen: document.getElementById('sharpen'),
    sharpenVal: document.getElementById('sharp-val'),
    vibrance: document.getElementById('vibrance'),
    vibranceVal: document.getElementById('vibrance-val'),
    deband: document.getElementById('deband'),
    compare: document.getElementById('compare'),
    fps: document.getElementById('fps'),
    delay: document.getElementById('delay'),
    labels: document.getElementById('labels'),
    statusContainer: document.getElementById('status-container'),
    statusText: document.getElementById('status-text'),
    statusDot: document.getElementById('status-dot'),
    qualityPreset: document.getElementById('quality-preset'),
    maxInstances: document.getElementById('max-instances'),
    maxDec: document.getElementById('max-dec'),
    maxInc: document.getElementById('max-inc'),
    maxValidation: document.getElementById('max-validation')
};

// ==================== STATE ====================

let currentConfig = { ...DEFAULT_CONFIG };

// ==================== UTILITY FUNCTIONS ====================

/**
 * Clamps max instances value to valid range
 * @param {number|string} raw - Raw input value
 * @returns {number} Clamped value
 */
function getClampedInstances(raw) {
    let v = parseInt(raw, 10);
    if (!isFinite(v) || isNaN(v)) v = 3;

    const min = PERFORMANCE.MIN_INSTANCES || 1;
    const max = PERFORMANCE.MAX_INSTANCES || 32;

    return Math.max(min, Math.min(max, v));
}

/**
 * Validates max instances input
 * @returns {boolean} True if valid
 */
function validateMaxInstances() {
    const min = PERFORMANCE.MIN_INSTANCES || 1;
    const max = PERFORMANCE.MAX_INSTANCES || 32;
    const v = parseInt(elements.maxInstances.value, 10);

    if (isNaN(v) || v < min || v > max) {
        elements.maxValidation.textContent = `Value must be between ${min} and ${max}`;
        elements.maxValidation.classList.add('show');
        return false;
    } else {
        elements.maxValidation.classList.remove('show');
        return true;
    }
}

// ==================== UI FUNCTIONS ====================

/**
 * Populates form fields with config values
 * @param {Object} items - Configuration object
 */
function populateFields(items) {
    currentConfig = items;

    elements.model.value = items.model;
    elements.resolution.value = items.resolution;
    elements.scale.value = items.customScale;
    elements.sharpen.value = items.sharpen;
    elements.vibrance.value = items.vibrance;
    elements.deband.checked = items.deband;
    elements.compare.checked = items.compare;
    elements.fps.checked = items.showFps;
    elements.delay.checked = items.showRenderTime;
    elements.labels.checked = items.showLabels;
    elements.qualityPreset.value = items.qualityPreset || 'auto';
    elements.maxInstances.value = getClampedInstances(items.maxInstances || 3);

    updateUI();
}

/**
 * Updates UI state based on current configuration
 */
function updateUI() {
    const UI = Config.UI_CONSTANTS || {
        COLOR_SUCCESS: '#4ade80',
        COLOR_ERROR: '#ef4444'
    };

    // Resolution mode toggle
    elements.scaleContainer.style.display =
        elements.resolution.value === 'custom' ? 'block' : 'none';

    // Slider labels
    elements.sharpenVal.textContent = Math.round(elements.sharpen.value * 100) + '%';
    elements.vibranceVal.textContent = Math.round(elements.vibrance.value * 100) + '%';

    // Status indicator
    if (currentConfig.enabled) {
        elements.statusText.textContent = 'Active';
        elements.statusText.style.color = UI.COLOR_SUCCESS;
        elements.statusDot.style.background = UI.COLOR_SUCCESS;
        elements.statusDot.style.boxShadow = `0 0 8px ${UI.COLOR_SUCCESS}`;
        elements.statusContainer.style.opacity = '1';
    } else {
        elements.statusText.textContent = 'Disabled';
        elements.statusText.style.color = UI.COLOR_ERROR;
        elements.statusDot.style.background = UI.COLOR_ERROR;
        elements.statusDot.style.boxShadow = 'none';
        elements.statusContainer.style.opacity = '0.7';
    }
}

/**
 * Saves current settings to Chrome storage
 */
function saveSettings() {
    const config = {
        model: elements.model.value,
        resolution: elements.resolution.value,
        customScale: parseFloat(elements.scale.value) || 2.0,
        sharpen: parseFloat(elements.sharpen.value),
        vibrance: parseFloat(elements.vibrance.value),
        deband: elements.deband.checked,
        compare: elements.compare.checked,
        showFps: elements.fps.checked,
        showRenderTime: elements.delay.checked,
        showLabels: elements.labels.checked,
        enabled: currentConfig.enabled,
        qualityPreset: elements.qualityPreset.value || 'auto',
        maxInstances: getClampedInstances(elements.maxInstances.value || 3)
    };

    currentConfig = config;
    updateUI();

    console.log('[Popup] Saving config:', config);
    chrome.storage.sync.set({ [STORAGE_KEY]: config }, () => {
        console.log('[Popup] Config saved successfully');
    });
}

// ==================== EVENT LISTENERS ====================

// Toggle status
elements.statusContainer.addEventListener('click', () => {
    currentConfig.enabled = !currentConfig.enabled;
    saveSettings();
});

// Dropdowns
elements.model.addEventListener('change', saveSettings);
elements.resolution.addEventListener('change', saveSettings);

// Scale input with debounce
elements.scale.addEventListener('change', saveSettings);
let scaleTimer;
elements.scale.addEventListener('input', () => {
    clearTimeout(scaleTimer);
    scaleTimer = setTimeout(saveSettings, 800);
});

// Sliders
elements.sharpen.addEventListener('input', () => {
    elements.sharpenVal.textContent = Math.round(elements.sharpen.value * 100) + '%';
});
elements.sharpen.addEventListener('change', saveSettings);

elements.vibrance.addEventListener('input', () => {
    elements.vibranceVal.textContent = Math.round(elements.vibrance.value * 100) + '%';
});
elements.vibrance.addEventListener('change', saveSettings);

// Toggles
[elements.deband, elements.compare, elements.fps, elements.delay, elements.labels].forEach(el => {
    el.addEventListener('change', saveSettings);
});

// Performance controls
elements.qualityPreset.addEventListener('change', saveSettings);
elements.maxInstances.addEventListener('change', saveSettings);
elements.maxInstances.addEventListener('input', validateMaxInstances);

// Arrow key support for max-instances
elements.maxInstances.addEventListener('keydown', (e) => {
    const min = PERFORMANCE.MIN_INSTANCES || 1;
    const max = PERFORMANCE.MAX_INSTANCES || 32;
    let v = parseInt(elements.maxInstances.value, 10) || min;

    if (e.key === 'ArrowUp') {
        e.preventDefault();
        v = Math.min(max, v + 1);
        elements.maxInstances.value = v;
        validateMaxInstances();
        saveSettings();
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        v = Math.max(min, v - 1);
        elements.maxInstances.value = v;
        validateMaxInstances();
        saveSettings();
    }
});

// Stepper buttons
if (elements.maxDec && elements.maxInc) {
    elements.maxDec.addEventListener('click', (e) => {
        e.preventDefault();
        const min = PERFORMANCE.MIN_INSTANCES || 1;
        let v = parseInt(elements.maxInstances.value, 10) || min;
        v = Math.max(min, v - 1);
        elements.maxInstances.value = v;
        validateMaxInstances();
        saveSettings();
    });

    elements.maxInc.addEventListener('click', (e) => {
        e.preventDefault();
        const max = PERFORMANCE.MAX_INSTANCES || 32;
        let v = parseInt(elements.maxInstances.value, 10) || 1;
        v = Math.min(max, v + 1);
        elements.maxInstances.value = v;
        validateMaxInstances();
        saveSettings();
    });
}

// ==================== STORAGE CHANGE LISTENER ====================

chrome.storage.onChanged.addListener((changes) => {
    if (changes[STORAGE_KEY]) {
        const newConf = changes[STORAGE_KEY].newValue;
        if (newConf) {
            currentConfig = { ...currentConfig, ...newConf };
            populateFields(currentConfig);
        }
    } else {
        // Legacy flat-key support
        for (const key of Object.keys(changes)) {
            const change = changes[key];
            if (change && change.newValue !== undefined) {
                currentConfig[key] = change.newValue;
            }
        }
        populateFields(currentConfig);
    }
});

// ==================== INITIALIZATION ====================

// Load settings from storage
chrome.storage.sync.get([STORAGE_KEY], (res) => {
    if (res && res[STORAGE_KEY]) {
        currentConfig = { ...DEFAULT_CONFIG, ...res[STORAGE_KEY] };
    } else {
        // Fallback to flat keys
        chrome.storage.sync.get(DEFAULT_CONFIG, (items) => {
            currentConfig = items;
            populateFields(currentConfig);
        });
        return;
    }
    populateFields(currentConfig);
});
