/**
 * @fileoverview Main entry point for Anime4K worker script
 * Handles OffscreenCanvas rendering in a separate thread.
 * @version 2.8.1
 */

'use strict';

console.log('[Anime4K-Worker] Initializing rendering worker...');

// ==================== WORKER STATE ====================

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
    shaders: {},
    extensions: null
};

// ==================== MESSAGE HANDLER ====================

self.onmessage = (event) => {
    const { type, data, port } = event.data;

    switch (type) {
        case 'init':
            console.log('[Anime4K-Worker] Received OffscreenCanvas');
            initializeWorker(data, port);
            break;
        case 'frame':
            renderFrame(data);
            break;
        case 'config':
            workerState.config = { ...workerState.config, ...data };
            console.log('[Anime4K-Worker] Config updated:', workerState.config);
            break;
        case 'cleanup':
            cleanup();
            break;
        default:
            console.warn('[Anime4K-Worker] Unknown message type:', type);
    }
};

// ==================== INITIALIZATION ====================

/**
 * Initializes the worker with OffscreenCanvas
 * @param {Object} data - Initialization data
 * @param {MessagePort} port - Communication port
 */
function initializeWorker(data, port) {
    const WebGLUtils = self.WebGLUtils;
    const ShaderUtils = self.ShaderUtils;
    const Config = self.Anime4KConfig || {};
    const WEBGL_OPTIONS = Config.WEBGL_CONSTANTS?.CONTEXT_OPTIONS || {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false
    };

    const { offscreenCanvas, videoWidth, videoHeight, canvasWidth, canvasHeight, config, shaders } = data;

    workerState.canvas = offscreenCanvas;
    workerState.videoWidth = videoWidth;
    workerState.videoHeight = videoHeight;
    workerState.canvasWidth = canvasWidth;
    workerState.canvasHeight = canvasHeight;
    workerState.config = config;
    workerState.shaders = shaders;

    // Get WebGL context (prefer WebGL2)
    let isWebGL2 = false;
    workerState.gl = offscreenCanvas.getContext('webgl2', WEBGL_OPTIONS);

    if (workerState.gl) {
        isWebGL2 = true;
    } else {
        workerState.gl = offscreenCanvas.getContext('webgl', WEBGL_OPTIONS);
    }

    if (!workerState.gl) {
        console.error('[Anime4K-Worker] Failed to get WebGL context');
        port?.postMessage({ type: 'error', error: 'WebGL not available' });
        return;
    }

    console.log('[Anime4K-Worker] Using', isWebGL2 ? 'WebGL2' : 'WebGL1');

    const gl = workerState.gl;

    // Get shader sources
    const vertexShader = ShaderUtils?.getVertexShader() || getVertexShader();
    let fragmentShader = config.externalShader || ShaderUtils?.getBasicShader() || getBasicFragmentShader();

    // Inject post-processing
    fragmentShader = ShaderUtils?.injectPostProcessing(fragmentShader) ||
        injectPostProcessing(fragmentShader, config);

    // Create program
    const programObj = WebGLUtils?.createProgram(gl, vertexShader, fragmentShader) ||
        createProgram(gl, vertexShader, fragmentShader);

    if (!programObj) {
        console.error('[Anime4K-Worker] Program creation failed');
        port?.postMessage({ type: 'error', error: 'Shader compilation failed' });
        return;
    }

    workerState.program = programObj;

    // Setup buffers
    workerState.posBuffer = WebGLUtils?.createPositionBuffer(gl) || createPositionBuffer(gl);
    workerState.texBuffer = WebGLUtils?.createTexCoordBuffer(gl) || createTexCoordBuffer(gl);

    // Create texture
    workerState.texture = WebGLUtils?.createVideoTexture(gl) || createVideoTexture(gl);

    // WebGL2 optimizations
    if (isWebGL2 && WebGLUtils?.setupWebGL2Extensions) {
        workerState.extensions = WebGLUtils.setupWebGL2Extensions(gl);
    }

    workerState.running = true;

    console.log('[Anime4K-Worker] Initialization complete, ready to render');
    port?.postMessage({ type: 'ready' });
}

// ==================== FALLBACK FUNCTIONS ====================
// These are used if the utility modules are not available in worker context

function getVertexShader() {
    return `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `;
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
        try { gl.deleteShader(vs); gl.deleteShader(fs); } catch (e) { }
        return null;
    }

    return { program, vs, fs };
}

function createPositionBuffer(gl) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1.0, -1.0,
        1.0, -1.0,
        -1.0, 1.0,
        1.0, 1.0
    ]), gl.STATIC_DRAW);
    return buffer;
}

function createTexCoordBuffer(gl) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0, 1.0,
        1.0, 1.0,
        0.0, 0.0,
        1.0, 0.0
    ]), gl.STATIC_DRAW);
    return buffer;
}

function createVideoTexture(gl) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

// ==================== RENDERING ====================

/**
 * Renders a single frame
 * @param {Object} data - Frame data including imageData
 */
function renderFrame(data) {
    if (!workerState.running || !workerState.gl || !workerState.program) {
        return;
    }

    try {
        const { imageData } = data;
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

        // Upload frame data
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

// ==================== CLEANUP ====================

/**
 * Cleans up worker resources
 */
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
