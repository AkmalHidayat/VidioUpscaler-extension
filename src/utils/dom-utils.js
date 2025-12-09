/**
 * @fileoverview DOM utility functions for Anime4K Web Upscaler
 * Contains helper functions for DOM manipulation, styling, and UI elements.
 * @version 2.8.1
 */

'use strict';

/**
 * DOM Utilities namespace
 * @namespace
 */
const DOMUtils = {
    /**
     * Creates a styled element with given options
     * @param {string} tag - HTML tag name
     * @param {Object} options - Element options
     * @param {string} [options.className] - CSS class name
     * @param {string} [options.cssText] - Inline CSS styles
     * @param {string} [options.innerHTML] - Inner HTML content
     * @param {string} [options.textContent] - Text content
     * @param {Object} [options.attributes] - Additional attributes
     * @returns {HTMLElement} Created element
     */
    createElement(tag, options = {}) {
        const element = document.createElement(tag);

        if (options.className) element.className = options.className;
        if (options.cssText) element.style.cssText = options.cssText;
        if (options.innerHTML) element.innerHTML = options.innerHTML;
        if (options.textContent) element.textContent = options.textContent;

        if (options.attributes) {
            for (const [key, value] of Object.entries(options.attributes)) {
                element.setAttribute(key, value);
            }
        }

        return element;
    },

    /**
     * Creates the upscaler wrapper element
     * @param {HTMLVideoElement} video - Video element
     * @returns {HTMLDivElement} Wrapper element
     */
    createUpscalerWrapper(video) {
        const wrapper = this.createElement('div', {
            className: 'anime4k-wrapper',
            cssText: 'position:absolute;pointer-events:none;overflow:hidden;transform-origin:0 0;'
        });

        wrapper.style.top = video.offsetTop + 'px';
        wrapper.style.left = video.offsetLeft + 'px';
        wrapper.style.width = video.offsetWidth + 'px';
        wrapper.style.height = video.offsetHeight + 'px';

        return wrapper;
    },

    /**
     * Creates the canvas element for rendering
     * @param {number} width - Canvas width
     * @param {number} height - Canvas height
     * @returns {HTMLCanvasElement} Canvas element
     */
    createRenderCanvas(width, height) {
        const canvas = this.createElement('canvas', {
            cssText: 'width:100%;height:100%;display:block;background:#000;'
        });
        canvas.width = width;
        canvas.height = height;
        return canvas;
    },

    /**
     * Creates the model info label
     * @param {string} modelName - Display name of the model
     * @param {number} width - Output width
     * @param {number} height - Output height
     * @returns {HTMLDivElement} Label element
     */
    createModelLabel(modelName, width, height) {
        return this.createElement('div', {
            cssText: `
                position:absolute;top:15px;left:50%;transform:translateX(-50%);
                background:linear-gradient(135deg,rgba(74,222,128,0.85),rgba(34,197,94,0.85));
                color:#000;padding:8px 12px;border-radius:8px;
                font:bold 12px system-ui;z-index:100;pointer-events:none;
                backdrop-filter:blur(4px);text-align:center;
                box-shadow:0 4px 12px rgba(0,0,0,0.1);
            `,
            innerHTML: `✨ ${modelName}<br><span style="opacity:0.7">${width}×${height}</span>`
        });
    },

    /**
     * Creates the FPS counter label
     * @returns {HTMLDivElement} FPS label element
     */
    createFpsLabel() {
        return this.createElement('div', {
            cssText: `
                position:absolute;top:65px;left:50%;transform:translateX(-50%);
                background:rgba(0,0,0,0.6);color:#4ade80;
                padding:4px 10px;border-radius:6px;
                font:bold 11px monospace;z-index:99;pointer-events:none;
                backdrop-filter:blur(2px);
            `,
            textContent: 'FPS: --'
        });
    },

    /**
     * Creates the comparison slider UI
     * @param {number} initialPos - Initial slider position (0-100)
     * @param {number} videoWidth - Original video width
     * @param {number} videoHeight - Original video height
     * @param {number} outWidth - Output width
     * @param {number} outHeight - Output height
     * @returns {Object} Object containing slider container and handle elements
     */
    createComparisonSlider(initialPos, videoWidth, videoHeight, outWidth, outHeight) {
        // Container
        const container = this.createElement('div', {
            cssText: 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:200;pointer-events:none;'
        });

        // Slider line
        const slider = this.createElement('div', {
            cssText: `
                position:absolute;top:0;left:${initialPos}%;width:4px;height:100%;
                background:linear-gradient(180deg, #4ade80 0%, #22c55e 50%, #4ade80 100%);
                box-shadow: 0 0 10px rgba(74,222,128,0.8), 0 0 20px rgba(74,222,128,0.4);
                z-index:201;cursor:ew-resize;pointer-events:auto;transform:translateX(-50%);
            `
        });

        // Handle
        const handle = this.createElement('div', {
            cssText: `
                position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
                width:44px;height:44px;
                background:linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
                border:4px solid #fff;border-radius:50%;
                display:flex;align-items:center;justify-content:center;
                font-size:20px;color:#fff;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3), 0 0 15px rgba(74,222,128,0.5);
                cursor:ew-resize;user-select:none;
            `,
            textContent: '⟷'
        });
        slider.appendChild(handle);

        // Arrows
        const topArrow = this.createElement('div', {
            cssText: 'position:absolute;top:10px;left:50%;transform:translateX(-50%);color:#fff;font-size:12px;text-shadow:0 1px 3px rgba(0,0,0,0.8);',
            textContent: '▼'
        });
        slider.appendChild(topArrow);

        const bottomArrow = this.createElement('div', {
            cssText: 'position:absolute;bottom:10px;left:50%;transform:translateX(-50%);color:#fff;font-size:12px;text-shadow:0 1px 3px rgba(0,0,0,0.8);',
            textContent: '▲'
        });
        slider.appendChild(bottomArrow);

        container.appendChild(slider);

        // Labels
        const leftLabel = this.createElement('div', {
            cssText: `
                position:absolute;top:10px;left:10px;
                background:linear-gradient(135deg,#4ade80,#22c55e);
                color:#000;padding:8px 12px;border-radius:8px;
                font:bold 12px system-ui;z-index:100;pointer-events:none;
                box-shadow:0 2px 8px rgba(0,0,0,0.3);
            `,
            innerHTML: `✨ Enhanced<br><span style="opacity:0.7">${outWidth}×${outHeight}</span>`
        });
        container.appendChild(leftLabel);

        const rightLabel = this.createElement('div', {
            cssText: `
                position:absolute;top:10px;right:10px;
                background:linear-gradient(135deg,#ef4444,#dc2626);
                color:#fff;padding:8px 12px;border-radius:8px;
                font:bold 12px system-ui;z-index:100;pointer-events:none;
                box-shadow:0 2px 8px rgba(0,0,0,0.3);
            `,
            innerHTML: `📺 Original<br><span style="opacity:0.7">${videoWidth}×${videoHeight}</span>`
        });
        container.appendChild(rightLabel);

        return {
            container,
            slider,
            handle,
            leftLabel,
            rightLabel
        };
    },

    /**
     * Shows a toast notification
     * @param {string} message - Message to display
     * @param {boolean} [isError=false] - Whether this is an error message
     */
    showToast(message, isError = false) {
        const id = 'a4k-toast';
        let toast = document.getElementById(id);

        if (!toast) {
            toast = this.createElement('div', {
                attributes: { id },
                cssText: `
                    position:fixed;top:20px;right:20px;z-index:2147483647;
                    padding:12px 20px;background:rgba(0,0,0,0.85);
                    backdrop-filter:blur(10px);border:1px solid #333;
                    border-radius:12px;color:#fff;font-family:system-ui;
                    font-size:14px;font-weight:500;
                    transition:opacity 0.3s, transform 0.3s;
                    pointer-events:none;opacity:0;transform:translateY(-10px);
                    box-shadow:0 8px 32px rgba(0,0,0,0.3);
                `
            });
            document.body.appendChild(toast);
        }

        const colors = window.Anime4KConfig?.UI_CONSTANTS || {
            COLOR_SUCCESS: '#4ade80',
            COLOR_WARNING: '#f87171'
        };

        toast.textContent = message;
        toast.style.borderColor = isError ? colors.COLOR_WARNING : colors.COLOR_SUCCESS;
        toast.style.color = isError ? colors.COLOR_WARNING : '#fff';

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
        }, 3000);
    },

    /**
     * Calculates the visible video rect accounting for object-fit: contain
     * @param {HTMLVideoElement} video - Video element
     * @returns {Object} Object with width, height, top, left
     */
    getVisibleVideoRect(video) {
        const videoRatio = video.videoWidth / video.videoHeight;
        const elementRatio = video.offsetWidth / video.offsetHeight;

        let width, height, top, left;

        if (elementRatio > videoRatio) {
            // Pillarbox (bars on left/right)
            height = video.offsetHeight;
            width = height * videoRatio;
            top = video.offsetTop;
            left = video.offsetLeft + (video.offsetWidth - width) / 2;
        } else {
            // Letterbox (bars on top/bottom)
            width = video.offsetWidth;
            height = width / videoRatio;
            left = video.offsetLeft;
            top = video.offsetTop + (video.offsetHeight - height) / 2;
        }

        return { width, height, top, left };
    },

    /**
     * Finds all videos including those in Shadow DOM
     * @param {Document|ShadowRoot} root - Root to search from
     * @param {Array} [videos=[]] - Accumulator array
     * @returns {Array<HTMLVideoElement>} Array of video elements
     */
    findVideosInRoot(root, videos = []) {
        if (!root) return videos;

        root.querySelectorAll('video').forEach(v => videos.push(v));

        root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) {
                this.findVideosInRoot(el.shadowRoot, videos);
            }
        });

        return videos;
    },

    /**
     * Ensures parent element has position for absolute positioning
     * @param {HTMLElement} parent - Parent element
     */
    ensurePositionedParent(parent) {
        if (getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
        }
    }
};

// Make available on window
if (typeof window !== 'undefined') {
    window.DOMUtils = DOMUtils;
}
