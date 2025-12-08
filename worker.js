// worker.js - OffscreenCanvas Rendering Worker
// Offloads GPU rendering to a separate thread, improving main thread performance
// Communicates with content.js via MessagePort

console.log('[Anime4K-Worker] Initializing rendering worker...');

const workerState = {
    gl: null,
    canvas: null,
    program: null,
    texture: null,
    posBuffer: null,
    texBuffer: null,
    running: false,
    config: {},
    videoWidth: 0,
    videoHeight: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    shaders: {}
};

// Receive port from content.js
self.onmessage = (event) => {
    const { type, data, port } = event.data;

    if (type === 'init') {
        console.log('[Anime4K-Worker] Received OffscreenCanvas');
        initializeWorker(data, port);
    } else if (type === 'frame') {
        renderFrame(data);
    } else if (type === 'config') {
        workerState.config = { ...workerState.config, ...data };
        console.log('[Anime4K-Worker] Config updated:', workerState.config);
    } else if (type === 'cleanup') {
        cleanup();
    }
};

function initializeWorker(data, port) {
    const { offscreenCanvas, videoWidth, videoHeight, canvasWidth, canvasHeight, config, shaders } = data;

    workerState.canvas = offscreenCanvas;
    workerState.videoWidth = videoWidth;
    workerState.videoHeight = videoHeight;
    workerState.canvasWidth = canvasWidth;
    workerState.canvasHeight = canvasHeight;
    workerState.config = config;
    workerState.shaders = shaders;

    // Try to get WebGL2 context first, fallback to WebGL1
    workerState.gl = offscreenCanvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false
    });

    let isWebGL2 = !!workerState.gl;
    if (!workerState.gl) {
        workerState.gl = offscreenCanvas.getContext('webgl', {
            alpha: false,
            antialias: false,
            depth: false,
            stencil: false,
            preserveDrawingBuffer: false
        });
    }

    if (!workerState.gl) {
        console.error('[Anime4K-Worker] Failed to get WebGL context');
        port.postMessage({ type: 'error', error: 'WebGL not available' });
        return;
    }

    console.log('[Anime4K-Worker] Using', isWebGL2 ? 'WebGL2' : 'WebGL1');

    const gl = workerState.gl;

    // Setup shader program
    const vertexShader = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `;

    let fragmentShader = config.externalShader || getBasicFragmentShader();

    // Inject post-processing (vibrance, deband)
    fragmentShader = injectPostProcessing(fragmentShader, config);

    // Compile program
    const program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
        console.error('[Anime4K-Worker] Program creation failed');
        port.postMessage({ type: 'error', error: 'Shader compilation failed' });
        return;
    }

    workerState.program = program;

    // Setup buffers
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1.0, -1.0,
        1.0, -1.0,
        -1.0, 1.0,
        1.0, 1.0
    ]), gl.STATIC_DRAW);
    workerState.posBuffer = posBuffer;

    const texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0, 1.0,
        1.0, 1.0,
        0.0, 0.0,
        1.0, 0.0
    ]), gl.STATIC_DRAW);
    workerState.texBuffer = texBuffer;

    // Create texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    workerState.texture = texture;

    // WebGL2-specific optimizations
    if (isWebGL2) {
        setupWebGL2Optimizations(gl);
    }

    workerState.running = true;

    console.log('[Anime4K-Worker] Initialization complete, ready to render');
    port.postMessage({ type: 'ready' });
}

function getBasicFragmentShader() {
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
            
            vec3 blur = (n + s + e + w) * 0.25;
            vec3 sharp = c + (c - blur) * 0.8;
            
            gl_FragColor = vec4(clamp(sharp, 0.0, 1.0), 1.0);
        }
    `;
}

function injectPostProcessing(fragmentShader, config) {
    // Add post-processing uniforms and functions
    let enhanced = fragmentShader.replace('void main() {', `
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
        
        void main() {
    `);

    // Inject vibrance boost at end of main before gl_FragColor assignment
    enhanced = enhanced.replace('gl_FragColor = ', `
        vec3 rgb = gl_FragColor.rgb;
        if (u_vibrance > 0.0) {
            vec3 hsv = rgb2hsv(rgb);
            hsv.y *= mix(1.0, 1.5, u_vibrance);
            rgb = hsv2rgb(hsv);
        }
        
        gl_FragColor = `);

    return enhanced;
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('[Anime4K-Worker] Shader compile error:', gl.getShaderInfoLog(shader));
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
        console.error('[Anime4K-Worker] Program link error:', gl.getProgramInfoLog(program));
        try { gl.deleteShader(vs); gl.deleteShader(fs); } catch (e) {}
        return null;
    }

    return { program, vs, fs };
}

function setupWebGL2Optimizations(gl) {
    console.log('[Anime4K-Worker] Setting up WebGL2 optimizations...');

    // Check for important WebGL2 extensions
    const extensions = {
        anisotropic: gl.getExtension('EXT_texture_filter_anisotropic'),
        textureFloat: gl.getExtension('OES_texture_float'),
        textureHalf: gl.getExtension('OES_texture_half_float'),
        colorBufferFloat: gl.getExtension('EXT_color_buffer_float'),
        colorBufferHalf: gl.getExtension('EXT_color_buffer_half_float'),
        instanced: gl.getExtension('ANGLE_instanced_arrays'),
        debug: gl.getExtension('WEBGL_debug_renderer_info')
    };

    if (extensions.anisotropic) {
        const maxAniso = gl.getParameter(extensions.anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        gl.texParameterf(gl.TEXTURE_2D, extensions.anisotropic.TEXTURE_MAX_ANISOTROPY_EXT, maxAniso);
        console.log('[Anime4K-Worker] Anisotropic filtering enabled (max:', maxAniso, ')');
    }

    if (extensions.debug) {
        const renderer = gl.getParameter(extensions.debug.UNMASKED_RENDERER_WEBGL);
        const vendor = gl.getParameter(extensions.debug.UNMASKED_VENDOR_WEBGL);
        console.log('[Anime4K-Worker] GPU:', vendor, renderer);
    }

    workerState.extensions = extensions;
}

function renderFrame(data) {
    if (!workerState.running || !workerState.gl || !workerState.program) {
        return;
    }

    try {
        const { imageData, timestamp } = data;
        const gl = workerState.gl;
        const program = workerState.program.program;

        gl.useProgram(program);

        // Setup attributes
        const posLoc = gl.getAttribLocation(program, 'a_position');
        const texLoc = gl.getAttribLocation(program, 'a_texCoord');

        gl.bindBuffer(gl.ARRAY_BUFFER, workerState.posBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, workerState.texBuffer);
        gl.enableVertexAttribArray(texLoc);
        gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

        // Setup uniforms
        const textureLoc = gl.getUniformLocation(program, 'u_texture');
        const texSizeLoc = gl.getUniformLocation(program, 'u_texSize');
        const vibranceLoc = gl.getUniformLocation(program, 'u_vibrance');

        gl.uniform1i(textureLoc, 0);
        if (texSizeLoc) {
            gl.uniform2f(texSizeLoc, workerState.videoWidth, workerState.videoHeight);
        }
        if (vibranceLoc) {
            gl.uniform1f(vibranceLoc, workerState.config.vibrance || 0.1);
        }

        // Upload frame data to texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, workerState.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageData);

        // Render
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.viewport(0, 0, workerState.canvasWidth, workerState.canvasHeight);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    } catch (e) {
        console.error('[Anime4K-Worker] Render error:', e);
    }
}

function cleanup() {
    if (!workerState.gl) return;

    const gl = workerState.gl;
    workerState.running = false;

    try {
        if (workerState.posBuffer) gl.deleteBuffer(workerState.posBuffer);
        if (workerState.texBuffer) gl.deleteBuffer(workerState.texBuffer);
        if (workerState.texture) gl.deleteTexture(workerState.texture);
        if (workerState.program) {
            gl.deleteProgram(workerState.program.program);
            if (workerState.program.vs) gl.deleteShader(workerState.program.vs);
            if (workerState.program.fs) gl.deleteShader(workerState.program.fs);
        }

        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
    } catch (e) {
        console.error('[Anime4K-Worker] Cleanup error:', e);
    }

    console.log('[Anime4K-Worker] Cleaned up resources');
}
