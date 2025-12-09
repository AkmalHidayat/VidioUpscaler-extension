/**
 * @fileoverview Main entry point for Anime4K content script
 * This file initializes and orchestrates all video processing functionality.
 * @version 2.8.3
 */

(function () {
    'use strict';

    // Prevent double initialization
    if (window.__anime4k_loaded__) return;
    window.__anime4k_loaded__ = true;

    console.log('%c[Anime4K v2.8.3] Starting...', 'color: #4ade80; font-weight: bold');

    // Get references to utility modules
    const Config = window.Anime4KConfig || {};
    const DOMUtils = window.DOMUtils;
    const ResolutionUtils = window.ResolutionUtils;

    const PERFORMANCE = Config.PERFORMANCE_CONSTANTS || {};
    const STORAGE_KEYS = Config.STORAGE_KEYS || { CONFIG: 'anime4k_config' };

    // ==================== STATE ====================

    /** @type {Object} Current configuration */
    let config = { ...Config.DEFAULT_CONFIG };

    /** @type {Map<HTMLVideoElement, Object>} Map of processed videos */
    const processedVideos = new Map();

    /** @type {Object} Renderer support detection */
    const RENDER_SUPPORT = ResolutionUtils.detectRendererSupport();

    /** @type {string} Current render strategy */
    const CURRENT_STRATEGY = ResolutionUtils.selectRenderStrategy(RENDER_SUPPORT);

    console.log('[Anime4K] Render strategy:', CURRENT_STRATEGY,
        '| WebGL2:', RENDER_SUPPORT.hasWebGL2,
        '| OffscreenCanvas:', RENDER_SUPPORT.hasOffscreen);

    // Apply default max instances based on capabilities
    if (config.maxInstances === undefined) {
        config.maxInstances = ResolutionUtils.getDefaultMaxInstances(RENDER_SUPPORT);
    }

    // ==================== CONFIG MANAGEMENT ====================

    /**
     * Checks if extension context is still valid
     * @returns {boolean} True if context is valid
     */
    function isExtensionContextValid() {
        try {
            return !!(chrome && chrome.runtime && chrome.runtime.id);
        } catch (e) {
            return false;
        }
    }

    /**
     * Loads configuration from Chrome storage
     */
    function loadConfig() {
        if (!isExtensionContextValid()) {
            console.warn('[Anime4K] Extension context invalidated, skipping config load');
            return;
        }
        try {
            chrome.storage.sync.get(STORAGE_KEYS.CONFIG, (data) => {
                if (chrome.runtime.lastError) {
                    console.warn('[Anime4K] Storage error:', chrome.runtime.lastError);
                    return;
                }
                if (data && data[STORAGE_KEYS.CONFIG]) {
                    config = { ...config, ...data[STORAGE_KEYS.CONFIG] };
                    console.log('[Anime4K] Config loaded from storage:', config);
                } else {
                    console.log('[Anime4K] No stored config found, using defaults');
                }
            });
        } catch (e) {
            console.warn('[Anime4K] Error loading config:', e);
        }
    }

    /**
     * Saves configuration to Chrome storage
     */
    function saveConfig() {
        if (!isExtensionContextValid()) {
            console.warn('[Anime4K] Extension context invalidated, skipping config save');
            return;
        }
        try {
            chrome.storage.sync.set({ [STORAGE_KEYS.CONFIG]: config }, () => {
                if (chrome.runtime.lastError) {
                    console.warn('[Anime4K] Storage save error:', chrome.runtime.lastError);
                }
            });
        } catch (e) {
            console.warn('[Anime4K] Error saving config:', e);
        }
    }

    // ==================== VIDEO PROCESSING ====================

    /**
     * Processes a single video element
     * @param {HTMLVideoElement} video - Video element to process
     */
    function processVideo(video) {
        const VideoProcessor = window.VideoProcessor;
        const minWidth = PERFORMANCE.MIN_VIDEO_WIDTH || 100;
        const minHeight = PERFORMANCE.MIN_VIDEO_HEIGHT || 100;
        const maxInstances = config.maxInstances || 3;

        // Skip if already processed
        if (processedVideos.has(video)) return;

        // Skip if video too small
        if (video.videoWidth < minWidth || video.videoHeight < minHeight) return;

        // Check instance limit
        if (processedVideos.size >= maxInstances) {
            console.warn('[Anime4K] Max concurrent upscalers reached:', maxInstances, '— skipping video');
            DOMUtils.showToast('Max upscaler instances reached on this page', true);
            return;
        }

        console.log('[Anime4K] Processing video:', video.videoWidth, 'x', video.videoHeight);

        // Create processor
        const processor = new VideoProcessor(video, config, RENDER_SUPPORT);

        if (processor.initialize()) {
            // Set cleanup callback
            processor.onCleanup = () => {
                processedVideos.delete(video);
                console.log('[Anime4K] Released resources (total active:', processedVideos.size, ')');
            };

            // Store reference
            processedVideos.set(video, processor.getStorageData());

            // Start render loop
            processor.startRenderLoop();

            console.log('[Anime4K] Created upscaler (total active:', processedVideos.size, ')');
        }
    }

    /**
     * Scans for videos and processes them
     */
    function scanVideos() {
        const videos = DOMUtils.findVideosInRoot(document);

        videos.forEach(video => {
            // CORS patch
            if (!video.hasAttribute('data-a4k-patched')) {
                video.setAttribute('data-a4k-patched', 'true');

                if (!video.crossOrigin) {
                    video.crossOrigin = 'anonymous';

                    // Re-assign src for proper headers
                    if (video.src && !video.src.startsWith('blob:') && !video.src.startsWith('data:')) {
                        const t = video.currentTime;
                        const p = !video.paused;
                        video.src = video.src;
                        video.currentTime = t;
                        if (p) video.play().catch(() => { });
                    }
                }
            }

            // Process if ready
            if (!processedVideos.has(video) && video.videoWidth > 0) {
                processVideo(video);
            }
        });
    }

    // ==================== CONFIG SYNC ====================

    /**
     * Handles storage changes
     */
    chrome.storage.onChanged.addListener((changes, namespace) => {
        // Skip if extension context is invalid (extension was reloaded)
        if (!isExtensionContextValid()) return;
        if (namespace !== 'sync') return;

        let needsReload = false;

        console.log('[Anime4K] Storage changed:', changes);

        if (changes[STORAGE_KEYS.CONFIG] && changes[STORAGE_KEYS.CONFIG].newValue) {
            const newCfg = changes[STORAGE_KEYS.CONFIG].newValue;
            console.log('[Anime4K] New config from storage:', newCfg);

            if (newCfg.model !== undefined || newCfg.resolution !== undefined || newCfg.customScale !== undefined) {
                needsReload = true;
                console.log('[Anime4K] Detected heavy change, will reload upscalers');
            }

            config = { ...config, ...newCfg };
        } else {
            // Fallback: flat key updates
            for (const [key, { newValue }] of Object.entries(changes)) {
                config[key] = newValue;
                if (key === 'model' || key === 'resolution' || key === 'customScale') {
                    needsReload = true;
                    console.log('[Anime4K] Detected heavy change on key:', key);
                }
            }
        }

        // Reload upscalers for heavy changes
        if (needsReload) {
            console.log('[Anime4K] Config changed, restarting upscalers...');

            const videos = DOMUtils.findVideosInRoot(document);
            videos.forEach(video => {
                const data = processedVideos.get(video);
                if (data && typeof data.cleanup === 'function') {
                    data.cleanup();
                }
                processedVideos.delete(video);
            });

            setTimeout(scanVideos, PERFORMANCE.CONFIG_RELOAD_DELAY_MS || 50);
        }
    });

    // ==================== MUTATION OBSERVER ====================

    /**
     * Cleanup handler for removed videos
     */
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            m.removedNodes.forEach(node => {
                try {
                    if (node && node.nodeName === 'VIDEO') {
                        const data = processedVideos.get(node);
                        if (data && typeof data.cleanup === 'function') data.cleanup();
                    } else if (node && node.querySelectorAll) {
                        node.querySelectorAll('video').forEach(v => {
                            const data = processedVideos.get(v);
                            if (data && typeof data.cleanup === 'function') data.cleanup();
                        });
                    }
                } catch (e) {
                    // Ignore errors during mutation handling
                }
            });
        });
    });

    // ==================== KEYBOARD SHORTCUTS ====================

    document.addEventListener('keydown', (e) => {
        // Alt+U: Toggle Upscaler
        if (e.altKey && e.key.toLowerCase() === 'u') {
            config.enabled = !config.enabled;
            saveConfig();
            DOMUtils.showToast(config.enabled ? '✨ Anime4K ENABLED' : '○ Anime4K DISABLED');
        }
    });

    // ==================== INITIALIZATION ====================

    // Load config
    loadConfig();

    // Wait for shaders and start
    setTimeout(() => {
        console.log('[Anime4K] Available shaders:', Object.keys(window.Anime4KShaders || {}));
        scanVideos();
        setInterval(scanVideos, PERFORMANCE.VIDEO_SCAN_INTERVAL_MS || 2000);
    }, PERFORMANCE.SHADER_INIT_DELAY_MS || 500);

    // Start mutation observer
    if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }

})();
