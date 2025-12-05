// Default config
const defaultConfig = {
    model: 'anime4k_v41_fast',
    resolution: '2x',
    customScale: 2.0,
    sharpen: 0.0,
    compare: false,
    showFps: true,
    showRenderTime: false,
    showLabels: true
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
const btn = document.getElementById('apply');

// Load settings
chrome.storage.sync.get(defaultConfig, (items) => {
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
res.addEventListener('change', updateUI);
sharp.addEventListener('input', () => {
    sharpVal.textContent = Math.round(sharp.value * 100) + '%';
});

function updateUI() {
    if (res.value === 'custom') {
        scaleCont.style.display = 'block';
    } else {
        scaleCont.style.display = 'none';
    }
    sharpVal.textContent = Math.round(sharp.value * 100) + '%';
}

// Apply
btn.addEventListener('click', () => {
    const config = {
        model: model.value,
        resolution: res.value,
        customScale: parseFloat(scale.value) || 2.0,
        sharpen: parseFloat(sharp.value),
        compare: compare.checked,
        showFps: fps.checked,
        showRenderTime: delay.checked,
        showLabels: labels.checked
    };

    chrome.storage.sync.set(config, () => {
        // Optional: Show saved feedback
        const originalText = btn.textContent;
        btn.textContent = 'Saved!';
        setTimeout(() => btn.textContent = originalText, 1000);

        // Reload current tab to fully apply heavy changes like resolution/model?
        // OR rely on content script listener. For now, we rely on listener for light changes
        // and content script can decide to re-init for heavy changes.

        // Actually, let's just save. Content script will handle the rest via onChanged.
    });
});
