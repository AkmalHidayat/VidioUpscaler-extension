/**
 * @fileoverview Core Video Processor for NextClarity
 * Main class that handles video processing, WebGL setup, and render loop.
 * @version 2.8.1
 */

'use strict';

/**
 * Video Processor class
 * Handles all video upscaling functionality
 */
class VideoProcessor {
    /**
     * Creates a new VideoProcessor instance
     * @param {HTMLVideoElement} video - Video element to process
     * @param {Object} config - Configuration object
     * @param {Object} support - Renderer support object
     */
    constructor(video, config, support) {
        this.video = video;
        this.config = config;
        this.support = support;

        // Resources
        this.wrapper = null;
        this.canvas = null;
        this.gl = null;
        this.isWebGL2 = false;
        this.webgl2Extensions = null;

        // Program and buffers
        this.program = null;
        this.vs = null;
        this.fs = null;
        this.posBuffer = null;
        this.texBuffer = null;
        this.texture = null;

        // Uniform locations
        this.uniforms = {};

        // UI elements
        this.label = null;
        this.fpsLabel = null;
        this.sliderUI = null;

        // State
        this.running = false;
        this.frameCount = 0;
        this.lastFpsTime = performance.now();
        this.lowPerfFrameCount = 0;
        this.perfWarningShown = false;
        this.lastVideoW = video.videoWidth;
        this.lastVideoH = video.videoHeight;
        this.outW = 0;
        this.outH = 0;

        // Callbacks
        this.onCleanup = null;
    }

    /**
     * Initialize the video processor
     * @returns {boolean} True if initialization succeeded
     */
    initialize() {
        const DOMUtils = window.DOMUtils;
        const WebGLUtils = window.WebGLUtils;
        const ShaderUtils = window.ShaderUtils;
        const ResolutionUtils = window.ResolutionUtils;
        const config = window.Anime4KConfig || {};
        const constants = config.PERFORMANCE_CONSTANTS || {};
        const modelNames = config.MODEL_NAMES || {};

        // Calculate output resolution
        let [outW, outH] = ResolutionUtils.getTargetResolution(
            this.video.videoWidth,
            this.video.videoHeight,
            this.config.resolution,
            this.config.customScale
        );

        // Apply quality cap
        [outW, outH] = ResolutionUtils.applyQualityCap(
            this.video.videoWidth,
            this.video.videoHeight,
            outW,
            outH,
            this.config.qualityPreset,
            this.support
        );

        this.outW = outW;
        this.outH = outH;

        console.log('[Anime4K] Output resolution:', outW, 'x', outH);

        // Create wrapper
        const parent = this.video.parentElement;
        if (!parent) return false;

        this.wrapper = DOMUtils.createUpscalerWrapper(this.video);
        DOMUtils.ensurePositionedParent(parent);

        // Insert after video
        if (this.video.nextSibling) {
            parent.insertBefore(this.wrapper, this.video.nextSibling);
        } else {
            parent.appendChild(this.wrapper);
        }

        // Create canvas
        this.canvas = DOMUtils.createRenderCanvas(outW, outH);
        this.wrapper.appendChild(this.canvas);

        // Get WebGL context
        const ctxResult = WebGLUtils.getContext(this.canvas, true);
        this.gl = ctxResult.gl;
        this.isWebGL2 = ctxResult.isWebGL2;

        if (!this.gl) {
            console.error('[Anime4K] WebGL not available');
            this.wrapper.remove();
            return false;
        }

        // Setup WebGL2 extensions if available
        if (this.isWebGL2) {
            this.webgl2Extensions = WebGLUtils.setupWebGL2Extensions(this.gl);
        }

        // Clamp to texture size limit
        WebGLUtils.clampToTextureLimit(this.gl, this.canvas);

        // Create shader program
        const vertexShader = ShaderUtils.getVertexShader();
        const fragmentShader = ShaderUtils.getFragmentShader(this.config.model, this.config);

        let programObj = WebGLUtils.createProgram(this.gl, vertexShader, fragmentShader);

        if (!programObj) {
            console.warn('[Anime4K] External shader failed, using basic fallback');
            const basicFragment = `
                precision mediump float;
                varying vec2 v_texCoord;
                uniform sampler2D u_texture;
                void main() { gl_FragColor = texture2D(u_texture, v_texCoord); }
            `;
            programObj = WebGLUtils.createProgram(this.gl, vertexShader, basicFragment);
        }

        if (!programObj || !programObj.program) {
            console.error('[Anime4K] Failed to create shader program');
            this.wrapper.remove();
            return false;
        }

        this.program = programObj.program;
        this.vs = programObj.vs;
        this.fs = programObj.fs;

        // Setup buffers
        this.posBuffer = WebGLUtils.createPositionBuffer(this.gl);
        this.texBuffer = WebGLUtils.createTexCoordBuffer(this.gl);
        this.texture = WebGLUtils.createVideoTexture(this.gl);

        // Apply anisotropic filtering
        if (this.webgl2Extensions) {
            WebGLUtils.applyAnisotropicFiltering(this.gl, this.webgl2Extensions);
        }

        // Use program and setup uniforms
        this.gl.useProgram(this.program);
        this._setupUniforms();

        // Create UI
        this._createUI(modelNames);

        this.running = true;
        console.log('[Anime4K] ✓ Video processed successfully');

        return true;
    }

    /**
     * Sets up uniform locations and initial values
     * @private
     */
    _setupUniforms() {
        const gl = this.gl;
        const program = this.program;

        this.uniforms = {
            texture: gl.getUniformLocation(program, 'u_texture'),
            texSize: gl.getUniformLocation(program, 'u_texSize'),
            sharpen: gl.getUniformLocation(program, 'u_sharpen'),
            vibrance: gl.getUniformLocation(program, 'u_vibrance'),
            deband: gl.getUniformLocation(program, 'u_deband')
        };

        gl.uniform1i(this.uniforms.texture, 0);

        if (this.uniforms.texSize) {
            gl.uniform2f(this.uniforms.texSize, this.video.videoWidth, this.video.videoHeight);
        }
        if (this.uniforms.sharpen) {
            gl.uniform1f(this.uniforms.sharpen, this.config.sharpen);
        }
        if (this.uniforms.vibrance) {
            gl.uniform1f(this.uniforms.vibrance, this.config.vibrance);
        }
        if (this.uniforms.deband) {
            gl.uniform1f(this.uniforms.deband, this.config.deband ? 1.0 : 0.0);
        }
    }

    /**
     * Creates UI elements
     * @param {Object} modelNames - Model name mappings
     * @private
     */
    _createUI(modelNames) {
        const DOMUtils = window.DOMUtils;

        // Model label
        this.label = DOMUtils.createModelLabel(
            modelNames[this.config.model] || this.config.model,
            this.outW,
            this.outH
        );
        this.wrapper.appendChild(this.label);

        // FPS label
        this.fpsLabel = DOMUtils.createFpsLabel();
        this.wrapper.appendChild(this.fpsLabel);

        // Comparison slider
        this.sliderUI = DOMUtils.createComparisonSlider(
            this.config.sliderPos,
            this.video.videoWidth,
            this.video.videoHeight,
            this.outW,
            this.outH
        );
        this.wrapper.appendChild(this.sliderUI.container);

        // Setup slider interaction
        this._setupSliderInteraction();
    }

    /**
     * Sets up comparison slider interaction
     * @private
     */
    _setupSliderInteraction() {
        let dragging = false;
        const slider = this.sliderUI.slider;
        const container = this.sliderUI.container;
        const canvas = this.canvas;
        const config = this.config;

        const updateSlider = (clientX) => {
            const rect = container.getBoundingClientRect();
            const constants = window.Anime4KConfig?.UI_CONSTANTS || {
                SLIDER_MIN_PERCENT: 5,
                SLIDER_MAX_PERCENT: 95
            };
            const pct = Math.max(
                constants.SLIDER_MIN_PERCENT,
                Math.min(constants.SLIDER_MAX_PERCENT, ((clientX - rect.left) / rect.width) * 100)
            );
            config.sliderPos = pct;
            slider.style.left = pct + '%';
            if (config.compare) {
                canvas.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
            }
        };

        const saveConfig = () => {
            try {
                chrome.storage.sync.set({ anime4k_config: config });
            } catch (e) { }
        };

        slider.addEventListener('mousedown', (e) => { dragging = true; e.preventDefault(); });
        document.addEventListener('mousemove', (e) => { if (dragging) updateSlider(e.clientX); });
        document.addEventListener('mouseup', () => { if (dragging) { dragging = false; saveConfig(); } });
        slider.addEventListener('touchstart', (e) => { dragging = true; e.preventDefault(); }, { passive: false });
        document.addEventListener('touchmove', (e) => {
            if (dragging && e.touches.length) updateSlider(e.touches[0].clientX);
        }, { passive: true });
        document.addEventListener('touchend', () => { if (dragging) { dragging = false; saveConfig(); } });
    }

    /**
     * Starts the render loop
     */
    startRenderLoop() {
        const render = () => {
            if (!this.config.enabled) {
                if (this.wrapper.style.display !== 'none') {
                    this.wrapper.style.display = 'none';
                }
                if (this.running) requestAnimationFrame(render);
                return;
            }

            if (this.wrapper.style.display === 'none') {
                this.wrapper.style.display = 'block';
            }

            if (!this.running) {
                requestAnimationFrame(render);
                return;
            }

            // Sync wrapper position
            this._syncWrapperPosition();

            // Update UI visibility
            this._updateUIVisibility();

            // Check for resolution change
            this._checkResolutionChange();

            // Render frame
            if (this.video.readyState >= this.video.HAVE_CURRENT_DATA) {
                this._renderFrame();
            }

            if (this.running) requestAnimationFrame(render);
        };

        requestAnimationFrame(render);
    }

    /**
     * Syncs wrapper position with video
     * @private
     */
    _syncWrapperPosition() {
        const DOMUtils = window.DOMUtils;
        const rect = DOMUtils.getVisibleVideoRect(this.video);

        this.wrapper.style.top = rect.top + 'px';
        this.wrapper.style.left = rect.left + 'px';
        this.wrapper.style.width = rect.width + 'px';
        this.wrapper.style.height = rect.height + 'px';
    }

    /**
     * Updates UI element visibility based on config
     * @private
     */
    _updateUIVisibility() {
        if (this.label) {
            this.label.style.display = this.config.showLabels ? 'block' : 'none';
        }
        if (this.fpsLabel) {
            this.fpsLabel.style.display = (this.config.showFps || this.config.showRenderTime) ? 'block' : 'none';
        }
        if (this.sliderUI?.container) {
            this.sliderUI.container.style.display = this.config.compare ? 'block' : 'none';
            this.canvas.style.clipPath = this.config.compare
                ? `inset(0 ${100 - this.config.sliderPos}% 0 0)`
                : 'none';
        }
    }

    /**
     * Checks for video resolution changes
     * @private
     */
    _checkResolutionChange() {
        if (this.video.videoWidth !== this.lastVideoW || this.video.videoHeight !== this.lastVideoH) {
            console.log('[Anime4K] Video resolution changed:', this.video.videoWidth, 'x', this.video.videoHeight);
            this.lastVideoW = this.video.videoWidth;
            this.lastVideoH = this.video.videoHeight;

            const ResolutionUtils = window.ResolutionUtils;
            const modelNames = window.Anime4KConfig?.MODEL_NAMES || {};

            const [newW, newH] = ResolutionUtils.getTargetResolution(
                this.video.videoWidth,
                this.video.videoHeight,
                this.config.resolution,
                this.config.customScale
            );

            this.canvas.width = newW;
            this.canvas.height = newH;
            this.outW = newW;
            this.outH = newH;

            if (this.uniforms.texSize) {
                this.gl.uniform2f(this.uniforms.texSize, this.video.videoWidth, this.video.videoHeight);
            }

            this.label.innerHTML = `✨ ${modelNames[this.config.model] || this.config.model}<br><span style="opacity:0.7">${newW}×${newH}</span>`;
            if (this.sliderUI?.leftLabel) {
                this.sliderUI.leftLabel.innerHTML = `✨ Enhanced<br><span style="opacity:0.7">${newW}×${newH}</span>`;
            }
            if (this.sliderUI?.rightLabel) {
                this.sliderUI.rightLabel.innerHTML = `📺 Original<br><span style="opacity:0.7">${this.video.videoWidth}×${this.video.videoHeight}</span>`;
            }
        }
    }

    /**
     * Renders a single frame
     * @private
     */
    _renderFrame() {
        try {
            const renderStart = performance.now();
            const gl = this.gl;
            const WebGLUtils = window.WebGLUtils;

            gl.useProgram(this.program);
            WebGLUtils.setupAttributes(gl, this.program, this.posBuffer, this.texBuffer);

            // Update uniforms
            gl.uniform1i(this.uniforms.texture, 0);
            if (this.uniforms.texSize) {
                gl.uniform2f(this.uniforms.texSize, this.video.videoWidth, this.video.videoHeight);
            }
            if (this.uniforms.sharpen) {
                gl.uniform1f(this.uniforms.sharpen, this.config.sharpen);
            }
            if (this.uniforms.vibrance) {
                gl.uniform1f(this.uniforms.vibrance, this.config.vibrance);
            }
            if (this.uniforms.deband) {
                gl.uniform1f(this.uniforms.deband, this.config.deband ? 1.0 : 0.0);
            }

            // Upload video frame
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.video);

            // Draw
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            const renderEnd = performance.now();
            const renderTime = renderEnd - renderStart;

            // Update FPS counter
            this._updateFpsCounter(renderTime);

        } catch (e) {
            if (e && e.name === 'SecurityError') {
                console.warn('[Anime4K] Stopped rendering due to CORS restriction');
                window.DOMUtils?.showToast('Sorry This Media/Server Is Not Supported', true);
                this.running = false;
                this.cleanup();
            } else {
                console.error('[Anime4K] Render error:', e);
            }
        }
    }

    /**
     * Updates FPS counter display
     * @param {number} renderTime - Render time in ms
     * @private
     */
    _updateFpsCounter(renderTime) {
        this.frameCount++;
        const now = performance.now();

        if (now - this.lastFpsTime >= 1000) {
            const currentFps = this.frameCount;

            if (this.fpsLabel) {
                let parts = [];
                if (this.config.showFps) parts.push('FPS: ' + currentFps);
                if (this.config.showRenderTime) parts.push(`${renderTime.toFixed(2)}ms`);
                this.fpsLabel.textContent = parts.join(' | ');
            }

            // Performance warning
            const constants = window.Anime4KConfig?.PERFORMANCE_CONSTANTS || {
                LOW_FPS_THRESHOLD: 15,
                LOW_FPS_WARNING_COUNT: 5
            };

            if (this.running && currentFps < constants.LOW_FPS_THRESHOLD && currentFps > 0) {
                this.lowPerfFrameCount++;
                if (this.lowPerfFrameCount >= constants.LOW_FPS_WARNING_COUNT && !this.perfWarningShown) {
                    window.DOMUtils?.showToast('⚠ Low Performance detected. Try a lower resolution.');
                    this.perfWarningShown = true;
                }
            } else {
                this.lowPerfFrameCount = 0;
            }

            this.frameCount = 0;
            this.lastFpsTime = now;
        }
    }

    /**
     * Cleans up all resources
     */
    cleanup() {
        this.running = false;

        try { this.wrapper?.remove(); } catch (e) { }

        if (this.gl) {
            window.WebGLUtils?.cleanup(this.gl, {
                posBuffer: this.posBuffer,
                texBuffer: this.texBuffer,
                texture: this.texture,
                program: this.program,
                vs: this.vs,
                fs: this.fs
            });
        }

        if (this.onCleanup) {
            this.onCleanup();
        }
    }

    /**
     * Gets data for storage in processedVideos map
     * @returns {Object} Storage data object
     */
    getStorageData() {
        return {
            wrapper: this.wrapper,
            canvas: this.canvas,
            gl: this.gl,
            running: true,
            cleanup: () => this.cleanup()
        };
    }
}

// Make available on window
if (typeof window !== 'undefined') {
    window.VideoProcessor = VideoProcessor;
}
