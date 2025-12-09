
const fs = require('fs');
const path = require('path');

// Mock the DOM and chrome APIs before importing popup.js
document.body.innerHTML = fs.readFileSync(path.resolve(__dirname, './popup.html'), 'utf8');

// Mock chrome.storage.sync
global.chrome = {
  storage: {
    sync: {
      get: jest.fn((keys, callback) => {
        const defaultConfig = {
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
          maxInstances: 3,
        };
        callback({ anime4k_config: defaultConfig });
      }),
      set: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
    },
  },
};

require('./popup.js');

describe('Popup UI and Configuration', () => {
  test('should load default configuration and populate fields', () => {
    // Check if the fields are populated with default values
    expect(document.getElementById('model').value).toBe('anime4k_v41_fast');
    expect(document.getElementById('resolution').value).toBe('2x');
    expect(document.getElementById('scale').value).toBe('2');
    expect(document.getElementById('sharpen').value).toBe('0');
    expect(document.getElementById('vibrance').value).toBe('0.1');
    expect(document.getElementById('deband').checked).toBe(false);
    expect(document.getElementById('compare').checked).toBe(false);
    expect(document.getElementById('fps').checked).toBe(true);
    expect(document.getElementById('delay').checked).toBe(false);
    expect(document.getElementById('labels').checked).toBe(true);
    expect(document.getElementById('quality-preset').value).toBe('auto');
    expect(document.getElementById('max-instances').value).toBe('3');
  });

  test('should save settings when a value is changed', () => {
    const modelSelect = document.getElementById('model');
    modelSelect.value = 'anime4k_v41_hq';
    modelSelect.dispatchEvent(new Event('change'));

    expect(chrome.storage.sync.set.mock.calls[0][0]).toEqual({
      anime4k_config: expect.objectContaining({
        model: 'anime4k_v41_hq',
      }),
    });
  });

  test('should update UI when status is toggled', () => {
    const statusContainer = document.getElementById('status-container');
    statusContainer.click();

    expect(document.getElementById('status-text').textContent).toBe('Disabled');
  });
});
