/**
 * @fileoverview Resolution utility functions for NextClarity
 * Contains functions for calculating target resolutions and quality caps.
 * @version 2.8.1
 */

'use strict';

/**
 * Resolution Utilities namespace
 * @namespace
 */
const ResolutionUtils = {
    /**
     * Detect renderer capabilities
     * @returns {Object} Object with hasWebGL2 and hasOffscreen flags
     */
    detectRendererSupport() {
        try {
            const tmp = document.createElement('canvas');
            const hasWebGL2 = !!tmp.getContext('webgl2');
            const hasOffscreen = typeof OffscreenCanvas !== 'undefined';
            return { hasWebGL2, hasOffscreen };
        } catch (e) {
            return { hasWebGL2: false, hasOffscreen: false };
        }
    },

    /**
     * Selects optimal render strategy based on browser capabilities
     * @param {Object} support - Renderer support object
     * @returns {string} Render strategy identifier
     */
    selectRenderStrategy(support) {
        const strategies = window.Anime4KConfig?.RENDER_STRATEGY || {
            WORKER_OFFSCREEN: 'worker-offscreen',
            WEBGL2_MAIN: 'webgl2-main',
            WEBGL1_MAIN: 'webgl1-main'
        };

        if (support.hasOffscreen && support.hasWebGL2) {
            return strategies.WORKER_OFFSCREEN;
        } else if (support.hasWebGL2) {
            return strategies.WEBGL2_MAIN;
        } else {
            return strategies.WEBGL1_MAIN;
        }
    },

    /**
     * Gets target resolution based on configuration
     * @param {number} videoW - Original video width
     * @param {number} videoH - Original video height
     * @param {string} resolution - Resolution setting
     * @param {number} customScale - Custom scale factor
     * @returns {Array<number>} [width, height] array
     */
    getTargetResolution(videoW, videoH, resolution, customScale = 2.0) {
        const presets = window.Anime4KConfig?.RESOLUTION_PRESETS || {};
        const constants = window.Anime4KConfig?.PERFORMANCE_CONSTANTS || {
            MIN_CUSTOM_SCALE: 0.1,
            MAX_CUSTOM_SCALE: 10.0
        };

        if (resolution === 'custom') {
            const scale = Math.max(
                constants.MIN_CUSTOM_SCALE,
                Math.min(constants.MAX_CUSTOM_SCALE, parseFloat(customScale) || 2.0)
            );
            return [Math.round(videoW * scale), Math.round(videoH * scale)];
        }

        // Check for preset with fixed dimensions
        if (presets[resolution]?.width && presets[resolution]?.height) {
            return [presets[resolution].width, presets[resolution].height];
        }

        // Check for multiplier-based presets
        switch (resolution) {
            case '2x': return [videoW * 2, videoH * 2];
            case '4x': return [videoW * 4, videoH * 4];
            case '8x': return [videoW * 8, videoH * 8];
            case '1080p': return [1920, 1080];
            case '1440p':
            case '2k': return [2560, 1440];
            case '4k': return [3840, 2160];
            case '8k': return [7680, 4320];
            default: return [videoW * 2, videoH * 2];
        }
    },

    /**
     * Gets maximum scale for quality preset
     * @param {string} qualityPreset - Quality preset name
     * @param {Object} support - Renderer support object
     * @returns {number} Maximum scale factor
     */
    getMaxScaleForPreset(qualityPreset, support) {
        const presets = window.Anime4KConfig?.QUALITY_PRESETS || {
            low: { maxScale: 1.5 },
            medium: { maxScale: 2.0 },
            high: { maxScale: 4.0 },
            auto: { maxScale: null }
        };

        switch (qualityPreset) {
            case 'low': return presets.low.maxScale;
            case 'medium': return presets.medium.maxScale;
            case 'high': return presets.high.maxScale;
            case 'auto':
            default:
                return support.hasWebGL2 ? 4.0 : 2.0;
        }
    },

    /**
     * Applies quality cap based on preset
     * @param {number} videoW - Original video width
     * @param {number} videoH - Original video height
     * @param {number} desiredW - Desired output width
     * @param {number} desiredH - Desired output height
     * @param {string} qualityPreset - Quality preset name
     * @param {Object} support - Renderer support object
     * @returns {Array<number>} [cappedWidth, cappedHeight] array
     */
    applyQualityCap(videoW, videoH, desiredW, desiredH, qualityPreset, support) {
        const desiredScale = Math.max(
            desiredW / Math.max(1, videoW),
            desiredH / Math.max(1, videoH)
        );
        const cap = this.getMaxScaleForPreset(qualityPreset, support);

        if (desiredScale <= cap) {
            return [desiredW, desiredH];
        }

        return [Math.round(videoW * cap), Math.round(videoH * cap)];
    },

    /**
     * Gets default max instances based on renderer support
     * @param {Object} support - Renderer support object
     * @returns {number} Default max instances
     */
    getDefaultMaxInstances(support) {
        const constants = window.Anime4KConfig?.PERFORMANCE_CONSTANTS || {
            DEFAULT_INSTANCES_WEBGL2_OFFSCREEN: 8,
            DEFAULT_INSTANCES_WEBGL2: 6,
            DEFAULT_INSTANCES_WEBGL1: 3
        };

        if (support.hasWebGL2) {
            return support.hasOffscreen
                ? constants.DEFAULT_INSTANCES_WEBGL2_OFFSCREEN
                : constants.DEFAULT_INSTANCES_WEBGL2;
        }
        return constants.DEFAULT_INSTANCES_WEBGL1;
    }
};

// Make available on window
if (typeof window !== 'undefined') {
    window.ResolutionUtils = ResolutionUtils;
}
