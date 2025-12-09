(function(exports) {
    'use strict';

    function getTargetResolution(videoW, videoH, config) {
        if (config.resolution === 'custom') {
            const scale = Math.max(0.1, Math.min(10.0, parseFloat(config.customScale) || 2.0));
            return [Math.round(videoW * scale), Math.round(videoH * scale)];
        }

        switch (config.resolution) {
            case '2x': return [videoW * 2, videoH * 2];
            case '4x': return [videoW * 4, videoH * 4];
            case '8x': return [videoW * 8, videoH * 8];
            case '1080p': return [1920, 1080];
            case '2k': return [2560, 1440];
            case '4k': return [3840, 2160];
            case '8k': return [7680, 4320];
            default: return [videoW * 2, videoH * 2];
        }
    }

    function getMaxScaleForPreset(qualityPreset, RENDER_SUPPORT) {
        switch (qualityPreset) {
            case 'low': return 1.5;
            case 'medium': return 2.0;
            case 'high': return 4.0;
            case 'auto':
            default:
                return RENDER_SUPPORT && RENDER_SUPPORT.hasWebGL2 ? 4.0 : 2.0;
        }
    }

    function applyQualityCap(videoW, videoH, desiredW, desiredH, config, RENDER_SUPPORT) {
        const desiredScale = Math.max(desiredW / Math.max(1, videoW), desiredH / Math.max(1, videoH));
        const cap = getMaxScaleForPreset(config.qualityPreset, RENDER_SUPPORT);
        if (desiredScale <= cap) return [desiredW, desiredH];
        const scale = cap;
        return [Math.round(videoW * scale), Math.round(videoH * scale)];
    }

    function findVideosInRoot(root, videos = []) {
        if (!root) return videos;
        root.querySelectorAll('video').forEach(v => videos.push(v));

        root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) {
                findVideosInRoot(el.shadowRoot, videos);
            }
        });
        return videos;
    }

    exports.getTargetResolution = getTargetResolution;
    exports.getMaxScaleForPreset = getMaxScaleForPreset;
    exports.applyQualityCap = applyQualityCap;
    exports.findVideosInRoot = findVideosInRoot;

})(typeof exports === 'undefined' ? this.a4k = {} : exports);
