
const {
  getTargetResolution,
  applyQualityCap,
  findVideosInRoot,
} = require('./content-logic.js');

describe('Content Script Logic', () => {
  test('getTargetResolution should return correct resolutions', () => {
    const config = { resolution: '2x' };
    expect(getTargetResolution(100, 100, config)).toEqual([200, 200]);

    config.resolution = '4k';
    expect(getTargetResolution(100, 100, config)).toEqual([3840, 2160]);

    config.resolution = 'custom';
    config.customScale = 1.5;
    expect(getTargetResolution(100, 100, config)).toEqual([150, 150]);
  });

  test('applyQualityCap should cap resolution based on quality preset', () => {
    const config = { qualityPreset: 'low' }; // 1.5x cap
    const RENDER_SUPPORT = { hasWebGL2: true };
    expect(applyQualityCap(100, 100, 200, 200, config, RENDER_SUPPORT)).toEqual([150, 150]);

    config.qualityPreset = 'high'; // 4.0x cap
    expect(applyQualityCap(100, 100, 500, 500, config, RENDER_SUPPORT)).toEqual([400, 400]);
  });

  test('findVideosInRoot should find videos in the document and shadow DOMs', () => {
    document.body.innerHTML = `
      <div><video id="video1"></video></div>
      <div id="shadow-host"></div>
    `;
    const shadowHost = document.getElementById('shadow-host');
    const shadowRoot = shadowHost.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = '<video id="video2"></video>';

    const videos = findVideosInRoot(document);
    expect(videos.length).toBe(2);
    expect(videos.map(v => v.id)).toContain('video1');
    expect(videos.map(v => v.id)).toContain('video2');
  });
});
