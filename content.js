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
        compare: false,
        sliderPos: 50,
        showFps: true,
        showLabels: true,
        showRenderTime: false
    };

    // Load config from storage
    try {
        chrome.storage.sync.get('anime4k_config', (data) => {
            if (data.anime4k_config) {
                config = { ...config, ...data.anime4k_config };
                console.log('[Anime4K] Config loaded:', config);
            }
        });
    } catch (e) { }

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

        if (window.Anime4KShaders && window.Anime4KShaders[config.model]) {
            console.log('[Anime4K] ✓ Using external shader:', config.model);
            const shader = window.Anime4KShaders[config.model]('highp');
            console.log('[Anime4K] Shader length:', shader.length);
            return shader;
        }

        // Built-in fallback with STRONG sharpening
        console.log('[Anime4K] ⚠ Using built-in fallback shader (external not found)');
        return `
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
                
                // Strong unsharp mask
                vec3 blur = (n + s + e + w) * 0.25;
                vec3 sharp = c + (c - blur) * 0.8;
                
                gl_FragColor = vec4(clamp(sharp, 0.0, 1.0), 1.0);
            }
        `;
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
    let processedVideos = new WeakMap();
    let uiReady = false;

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
            return null;
        }

        return program;
    }

    // ==================== VIDEO PROCESSING ====================
    function processVideo(video) {
        if (processedVideos.has(video)) return;
        if (video.videoWidth < 100 || video.videoHeight < 100) return;

        console.log('[Anime4K] Processing video:', video.videoWidth, 'x', video.videoHeight);

        const parent = video.parentElement;
        if (!parent) return;

        // Calculate output size
        const [outW, outH] = getTargetResolution(video.videoWidth, video.videoHeight);
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

        // Get WebGL context
        const gl = canvas.getContext('webgl', {
            alpha: false,
            antialias: false,
            depth: false,
            stencil: false,
            preserveDrawingBuffer: false
        });

        if (!gl) {
            console.error('[Anime4K] WebGL not available');
            wrapper.remove();
            return;
        }


        // Create program with fallback
        let program = createProgram(gl, VERTEX_SHADER, getFragmentShader());

        if (!program) {
            console.warn('[Anime4K] External shader failed, using basic fallback');
            program = createProgram(gl, VERTEX_SHADER, `
                precision mediump float;
                varying vec2 v_texCoord;
                uniform sampler2D u_texture;
                void main() { gl_FragColor = texture2D(u_texture, v_texCoord); }
            `);
        }

        if (!program) {
            console.error('[Anime4K] Failed to create shader program');
            wrapper.remove();
            return;
        }

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

        // Set uniforms
        const textureLoc = gl.getUniformLocation(program, 'u_texture');
        const texSizeLoc = gl.getUniformLocation(program, 'u_texSize');
        const sharpenLoc = gl.getUniformLocation(program, 'u_sharpen');

        gl.uniform1i(textureLoc, 0);
        if (texSizeLoc) {
            gl.uniform2f(texSizeLoc, video.videoWidth, video.videoHeight);
        }
        if (sharpenLoc) {
            gl.uniform1f(sharpenLoc, config.sharpen);
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
            fsr: 'FSR 1.0',
            xbrz: 'xBRZ',
            cas: 'CAS',
            bicubic: 'Bicubic',
            realsr: 'Real-ESRGAN'
        };

        if (config.showLabels) {
            const label = document.createElement('div');
            // Centered top, slightly transparent green gradient
            label.style.cssText = 'position:absolute;top:15px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,rgba(74,222,128,0.85),rgba(34,197,94,0.85));color:#000;padding:8px 12px;border-radius:8px;font:bold 12px system-ui;z-index:100;pointer-events:none;backdrop-filter:blur(4px);text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.1);';
            label.innerHTML = `✨ ${modelNames[config.model] || config.model}<br><span style="opacity:0.7">${outW}×${outH}</span>`;
            wrapper.appendChild(label);
        }

        let fpsLabel = null;
        if (config.showFps) {
            fpsLabel = document.createElement('div');
            // Centered top, below the label
            fpsLabel.style.cssText = 'position:absolute;top:65px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.6);color:#4ade80;padding:4px 10px;border-radius:6px;font:bold 11px monospace;z-index:99;pointer-events:none;backdrop-filter:blur(2px);';
            fpsLabel.textContent = 'FPS: --';
            wrapper.appendChild(fpsLabel);
        }


        // Comparison slider
        if (config.compare) {
            // Slider container
            const sliderContainer = document.createElement('div');
            sliderContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:200;pointer-events:none;';
            wrapper.appendChild(sliderContainer);

            // Slider line
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

            // Slider handle (circle)
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

            // Arrow indicators at top and bottom
            const topArrow = document.createElement('div');
            topArrow.style.cssText = 'position:absolute;top:10px;left:50%;transform:translateX(-50%);color:#fff;font-size:12px;text-shadow:0 1px 3px rgba(0,0,0,0.8);';
            topArrow.textContent = '▼';
            slider.appendChild(topArrow);

            const bottomArrow = document.createElement('div');
            bottomArrow.style.cssText = 'position:absolute;bottom:10px;left:50%;transform:translateX(-50%);color:#fff;font-size:12px;text-shadow:0 1px 3px rgba(0,0,0,0.8);';
            bottomArrow.textContent = '▲';
            slider.appendChild(bottomArrow);

            // Set initial clip path
            canvas.style.clipPath = `inset(0 ${100 - config.sliderPos}% 0 0)`;

            // Drag state
            let dragging = false;

            function updateSlider(clientX) {
                const rect = sliderContainer.getBoundingClientRect();
                const pct = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
                config.sliderPos = pct;
                slider.style.left = pct + '%';
                canvas.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
            }

            // Mouse events
            slider.addEventListener('mousedown', (e) => {
                dragging = true;
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!dragging) return;
                updateSlider(e.clientX);
            });

            document.addEventListener('mouseup', () => {
                if (dragging) {
                    dragging = false;
                    saveConfig();
                }
            });

            // Touch events
            slider.addEventListener('touchstart', (e) => {
                dragging = true;
                e.preventDefault();
            }, { passive: false });

            document.addEventListener('touchmove', (e) => {
                if (!dragging) return;
                if (e.touches.length > 0) {
                    updateSlider(e.touches[0].clientX);
                }
            }, { passive: true });

            document.addEventListener('touchend', () => {
                if (dragging) {
                    dragging = false;
                    saveConfig();
                }
            });

            // Labels
            const leftLabel = document.createElement('div');
            leftLabel.style.cssText = 'position:absolute;top:10px;left:10px;background:linear-gradient(135deg,#4ade80,#22c55e);color:#000;padding:8px 12px;border-radius:8px;font:bold 12px system-ui;z-index:100;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
            leftLabel.innerHTML = `✨ Enhanced<br><span style="opacity:0.7">${outW}×${outH}</span>`;
            sliderContainer.appendChild(leftLabel);

            const rightLabel = document.createElement('div');
            rightLabel.style.cssText = 'position:absolute;top:10px;right:10px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;padding:8px 12px;border-radius:8px;font:bold 12px system-ui;z-index:100;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
            rightLabel.innerHTML = `📺 Original<br><span style="opacity:0.7">${video.videoWidth}×${video.videoHeight}</span>`;
            sliderContainer.appendChild(rightLabel);
        }

        // Render loop
        let frameCount = 0;
        let lastFpsTime = performance.now();
        let running = true;
        let lastVideoW = video.videoWidth;
        let lastVideoH = video.videoHeight;

        function render() {
            if (!enabled) {
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
                wrapper.style.top = video.offsetTop + 'px';
                wrapper.style.left = video.offsetLeft + 'px';
                wrapper.style.width = video.offsetWidth + 'px';
                wrapper.style.height = video.offsetHeight + 'px';
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
                        if (fpsLabel) {
                            let text = 'FPS: ' + frameCount;
                            if (config.showRenderTime) {
                                text += ` | ${renderTime.toFixed(2)}ms`;
                            }
                            fpsLabel.textContent = text;
                        }
                        frameCount = 0;
                        lastFpsTime = now;
                    }
                } catch (e) {
                    console.error('[Anime4K] Render error:', e);
                    // If CORS error, stop rendering this video to prevent spam
                    if (e.name === 'SecurityError') {
                        console.warn('[Anime4K] Stopped rendering due to CORS restriction on this video.');
                        running = false;
                        wrapper.remove();
                    }
                }
            }

            if (running) requestAnimationFrame(render);
        }

        requestAnimationFrame(render);

        // Store reference
        processedVideos.set(video, {
            wrapper,
            canvas,
            gl,
            running: true,
            cleanup: () => {
                running = false;
                wrapper.remove();
            }
        });

        console.log('[Anime4K] ✓ Video processed successfully');
        createUI();
    }

    // ==================== UI ====================
    function createUI() {
        if (uiReady) return;
        uiReady = true;

        // Toggle button
        const btn = document.createElement('div');
        btn.id = 'anime4k-toggle';
        btn.innerHTML = '✨ Anime4K ON';
        btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;padding:12px 20px;background:#111;border:2px solid #4ade80;border-radius:12px;color:#4ade80;font:bold 14px system-ui;cursor:pointer;user-select:none;';

        btn.onclick = () => {
            enabled = !enabled;
            btn.innerHTML = enabled ? '✨ Anime4K ON' : '○ Anime4K OFF';
            btn.style.color = enabled ? '#4ade80' : '#f87171';
            btn.style.borderColor = enabled ? '#4ade80' : '#f87171';
        };
        document.body.appendChild(btn);

        // Settings button
        const settingsBtn = document.createElement('div');
        settingsBtn.innerHTML = '⚙️';
        settingsBtn.style.cssText = 'position:fixed;bottom:75px;right:20px;z-index:2147483647;width:44px;height:44px;background:#111;border:2px solid #555;border-radius:12px;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
        settingsBtn.onclick = toggleSettings;
        document.body.appendChild(settingsBtn);

        // Settings panel
        const panel = document.createElement('div');
        panel.id = 'anime4k-settings';
        panel.style.cssText = 'position:fixed;bottom:130px;right:20px;z-index:2147483647;width:280px;background:#111;border:1px solid #333;border-radius:14px;padding:16px;font-family:system-ui;color:#fff;display:none;';

        panel.innerHTML = `
            <div style="font-size:16px;font-weight:bold;color:#4ade80;margin-bottom:14px;">⚡ Anime4K v2.2.0</div>
            
            <label style="font-size:11px;color:#888;display:block;margin-bottom:4px;">MODEL</label>
            <select id="a4k-model" style="width:100%;padding:8px;margin-bottom:12px;background:#222;border:1px solid #444;border-radius:8px;color:#fff;">
                <option value="debug">🔧 Debug (Grayscale)</option>
                <option value="anime4k_v41_fast">Anime4K Fast</option>
                <option value="anime4k_v41_hq">Anime4K HQ</option>
                <option value="fsr">FSR 1.0</option>
                <option value="xbrz">xBRZ</option>
                <option value="cas">CAS</option>
                <option value="bicubic">Bicubic</option>
                <option value="realsr">Real-ESRGAN</option>
            </select>
            
            <label style="font-size:11px;color:#888;display:block;margin-bottom:4px;">RESOLUTION</label>
            <div style="display:flex;gap:8px;margin-bottom:12px;">
                <select id="a4k-res" style="flex:1;padding:8px;background:#222;border:1px solid #444;border-radius:8px;color:#fff;">
                    <option value="custom">Custom Scale</option>
                    <option value="2x">2x (Auto)</option>
                    <option value="4x">4x</option>
                    <option value="8x">8x</option>
                    <option value="1080p">1080p FHD</option>
                    <option value="2k">2K QHD</option>
                    <option value="4k">4K UHD</option>
                    <option value="8k">8K UHD</option>
                </select>
                <input type="number" id="a4k-scale" step="0.1" min="0.1" max="10" value="2.0" style="width:60px;padding:8px;background:#222;border:1px solid #444;border-radius:8px;color:#fff;display:none;">
            </div>

            <label style="font-size:11px;color:#888;display:block;margin-bottom:4px;">SHARPENING: <span id="a4k-sharp-val">0%</span></label>
            <input type="range" id="a4k-sharp" min="-1" max="1" step="0.1" style="width:100%;margin-bottom:12px;cursor:pointer;">
            
            <div style="background:#1a1a1a;border-radius:8px;padding:10px;margin-bottom:12px;">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:8px;">
                    <input type="checkbox" id="a4k-compare">
                    <span>🔀 Compare Mode</span>
                </label>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:8px;">
                    <input type="checkbox" id="a4k-fps">
                    <span>📊 Show FPS</span>
                </label>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:8px;">
                    <input type="checkbox" id="a4k-delay">
                    <span>⏱️ Show Render Delay</span>
                </label>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                    <input type="checkbox" id="a4k-labels">
                    <span>🏷️ Show info Overlays</span>
                </label>
            </div>
            
            <div style="font-size:10px;color:#666;text-align:center;margin-bottom:10px;">Alt+A: Toggle | Alt+S: Settings</div>
            
            <button id="a4k-apply" style="width:100%;padding:12px;background:#4ade80;border:none;border-radius:8px;color:#000;font-weight:bold;cursor:pointer;">
                ✓ Apply Settings
            </button>
        `;
        document.body.appendChild(panel);

        // Control References
        const resSlct = document.getElementById('a4k-res');
        const scaleInp = document.getElementById('a4k-scale');
        const sharpInp = document.getElementById('a4k-sharp');
        const sharpVal = document.getElementById('a4k-sharp-val');

        // Logic to show/hide scale input
        resSlct.onchange = () => {
            scaleInp.style.display = resSlct.value === 'custom' ? 'block' : 'none';
        };

        // Live slider update
        sharpInp.oninput = () => {
            sharpVal.textContent = Math.round(sharpInp.value * 100) + '%';
        };

        // Set initial values from config
        document.getElementById('a4k-model').value = config.model;
        resSlct.value = config.resolution;
        scaleInp.value = config.customScale || 2.0;
        scaleInp.style.display = config.resolution === 'custom' ? 'block' : 'none';
        sharpInp.value = config.sharpen || 0.0;
        sharpVal.textContent = Math.round((config.sharpen || 0.0) * 100) + '%';
        document.getElementById('a4k-compare').checked = config.compare;
        document.getElementById('a4k-fps').checked = config.showFps;
        document.getElementById('a4k-delay').checked = config.showRenderTime;
        document.getElementById('a4k-labels').checked = config.showLabels;

        document.getElementById('a4k-apply').onclick = () => {
            const oldModel = config.model;
            // Update config
            config.model = document.getElementById('a4k-model').value;
            config.resolution = resSlct.value;
            config.customScale = parseFloat(scaleInp.value);
            config.sharpen = parseFloat(sharpInp.value);
            config.compare = document.getElementById('a4k-compare').checked;
            config.showFps = document.getElementById('a4k-fps').checked;
            config.showRenderTime = document.getElementById('a4k-delay').checked;
            config.showLabels = document.getElementById('a4k-labels').checked;

            saveConfig();
            location.reload();
        };

        function toggleSettings() {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key.toLowerCase() === 'a') btn.click();
            if (e.altKey && e.key.toLowerCase() === 's') toggleSettings();
        });

        // Hide UI in fullscreen
        function onFullscreenChange() {
            const isFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
            if (isFs) {
                btn.style.display = 'none';
                settingsBtn.style.display = 'none';
                panel.style.display = 'none';
            } else {
                btn.style.display = 'block';
                settingsBtn.style.display = 'flex';
            }
        }
        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    }

    // ==================== INIT ====================
    function scanVideos() {
        const videos = [];

        // Recursive function to find videos including inside Shadow DOM
        function findVideosInRoot(root) {
            if (!root) return;
            // Add videos from current root
            root.querySelectorAll('video').forEach(v => videos.push(v));

            // Check all elements for shadow roots
            root.querySelectorAll('*').forEach(el => {
                if (el.shadowRoot) {
                    findVideosInRoot(el.shadowRoot);
                }
            });
        }

        findVideosInRoot(document);

        videos.forEach(video => {
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

    // Cleanup on video removal
    new MutationObserver((mutations) => {
        mutations.forEach(m => {
            m.removedNodes.forEach(node => {
                if (node.nodeName === 'VIDEO') {
                    const data = processedVideos.get(node);
                    if (data) data.cleanup();
                }
            });
        });
    }).observe(document.body, { childList: true, subtree: true });

})();