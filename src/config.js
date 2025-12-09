/**
 * @fileoverview Shared configuration module for Anime4K Web Upscaler
 * This file contains all shared constants, default configurations, and settings
 * used across content.js, popup.js, and worker.js
 * @version 2.8.1
 */

'use strict';

// ==================== DEFAULT CONFIGURATION ====================

/**
 * Default configuration object for the extension
 * @const {Object}
 */
const DEFAULT_CONFIG = Object.freeze({
    model: 'anime4k_v41_fast',
    resolution: '2x',
    customScale: 2.0,
    sharpen: 0.0,
    vibrance: 0.1,          // Default 10% saturation boost
    deband: false,
    compare: false,
    sliderPos: 50,
    showFps: true,
    showLabels: true,
    showRenderTime: false,
    enabled: true,
    qualityPreset: 'auto',
    maxInstances: 3
});

// ==================== MODEL CONFIGURATION ====================

/**
 * Human-readable model names for UI display
 * @const {Object}
 */
const MODEL_NAMES = Object.freeze({
    debug: '🔧 Debug (Grayscale)',
    anime4k_v41_fast: 'Anime4K Fast',
    anime4k_v41_hq: 'Anime4K HQ',
    lanczos3: 'Lanczos3',
    esrgan: 'ESRGAN',
    fsr: 'FSR 1.0',
    xbrz: 'xBRZ',
    cas: 'CAS',
    bicubic: 'Bicubic',
    realsr: 'Real-ESRGAN'
});

/**
 * Model-specific quality multipliers
 * Higher value = more GPU intensive
 * @const {Object}
 */
const MODEL_QUALITY_MULTIPLIERS = Object.freeze({
    debug: 1.0,
    anime4k_v41_fast: 1.2,
    anime4k_v41_hq: 1.8,
    lanczos3: 1.0,
    esrgan: 2.5,
    fsr: 1.3,
    xbrz: 1.5,
    cas: 1.0,
    bicubic: 1.0,
    realsr: 2.0
});

// ==================== RESOLUTION PRESETS ====================

/**
 * Resolution preset definitions
 * @const {Object}
 */
const RESOLUTION_PRESETS = Object.freeze({
    '1080p': { width: 1920, height: 1080, label: '1080p (FHD)' },
    '1440p': { width: 2560, height: 1440, label: '1440p (2K)' },
    '2k': { width: 2560, height: 1440, label: '2K' },
    '4k': { width: 3840, height: 2160, label: '4K (UHD)' },
    '8k': { width: 7680, height: 4320, label: '8K' },
    '2x': { scale: 2, label: '2x Native' },
    '4x': { scale: 4, label: '4x Native' },
    '8x': { scale: 8, label: '8x Native' },
    'custom': { label: 'Custom...' }
});

// ==================== QUALITY PRESETS ====================

/**
 * Quality preset scale limits
 * @const {Object}
 */
const QUALITY_PRESETS = Object.freeze({
    low: { maxScale: 1.5, description: 'Low quality, best performance' },
    medium: { maxScale: 2.0, description: 'Balanced quality and performance' },
    high: { maxScale: 4.0, description: 'High quality, more GPU usage' },
    auto: { maxScale: null, description: 'Auto-detect based on GPU' }
});

// ==================== PERFORMANCE CONSTANTS ====================

/**
 * Performance-related constants
 * @const {Object}
 */
const PERFORMANCE_CONSTANTS = Object.freeze({
    // Minimum video dimensions to process
    MIN_VIDEO_WIDTH: 100,
    MIN_VIDEO_HEIGHT: 100,

    // Instance limits
    MIN_INSTANCES: 1,
    MAX_INSTANCES: 32,
    DEFAULT_INSTANCES_WEBGL2_OFFSCREEN: 8,
    DEFAULT_INSTANCES_WEBGL2: 6,
    DEFAULT_INSTANCES_WEBGL1: 3,

    // FPS thresholds
    LOW_FPS_THRESHOLD: 15,
    LOW_FPS_WARNING_COUNT: 5,

    // Timing intervals
    VIDEO_SCAN_INTERVAL_MS: 2000,
    SHADER_INIT_DELAY_MS: 500,
    CONFIG_RELOAD_DELAY_MS: 50,

    // Scale limits
    MIN_CUSTOM_SCALE: 0.1,
    MAX_CUSTOM_SCALE: 10.0
});

// ==================== UI CONSTANTS ====================

/**
 * UI-related constants
 * @const {Object}
 */
const UI_CONSTANTS = Object.freeze({
    // Colors
    COLOR_SUCCESS: '#4ade80',
    COLOR_ERROR: '#ef4444',
    COLOR_WARNING: '#f87171',
    COLOR_BACKGROUND: '#111',
    COLOR_SURFACE: '#222',
    COLOR_BORDER: '#444',

    // Toast settings
    TOAST_DURATION_MS: 3000,

    // Slider settings
    SLIDER_MIN_PERCENT: 5,
    SLIDER_MAX_PERCENT: 95
});

// ==================== WEBGL CONSTANTS ====================

/**
 * WebGL-related constants
 * @const {Object}
 */
const WEBGL_CONSTANTS = Object.freeze({
    // Context options
    CONTEXT_OPTIONS: {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false
    }
});

// ==================== SHADER SOURCES ====================

/**
 * Vertex shader source (shared across all models)
 * @const {string}
 */
const VERTEX_SHADER_SOURCE = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
    }
`;

/**
 * Basic fallback fragment shader
 * @const {string}
 */
const BASIC_FRAGMENT_SHADER = `
    precision highp float;
    varying vec2 v_texCoord;
    uniform sampler2D u_texture;
    uniform vec2 u_texSize;
    
    void main() {
        vec2 px = 1.0 / u_texSize;
        vec3 c = texture2D(u_texture, v_texCoord).rgb;
        vec3 n = texture2D(u_texture, v_texCoord + vec2(0.0, -px.y)).rgb;
        vec3 s = texture2D(u_texture, v_texCoord + vec2(0.0, px.y)).rgb;
        vec3 e = texture2D(u_texture, v_texCoord + vec2(px.x, 0.0)).rgb;
        vec3 w = texture2D(u_texture, v_texCoord + vec2(-px.x, 0.0)).rgb;
        
        vec3 blur = (n + s + e + w) * 0.25;
        vec3 sharp = c + (c - blur) * 0.8;
        
        gl_FragColor = vec4(clamp(sharp, 0.0, 1.0), 1.0);
    }
`;

/**
 * Post-processing shader injection code
 * @const {Object}
 */
const POST_PROCESSING_SHADER = Object.freeze({
    uniforms: `
        uniform float u_vibrance;
        uniform float u_deband;
        
        vec3 rgb2hsv(vec3 c) {
            vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
            vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
            vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
            float d = q.x - min(q.w, q.y);
            float e = 1.0e-10;
            return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }
        
        vec3 hsv2rgb(vec3 c) {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        vec3 applyVibrance(vec3 color, float strength) {
            vec3 hsv = rgb2hsv(color);
            hsv.y *= (1.0 + strength);
            return hsv2rgb(hsv);
        }

        float rand(vec2 co) {
            return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }
    `,

    mainReplacement: `
        vec4 finalColor = $1;
        vec3 res = finalColor.rgb;

        // Vibrance
        if (u_vibrance != 0.0) {
            res = applyVibrance(res, u_vibrance);
        }

        // Deband (Simple Dither)
        if (u_deband > 0.5) {
            float noise = (rand(v_texCoord) - 0.5) / 255.0;
            res += noise;
        }

        gl_FragColor = vec4(clamp(res, 0.0, 1.0), finalColor.a);
    `
});

// ==================== STORAGE KEYS ====================

/**
 * Chrome storage keys
 * @const {Object}
 */
const STORAGE_KEYS = Object.freeze({
    CONFIG: 'anime4k_config'
});

// ==================== RENDER STRATEGIES ====================

/**
 * Available render strategies
 * @const {Object}
 */
const RENDER_STRATEGY = Object.freeze({
    WORKER_OFFSCREEN: 'worker-offscreen',
    WEBGL2_MAIN: 'webgl2-main',
    WEBGL1_MAIN: 'webgl1-main'
});

// ==================== EXPORTS FOR NON-MODULE USAGE ====================

// Make available on window for content scripts
if (typeof window !== 'undefined') {
    window.Anime4KConfig = {
        DEFAULT_CONFIG,
        MODEL_NAMES,
        MODEL_QUALITY_MULTIPLIERS,
        RESOLUTION_PRESETS,
        QUALITY_PRESETS,
        PERFORMANCE_CONSTANTS,
        UI_CONSTANTS,
        WEBGL_CONSTANTS,
        VERTEX_SHADER_SOURCE,
        BASIC_FRAGMENT_SHADER,
        POST_PROCESSING_SHADER,
        STORAGE_KEYS,
        RENDER_STRATEGY
    };
}

// For worker context
if (typeof self !== 'undefined' && typeof window === 'undefined') {
    self.Anime4KConfig = {
        DEFAULT_CONFIG,
        MODEL_NAMES,
        PERFORMANCE_CONSTANTS,
        WEBGL_CONSTANTS,
        VERTEX_SHADER_SOURCE,
        BASIC_FRAGMENT_SHADER,
        POST_PROCESSING_SHADER,
        RENDER_STRATEGY
    };
}
