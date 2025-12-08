// content.js - Anime4K Extension v2.0.5
// Complete rewrite with proven WebGL implementation

(function () {
    'use strict';

    if (window.__anime4k_loaded__) return;
    window.__anime4k_loaded__ = true;

    console.log('%c[Anime4K v2.0.5] Starting...', 'color: #4ade80; font-weight: bold');

    // ==================== CONFIG ====================
    let config = {
        model: 'anime4k_v41_fast',
        resolution: '2x',
        customScale: 2.0,
        sharpen: 0.0,
        vibrance: 0.1,
        deband: false,
        compare: false,
        sliderPos: 50,
        showFps: true,
        showLabels: true,
        showRenderTime: false,
        enabled: true
    };

    // Load config from storage
    try {
        chrome.storage.sync.get('anime4k_config', (data) => {
            if (data && data.anime4k_config) {
                config = { ...config, ...data.anime4k_config };
                console.log('[Anime4K] Config loaded from storage:', config);
            } else {
                console.log('[Anime4K] No stored config found, using defaults');
            }
        });
    } catch (e) {
        console.warn('[Anime4K] Error loading config:', e);
    }

    function saveConfig() {
        try { chrome.storage.sync.set({ anime4k_config: config }); } catch (e) { }
    }

    // ==================== SHADER SOURCE ====================
    const VERTEX_SHADER = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `;

    function getFragmentShader() {
        // Check if external shaders loaded
        console.log('[Anime4K] Available shaders:', Object.keys(window.Anime4KShaders || {}));
        console.log('[Anime4K] Looking for model:', config.model);

        let shaderSource = '';
        if (window.Anime4KShaders && window.Anime4KShaders[config.model]) {
            console.log('[Anime4K] ✓ Using external shader:', config.model);
            shaderSource = window.Anime4KShaders[config.model]('highp');
        } else {
            console.log('[Anime4K] ⚠ Using built-in fallback shader (external not found)');
            shaderSource = `
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
        }

        // ==================== POST-PROCESSING INJECTION ====================
        // Inject uniforms
        shaderSource = shaderSource.replace('void main() {', `
            uniform float u_vibrance;
            uniform float u_deband;
            
            // RGB to HSV conversion
            vec3 rgb2hsv(vec3 c) {
                vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
                vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
                vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
                float d = q.x - min(q.w, q.y);
                float e = 1.0e-10;
                return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
            }

            // HSV to RGB conversion
            vec3 hsv2rgb(vec3 c) {
                vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
            }

            vec3 applyVibrance(vec3 color, float strength) {
                vec3 hsv = rgb2hsv(color);
                hsv.y *= (1.0 + strength); // Increase Saturation
                return hsv2rgb(hsv);
            }

            float rand(vec2 co) {
                return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
            }

            void main() {
        `);

        // Inject calls before final output
        shaderSource = shaderSource.replace(/gl_FragColor\s*=\s*(.*?);/s, `
            vec4 finalColor = $1;
            vec3 res = finalColor.rgb;

            // Vibrance
            if (u_vibrance != 0.0) {
                res = applyVibrance(res, u_vibrance);
            }

            // Deband (Simple Dither)
            if (u_deband > 0.5) {
                float noise = (rand(v_texCoord) - 0.5) / 255.0; // +/- 0.5/255 dither
                res += noise;
            }

            gl_FragColor = vec4(clamp(res, 0.0, 1.0), finalColor.a);
        `);

        console.log('[Anime4K] Shader Post-Processing Injected.');
        return shaderSource;
    }

    // ==================== RESOLUTION ====================
    function getTargetResolution(videoW, videoH) {
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

    // ==================== STATE ====================
    let enabled = true;
    let processedVideos = new Map(); // switched from WeakMap to Map so we can track instance count
    let uiReady = false;
    let lowPerfFrameCount = 0;
    let perfWarningShown = false;

    // Detect renderer capabilities (WebGL2 / OffscreenCanvas) and set sensible defaults
    function detectRendererSupport() {
        try {
            const tmp = document.createElement('canvas');
            const hasWebGL2 = !!tmp.getContext('webgl2');
            const hasOffscreen = typeof OffscreenCanvas !== 'undefined';
            return { hasWebGL2, hasOffscreen };
        } catch (e) {
            return { hasWebGL2: false, hasOffscreen: false };
        }
    }

    const RENDER_SUPPORT = detectRendererSupport();

    // ==================== RENDER STRATEGY ====================
    // Select optimal rendering path based on browser capabilities
    const RENDER_STRATEGY = {
        WORKER_OFFSCREEN: 'worker-offscreen',    // OffscreenCanvas + WebWorker (best performance)
        WEBGL2_MAIN: 'webgl2-main',             // WebGL2 on main thread
        WEBGL1_MAIN: 'webgl1-main'              // WebGL1 on main thread (fallback)
    };

    function selectRenderStrategy() {
        if (RENDER_SUPPORT.hasOffscreen && RENDER_SUPPORT.hasWebGL2) {
            // Prefer worker-based rendering if both OffscreenCanvas and WebGL2 available
            return RENDER_STRATEGY.WORKER_OFFSCREEN;
        } else if (RENDER_SUPPORT.hasWebGL2) {
            return RENDER_STRATEGY.WEBGL2_MAIN;
        } else {
            return RENDER_STRATEGY.WEBGL1_MAIN;
        }
    }

    const CURRENT_STRATEGY = selectRenderStrategy();
    console.log('[Anime4K] Render strategy:', CURRENT_STRATEGY, '| WebGL2:', RENDER_SUPPORT.hasWebGL2, '| OffscreenCanvas:', RENDER_SUPPORT.hasOffscreen);

    // Quality presets and instance limits
    // qualityPreset: 'auto'|'low'|'medium'|'high'
    // maxInstances: integer limit of concurrent upscalers on the page
    if (config.qualityPreset === undefined) config.qualityPreset = 'auto';
    if (config.maxInstances === undefined) {
        // sensible defaults based on capabilities
        config.maxInstances = RENDER_SUPPORT.hasWebGL2 ? (RENDER_SUPPORT.hasOffscreen ? 8 : 6) : 3;
    }

    function getMaxScaleForPreset() {
        switch (config.qualityPreset) {
            case 'low': return 1.5;
            case 'medium': return 2.0;
            case 'high': return 4.0;
            case 'auto':
            default:
                // auto: prefer higher scale on WebGL2
                return RENDER_SUPPORT.hasWebGL2 ? 4.0 : 2.0;
        }
    }

    function applyQualityCap(videoW, videoH, desiredW, desiredH) {
        const desiredScale = Math.max(desiredW / Math.max(1, videoW), desiredH / Math.max(1, videoH));
        const cap = getMaxScaleForPreset();
        if (desiredScale <= cap) return [desiredW, desiredH];
        const scale = cap;
        return [Math.round(videoW * scale), Math.round(videoH * scale)];
    }

    // ==================== WEBGL HELPERS ====================
    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('[Anime4K] Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    function createProgram(gl, vsSource, fsSource) {
        const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
        const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

        if (!vs || !fs) return null;
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('[Anime4K] Program link error:', gl.getProgramInfoLog(program));
            try { gl.deleteShader(vs); gl.deleteShader(fs); } catch (e) {}
            return null;
        }

        // Return program and shader handles so caller can cleanup properly
        return { program, vs, fs };
    }

    // ==================== WEBGL2 EXTENSIONS SETUP ====================
    function setupWebGL2Extensions(gl) {
        try {
            const extensions = {
                anisotropic: gl.getExtension('EXT_texture_filter_anisotropic'),
                textureFloat: gl.getExtension('OES_texture_float'),
                textureHalf: gl.getExtension('OES_texture_half_float'),
                colorBufferFloat: gl.getExtension('EXT_color_buffer_float'),
                colorBufferHalf: gl.getExtension('EXT_color_buffer_half_float'),
                instanced: gl.getExtension('ANGLE_instanced_arrays'),
                debug: gl.getExtension('WEBGL_debug_renderer_info')
            };

            // Log available anisotropic filtering capability (don't apply yet - texture not bound)
            if (extensions.anisotropic) {
                try {
                    const maxAniso = gl.getParameter(extensions.anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
                    console.log('[Anime4K] Anisotropic filtering available (max:', maxAniso, ')');
                } catch (e) {
                    console.warn('[Anime4K] Could not query anisotropic max:', e);
                }
            }

            // Log GPU info if available
            if (extensions.debug) {
                try {
                    const renderer = gl.getParameter(extensions.debug.UNMASKED_RENDERER_WEBGL);
                    const vendor = gl.getParameter(extensions.debug.UNMASKED_VENDOR_WEBGL);
                    console.log('[Anime4K] GPU:', vendor, '|', renderer);
                } catch (e) {
                    console.warn('[Anime4K] Could not query GPU info:', e);
                }
            }

            return extensions;
        } catch (e) {
            console.warn('[Anime4K] WebGL2 extension setup error:', e);
            return null;
        }
    }

    // ==================== VIDEO PROCESSING ====================
    
    // Initialize worker-based rendering (OffscreenCanvas)
    function tryInitializeWorkerRendering(video, canvas, wrapper, config) {
        if (CURRENT_STRATEGY !== RENDER_STRATEGY.WORKER_OFFSCREEN) {
            return null; // Not using worker strategy
        }

        try {
            const workerUrl = chrome.runtime.getURL('worker.js');
            const worker = new Worker(workerUrl);

            const offscreenCanvas = canvas.transferControlToOffscreen();

            // Send initialization data to worker
            const shaderData = window.Anime4KShaders ? { ...window.Anime4KShaders } : {};
            worker.postMessage({
                type: 'init',
                data: {
                    offscreenCanvas,
                    videoWidth: video.videoWidth,
                    videoHeight: video.videoHeight,
                    canvasWidth: canvas.width,
                    canvasHeight: canvas.height,
                    config: config,
                    shaders: shaderData
                },
                port: null
            }, [offscreenCanvas]);

            console.log('[Anime4K] Worker rendering initialized for video', video.videoWidth, 'x', video.videoHeight);

            return {
                worker: worker,
                offscreenCanvas: offscreenCanvas,
                useWorker: true
            };
        } catch (e) {
            console.warn('[Anime4K] Worker initialization failed, falling back to main-thread rendering:', e);
            return null;
        }
    }

    function processVideo(video) {
        if (processedVideos.has(video)) return;
        if (video.videoWidth < 100 || video.videoHeight < 100) return;

        console.log('[Anime4K] Processing video:', video.videoWidth, 'x', video.videoHeight);

        const parent = video.parentElement;
        if (!parent) return;

        // Calculate output size
            let [outW, outH] = getTargetResolution(video.videoWidth, video.videoHeight);
            // apply quality caps based on preset and renderer support
            [outW, outH] = applyQualityCap(video.videoWidth, video.videoHeight, outW, outH);
        console.log('[Anime4K] Output resolution:', outW, 'x', outH);

        // Get video's actual position and size


        // Create wrapper - position relative to video parent
        const wrapper = document.createElement('div');
        wrapper.className = 'anime4k-wrapper';
        wrapper.style.cssText = 'position:absolute;pointer-events:none;overflow:hidden;transform-origin:0 0;';

        // Match video position within parent
        wrapper.style.top = video.offsetTop + 'px';
        wrapper.style.left = video.offsetLeft + 'px';
        wrapper.style.width = video.offsetWidth + 'px';
        wrapper.style.height = video.offsetHeight + 'px';

        // Ensure parent has position
        if (getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
        }

        // Insert AFTER video to ensure stacking (Video < Wrapper < Controls)
        if (video.nextSibling) {
            parent.insertBefore(wrapper, video.nextSibling);
        } else {
            parent.appendChild(wrapper);
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        canvas.style.cssText = 'width:100%;height:100%;display:block;background:#000;';
        wrapper.appendChild(canvas);

        // Enforce per-page instance limit (hard check before GL context creation)
        try {
            if (processedVideos.size >= (config.maxInstances || 3)) {
                console.warn('[Anime4K] Max concurrent upscalers reached:', config.maxInstances, '— skipping video');
                showToast('Max upscaler instances reached on this page', true);
                wrapper.remove();
                return;
            }
        } catch (e) {}

        // Get WebGL context (prefer WebGL2)
        let gl = null;
        let isWebGL2 = false;
        
        if (CURRENT_STRATEGY !== RENDER_STRATEGY.WEBGL1_MAIN) {
            // Try WebGL2 first if available
            gl = canvas.getContext('webgl2', {
                alpha: false,
                antialias: false,
                depth: false,
                stencil: false,
                preserveDrawingBuffer: false
            });
            if (gl) {
                isWebGL2 = true;
                console.log('[Anime4K] Using WebGL2 context');
            }
        }
        
        // Fallback to WebGL1
        if (!gl) {
            gl = canvas.getContext('webgl', {
                alpha: false,
                antialias: false,
                depth: false,
                stencil: false,
                preserveDrawingBuffer: false
            });
            console.log('[Anime4K] Using WebGL1 context');
        }

        if (!gl) {
            console.error('[Anime4K] WebGL not available');
            wrapper.remove();
            return;
        }

        console.log('[Anime4K] Created WebGL context for video', video.videoWidth, 'x', video.videoHeight, '(total active:', processedVideos.size + 1, ')');

        // ==================== WEBGL2 OPTIMIZATIONS ====================
        let webgl2Extensions = null;
        if (isWebGL2) {
            webgl2Extensions = setupWebGL2Extensions(gl);
        }

        // Clamp to GPU limits (avoid exceeding MAX_TEXTURE_SIZE)
        try {
            const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
            if (maxTex > 0 && (canvas.width > maxTex || canvas.height > maxTex)) {
                const scale = Math.min(maxTex / canvas.width, maxTex / canvas.height);
                const newW = Math.max(1, Math.floor(canvas.width * scale));
                const newH = Math.max(1, Math.floor(canvas.height * scale));
                console.warn('[Anime4K] Clamping output to MAX_TEXTURE_SIZE:', maxTex, '->', newW, 'x', newH);
                canvas.width = newW;
                canvas.height = newH;
            }
        } catch (e) {
            // Some environments restrict getParameter, ignore if unavailable
        }


        // Create program with fallback. createProgram now returns {program, vs, fs}
        let programObj = createProgram(gl, VERTEX_SHADER, getFragmentShader());
        if (!programObj) {
            console.warn('[Anime4K] External shader failed, using basic fallback');
            programObj = createProgram(gl, VERTEX_SHADER, `
                precision mediump float;
                varying vec2 v_texCoord;
                uniform sampler2D u_texture;
                void main() { gl_FragColor = texture2D(u_texture, v_texCoord); }
            `);
        }

        if (!programObj || !programObj.program) {
            console.error('[Anime4K] Failed to create shader program');
            wrapper.remove();
            return;
        }

        const program = programObj.program;
        const _vs = programObj.vs;
        const _fs = programObj.fs;

        gl.useProgram(program);

        // Get attribute locations
        const posLoc = gl.getAttribLocation(program, 'a_position');
        const texLoc = gl.getAttribLocation(program, 'a_texCoord');

        // Create and setup position buffer
        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1
        ]), gl.STATIC_DRAW);

        // Create and setup texture coordinate buffer
        const texBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0, 1,
            1, 1,
            0, 0,
            1, 0
        ]), gl.STATIC_DRAW);

        // Create texture
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Apply WebGL2 anisotropic filtering if available
        if (webgl2Extensions && webgl2Extensions.anisotropic) {
            try {
                const maxAniso = gl.getParameter(webgl2Extensions.anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
                gl.texParameterf(gl.TEXTURE_2D, webgl2Extensions.anisotropic.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(maxAniso, 16.0));
                console.log('[Anime4K] Applied anisotropic filtering (max:', Math.min(maxAniso, 16.0), ')');
            } catch (e) {
                console.warn('[Anime4K] Could not apply anisotropic filtering:', e);
            }
        }

        // Set uniforms
        const textureLoc = gl.getUniformLocation(program, 'u_texture');
        const texSizeLoc = gl.getUniformLocation(program, 'u_texSize');
        const sharpenLoc = gl.getUniformLocation(program, 'u_sharpen');
        const vibranceLoc = gl.getUniformLocation(program, 'u_vibrance');
        const debandLoc = gl.getUniformLocation(program, 'u_deband');

        gl.uniform1i(textureLoc, 0);
        if (texSizeLoc) {
            gl.uniform2f(texSizeLoc, video.videoWidth, video.videoHeight);
        }
        if (sharpenLoc) {
            gl.uniform1f(sharpenLoc, config.sharpen);
        }
        if (vibranceLoc) {
            gl.uniform1f(vibranceLoc, config.vibrance);
        }
        if (debandLoc) {
            gl.uniform1f(debandLoc, config.deband ? 1.0 : 0.0);
        }

        // Function to setup attributes before drawing
        function setupAttributes() {
            // Bind position buffer and set attribute
            gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

            // Bind texture coord buffer and set attribute
            gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
            gl.enableVertexAttribArray(texLoc);
            gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
        }

        // Initial setup
        setupAttributes();

        // Create UI labels
        const modelNames = {
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
        };

        // ==================== UI CREATION ====================

        // Label
        const label = document.createElement('div');
        label.style.cssText = 'position:absolute;top:15px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,rgba(74,222,128,0.85),rgba(34,197,94,0.85));color:#000;padding:8px 12px;border-radius:8px;font:bold 12px system-ui;z-index:100;pointer-events:none;backdrop-filter:blur(4px);text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.1);';
        label.innerHTML = `✨ ${modelNames[config.model] || config.model}<br><span style="opacity:0.7">${outW}×${outH}</span>`;
        wrapper.appendChild(label);

        // FPS Label
        const fpsLabel = document.createElement('div');
        fpsLabel.style.cssText = 'position:absolute;top:65px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.6);color:#4ade80;padding:4px 10px;border-radius:6px;font:bold 11px monospace;z-index:99;pointer-events:none;backdrop-filter:blur(2px);';
        fpsLabel.textContent = 'FPS: --';
        wrapper.appendChild(fpsLabel);

        // Comparison Slider
        const sliderContainer = document.createElement('div');
        sliderContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:200;pointer-events:none;';
        wrapper.appendChild(sliderContainer);

        const slider = document.createElement('div');
        slider.style.cssText = `
            position:absolute;
            top:0;
            left:${config.sliderPos}%;
            width:4px;
            height:100%;
            background:linear-gradient(180deg, #4ade80 0%, #22c55e 50%, #4ade80 100%);
            box-shadow: 0 0 10px rgba(74,222,128,0.8), 0 0 20px rgba(74,222,128,0.4);
            z-index:201;
            cursor:ew-resize;
            pointer-events:auto;
            transform:translateX(-50%);
        `;

        const handle = document.createElement('div');
        handle.style.cssText = `
            position:absolute;
            top:50%;
            left:50%;
            transform:translate(-50%,-50%);
            width:44px;
            height:44px;
            background:linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
            border:4px solid #fff;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:20px;
            color:#fff;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3), 0 0 15px rgba(74,222,128,0.5);
            cursor:ew-resize;
            user-select:none;
        `;
        handle.textContent = '⟷';
        slider.appendChild(handle);
        sliderContainer.appendChild(slider);

        // Arrows
        const topArrow = document.createElement('div');
        topArrow.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);color:#fff;font-size:12px;text-shadow:0 1px 3px rgba(0,0,0,0.8);';
        topArrow.textContent = '▼';
        slider.appendChild(topArrow);

        const bottomArrow = document.createElement('div');
        bottomArrow.style.cssText = 'position:absolute;bottom:10px;left:50%;transform:translateX(-50%);color:#fff;font-size:12px;text-shadow:0 1px 3px rgba(0,0,0,0.8);';
        bottomArrow.textContent = '▲';
        slider.appendChild(bottomArrow);

        // Comparison Labels
        const leftLabel = document.createElement('div');
        leftLabel.style.cssText = 'position:absolute;top:10px;left:10px;background:linear-gradient(135deg,#4ade80,#22c55e);color:#000;padding:8px 12px;border-radius:8px;font:bold 12px system-ui;z-index:100;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
        leftLabel.innerHTML = `✨ Enhanced<br><span style="opacity:0.7">${outW}×${outH}</span>`;
        sliderContainer.appendChild(leftLabel);

        const rightLabel = document.createElement('div');
        rightLabel.style.cssText = 'position:absolute;top:10px;right:10px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:8px 12px;border-radius:8px;font:bold 12px system-ui;z-index:100;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
        rightLabel.innerHTML = `📺 Original<br><span style="opacity:0.7">${video.videoWidth}×${video.videoHeight}</span>`;
        sliderContainer.appendChild(rightLabel);

        // Slider Logic
        let dragging = false;

        function updateSlider(clientX) {
            const rect = sliderContainer.getBoundingClientRect();
            const pct = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
            config.sliderPos = pct;
            slider.style.left = pct + '%';
            if (config.compare) {
                canvas.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
            }
        }

        slider.addEventListener('mousedown', (e) => { dragging = true; e.preventDefault(); });
        document.addEventListener('mousemove', (e) => { if (dragging) updateSlider(e.clientX); });
        document.addEventListener('mouseup', () => { if (dragging) { dragging = false; saveConfig(); } });
        slider.addEventListener('touchstart', (e) => { dragging = true; e.preventDefault(); }, { passive: false });
        document.addEventListener('touchmove', (e) => { if (dragging && e.touches.length) updateSlider(e.touches[0].clientX); }, { passive: true });
        document.addEventListener('touchend', () => { if (dragging) { dragging = false; saveConfig(); } });

        // Render loop
        let frameCount = 0;
        let lastFpsTime = performance.now();
        let running = true;
        let lastVideoW = video.videoWidth;
        let lastVideoH = video.videoHeight;

        function render() {
            if (!config.enabled) {
                if (wrapper.style.display !== 'none') wrapper.style.display = 'none';
                requestAnimationFrame(render);
                return;
            }
            if (wrapper.style.display === 'none') wrapper.style.display = 'block';

            if (!running) {
                requestAnimationFrame(render);
                return;
            }

            // Sync wrapper position/size with video (handles centering/resizing)
            if (wrapper && video) {
                // UI Visibility Updates
                if (label) label.style.display = config.showLabels ? 'block' : 'none';
                if (fpsLabel) fpsLabel.style.display = (config.showFps || config.showRenderTime) ? 'block' : 'none';

                if (sliderContainer) {
                    sliderContainer.style.display = config.compare ? 'block' : 'none';
                    canvas.style.clipPath = config.compare ? `inset(0 ${100 - config.sliderPos}% 0 0)` : 'none';
                }

                // Helper to calculate the actual visible video rect (accounting for object-fit: contain)
                function getVisibleVideoRect(v) {
                    const videoRatio = v.videoWidth / v.videoHeight;
                    const elementRatio = v.offsetWidth / v.offsetHeight;

                    let width, height, top, left;

                    if (elementRatio > videoRatio) {
                        // Pillarbox (bars on left/right)
                        height = v.offsetHeight;
                        width = height * videoRatio;
                        top = v.offsetTop;
                        left = v.offsetLeft + (v.offsetWidth - width) / 2;
                    } else {
                        // Letterbox (bars on top/bottom)
                        width = v.offsetWidth;
                        height = width / videoRatio;
                        left = v.offsetLeft;
                        top = v.offsetTop + (v.offsetHeight - height) / 2;
                    }

                    return { width, height, top, left };
                }

                const rect = getVisibleVideoRect(video);

                wrapper.style.top = rect.top + 'px';
                wrapper.style.left = rect.left + 'px';
                wrapper.style.width = rect.width + 'px';
                wrapper.style.height = rect.height + 'px';
            }


            // Check for resolution change
            if (video.videoWidth !== lastVideoW || video.videoHeight !== lastVideoH) {
                console.log('[Anime4K] Video resolution changed:', video.videoWidth, 'x', video.videoHeight);
                lastVideoW = video.videoWidth;
                lastVideoH = video.videoHeight;

                const [newW, newH] = getTargetResolution(video.videoWidth, video.videoHeight);
                canvas.width = newW;
                canvas.height = newH;

                if (texSizeLoc) {
                    gl.uniform2f(texSizeLoc, video.videoWidth, video.videoHeight);
                }

                label.innerHTML = `✨ ${modelNames[config.model] || config.model}<br><span style="opacity:0.7">${newW}×${newH}</span>`;
                if (leftLabel) leftLabel.innerHTML = `✨ Enhanced<br><span style="opacity:0.7">${newW}×${newH}</span>`;
                if (rightLabel) rightLabel.innerHTML = `📺 Original<br><span style="opacity:0.7">${video.videoWidth}×${video.videoHeight}</span>`;
            }

            // Render if video has data
            if (video.readyState >= video.HAVE_CURRENT_DATA) {
                try {
                    const renderStart = performance.now();

                    // Ensure program is active
                    gl.useProgram(program);

                    // Setup attributes (rebind buffers)
                    setupAttributes();

                    // Set uniforms every frame
                    gl.uniform1i(textureLoc, 0);
                    if (texSizeLoc) {
                        gl.uniform2f(texSizeLoc, video.videoWidth, video.videoHeight);
                    }
                    if (sharpenLoc) {
                        gl.uniform1f(sharpenLoc, config.sharpen);
                    }
                    if (vibranceLoc) {
                        gl.uniform1f(vibranceLoc, config.vibrance);
                    }
                    if (debandLoc) {
                        gl.uniform1f(debandLoc, config.deband ? 1.0 : 0.0);
                    }

                    // Upload video frame to texture
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

                    // Clear and draw
                    gl.clearColor(0.0, 0.0, 0.0, 1.0);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                    gl.viewport(0, 0, canvas.width, canvas.height);
                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

                    const renderEnd = performance.now();
                    const renderTime = renderEnd - renderStart;

                    // FPS counter
                    frameCount++;
                    const now = performance.now();
                    if (now - lastFpsTime >= 1000) {
                        const currentFps = frameCount; // Store for valid check
                        if (fpsLabel) {
                            let parts = [];
                            if (config.showFps) parts.push('FPS: ' + currentFps);
                            if (config.showRenderTime) parts.push(`${renderTime.toFixed(2)}ms`);
                            fpsLabel.textContent = parts.join(' | ');
                        }

                        // Performance Warning Logic
                        if (running && currentFps < 15 && currentFps > 0) {
                            lowPerfFrameCount++;
                            if (lowPerfFrameCount >= 5 && !perfWarningShown) {
                                showToast('⚠ Low Performance detected. Try a lower resolution.');
                                perfWarningShown = true;
                            }
                        } else {
                            lowPerfFrameCount = 0;
                        }

                        frameCount = 0;
                        lastFpsTime = now;
                    }
                } catch (e) {
                    // Start by checking specific error types
                    if (e && e.name === 'SecurityError') {
                        console.warn('[Anime4K] Stopped rendering due to CORS restriction (SecurityError).');
                        showToast('Sorry This Media/Server Is Not Supported', true);
                        running = false;
                        // Perform thorough cleanup for this video if registered
                        try {
                            const data = processedVideos.get(video);
                            if (data && typeof data.cleanup === 'function') data.cleanup();
                        } catch (err) {
                            try { wrapper.remove(); } catch (ignored) {}
                        }
                    } else {
                        // Only log actual unexpected errors
                        console.error('[Anime4K] Render error:', e);
                    }
                }
            }

            if (running) requestAnimationFrame(render);
        }

        requestAnimationFrame(render);

        // Store reference and provide thorough cleanup that deletes GL resources
        processedVideos.set(video, {
            wrapper,
            canvas,
            gl,
            running: true,
            _program: program,
            _vs: _vs,
            _fs: _fs,
            _posBuffer: posBuffer,
            _texBuffer: texBuffer,
            _texture: texture,
            cleanup: () => {
                running = false;
                try { wrapper.remove(); } catch (e) {}
                try {
                    if (posBuffer) gl.deleteBuffer(posBuffer);
                } catch (e) {}
                try {
                    if (texBuffer) gl.deleteBuffer(texBuffer);
                } catch (e) {}
                try {
                    if (texture) gl.deleteTexture(texture);
                } catch (e) {}
                try {
                    if (program) gl.deleteProgram(program);
                } catch (e) {}
                try {
                    if (_vs) gl.deleteShader(_vs);
                } catch (e) {}
                try {
                    if (_fs) gl.deleteShader(_fs);
                } catch (e) {}
                // Explicitly lose the WebGL context to free GPU memory
                try {
                    const ext = gl.getExtension('WEBGL_lose_context');
                    if (ext) {
                        ext.loseContext();
                        console.log('[Anime4K] Released WebGL context (total active:', processedVideos.size - 1, ')');
                    }
                } catch (e) {}
                try { processedVideos.delete(video); } catch (e) {}
            }
        });

        console.log('[Anime4K] ✓ Video processed successfully');
    }

    // ==================== CONFIG SYNC ====================
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'sync') return;
        let limitReload = false;

        console.log('[Anime4K] Storage changed:', changes);

        // Prefer structured object updates when possible
        if (changes.anime4k_config && changes.anime4k_config.newValue) {
            const newCfg = changes.anime4k_config.newValue;
            console.log('[Anime4K] New config from storage:', newCfg);
            if (newCfg.model !== undefined || newCfg.resolution !== undefined || newCfg.customScale !== undefined) {
                limitReload = true;
                console.log('[Anime4K] Detected heavy change, will reload upscalers');
            }
            config = { ...config, ...newCfg };
        } else {
            // Fallback: support flat key updates
            for (const [key, { newValue }] of Object.entries(changes)) {
                config[key] = newValue;
                if (key === 'model' || key === 'resolution' || key === 'customScale') {
                    limitReload = true;
                    console.log('[Anime4K] Detected heavy change on key:', key);
                }
            }
        }

        // For heavy changes, restart the upscaler on all videos
        if (limitReload) {
            console.log('[Anime4K] Config changed, restarting upscalers... Current config:', config);
            const videos = findVideosInRoot(document);
            videos.forEach(video => {
                if (processedVideos.has(video)) {
                    const data = processedVideos.get(video);
                    if (data && typeof data.cleanup === 'function') data.cleanup();
                    try { processedVideos.delete(video); } catch (e) {}
                }
            });
            // Short delay to allow cleanup to finish frame
            setTimeout(scanVideos, 50);
        }
    });

    // ==================== INIT ====================

    // Recursive function to find videos including inside Shadow DOM
    function findVideosInRoot(root, videos = []) {
        if (!root) return videos;
        // Add videos from current root
        root.querySelectorAll('video').forEach(v => videos.push(v));

        // Check all elements for shadow roots
        root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) {
                findVideosInRoot(el.shadowRoot, videos);
            }
        });
        return videos;
    }

    function scanVideos() {
        const videos = findVideosInRoot(document);

        videos.forEach(video => {
            // ==================== CORS PATCH ====================
            // Force anonymous mode for declarativeNetRequest rule
            if (!video.hasAttribute('data-a4k-patched')) {
                video.setAttribute('data-a4k-patched', 'true');

                if (!video.crossOrigin) {
                    video.crossOrigin = 'anonymous';
                    // Re-assign src to force new request with proper headers if playback hasn't started deeply
                    if (video.src && !video.src.startsWith('blob:') && !video.src.startsWith('data:')) {
                        const t = video.currentTime;
                        const p = !video.paused;
                        video.src = video.src;
                        video.currentTime = t;
                        if (p) video.play().catch(() => { });
                    }
                }
            }
            // ====================================================

            if (!processedVideos.has(video) && video.videoWidth > 0) {
                processVideo(video);
            }
        });
    }

    // Wait for shaders and start
    setTimeout(() => {
        console.log('[Anime4K] Available shaders:', Object.keys(window.Anime4KShaders || {}));
        scanVideos();
        setInterval(scanVideos, 2000);
    }, 500);

    // Cleanup on video removal - scan removed subtrees for VIDEO elements
    new MutationObserver((mutations) => {
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
                    // ignore errors during mutation handling
                }
            });
        });
    }).observe(document.body, { childList: true, subtree: true });

    // ==================== UX HELPERS ====================
    function showToast(message, isError = false) {
        const id = 'a4k-toast';
        let toast = document.getElementById(id);
        if (!toast) {
            toast = document.createElement('div');
            toast.id = id;
            toast.style.cssText = 'position:fixed;top:20px;right:20px;z-index:2147483647;padding:12px 20px;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);border:1px solid #333;border-radius:12px;color:#fff;font-family:system-ui;font-size:14px;font-weight:500;transition:opacity 0.3s, transform 0.3s;pointer-events:none;opacity:0;transform:translateY(-10px);box-shadow:0 8px 32px rgba(0,0,0,0.3);';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.borderColor = isError ? '#f87171' : '#4ade80';
        toast.style.color = isError ? '#f87171' : '#fff';

        // Reset animation
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-10px)';
        }, 3000);
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Alt+U: Toggle Upscaler
        if (e.altKey && e.key.toLowerCase() === 'u') {
            config.enabled = !config.enabled;
            saveConfig();
            showToast(config.enabled ? '✨ Anime4K ENABLED' : '○ Anime4K DISABLED');
        }
    });

})();