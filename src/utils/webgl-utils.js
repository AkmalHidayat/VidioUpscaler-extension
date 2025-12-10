/**
 * @fileoverview WebGL utility functions for NextClarity
 * Contains all WebGL-related helper functions for shader compilation,
 * program creation, and context management.
 * @version 2.8.1
 */

'use strict';

/**
 * WebGL Utilities namespace
 * @namespace
 */
const WebGLUtils = {
    /**
     * Creates and compiles a WebGL shader
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {number} type - Shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
     * @param {string} source - GLSL source code
     * @returns {WebGLShader|null} Compiled shader or null on failure
     */
    createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('[Anime4K] Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    },

    /**
     * Creates a WebGL program from vertex and fragment shader sources
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {string} vsSource - Vertex shader source
     * @param {string} fsSource - Fragment shader source
     * @returns {Object|null} Object containing program and shader handles, or null on failure
     */
    createProgram(gl, vsSource, fsSource) {
        const vs = this.createShader(gl, gl.VERTEX_SHADER, vsSource);
        const fs = this.createShader(gl, gl.FRAGMENT_SHADER, fsSource);

        if (!vs || !fs) return null;

        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('[Anime4K] Program link error:', gl.getProgramInfoLog(program));
            try {
                gl.deleteShader(vs);
                gl.deleteShader(fs);
            } catch (e) {
                // Ignore cleanup errors
            }
            return null;
        }

        return { program, vs, fs };
    },

    /**
     * Gets WebGL context with preferred options
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @param {boolean} preferWebGL2 - Whether to prefer WebGL2
     * @returns {Object} Object containing gl context and isWebGL2 flag
     */
    getContext(canvas, preferWebGL2 = true) {
        const options = window.Anime4KConfig?.WEBGL_CONSTANTS?.CONTEXT_OPTIONS || {
            alpha: false,
            antialias: false,
            depth: false,
            stencil: false,
            preserveDrawingBuffer: false
        };

        let gl = null;
        let isWebGL2 = false;

        if (preferWebGL2) {
            gl = canvas.getContext('webgl2', options);
            if (gl) {
                isWebGL2 = true;
                console.log('[Anime4K] Using WebGL2 context');
            }
        }

        if (!gl) {
            gl = canvas.getContext('webgl', options);
            console.log('[Anime4K] Using WebGL1 context');
        }

        return { gl, isWebGL2 };
    },

    /**
     * Sets up WebGL2 extensions
     * @param {WebGL2RenderingContext} gl - WebGL2 context
     * @returns {Object|null} Object containing extension references
     */
    setupWebGL2Extensions(gl) {
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

            // Log anisotropic filtering capability
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
    },

    /**
     * Applies anisotropic filtering to currently bound texture
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {Object} extensions - Extensions object from setupWebGL2Extensions
     * @param {number} maxLevel - Maximum anisotropy level (default 16)
     */
    applyAnisotropicFiltering(gl, extensions, maxLevel = 16) {
        if (!extensions?.anisotropic) return;

        try {
            const maxAniso = gl.getParameter(extensions.anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            gl.texParameterf(
                gl.TEXTURE_2D,
                extensions.anisotropic.TEXTURE_MAX_ANISOTROPY_EXT,
                Math.min(maxAniso, maxLevel)
            );
            console.log('[Anime4K] Applied anisotropic filtering (max:', Math.min(maxAniso, maxLevel), ')');
        } catch (e) {
            console.warn('[Anime4K] Could not apply anisotropic filtering:', e);
        }
    },

    /**
     * Creates and configures position buffer
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {WebGLBuffer} Position buffer
     */
    createPositionBuffer(gl) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1
        ]), gl.STATIC_DRAW);
        return buffer;
    },

    /**
     * Creates and configures texture coordinate buffer
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {WebGLBuffer} Texture coordinate buffer
     */
    createTexCoordBuffer(gl) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            0, 1,
            1, 1,
            0, 0,
            1, 0
        ]), gl.STATIC_DRAW);
        return buffer;
    },

    /**
     * Creates and configures a texture for video frames
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {WebGLTexture} Configured texture
     */
    createVideoTexture(gl) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        return texture;
    },

    /**
     * Sets up vertex attributes for rendering
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {WebGLProgram} program - Shader program
     * @param {WebGLBuffer} posBuffer - Position buffer
     * @param {WebGLBuffer} texBuffer - Texture coordinate buffer
     */
    setupAttributes(gl, program, posBuffer, texBuffer) {
        const posLoc = gl.getAttribLocation(program, 'a_position');
        const texLoc = gl.getAttribLocation(program, 'a_texCoord');

        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
        gl.enableVertexAttribArray(texLoc);
        gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
    },

    /**
     * Clamps canvas dimensions to GPU texture limits
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {HTMLCanvasElement} canvas - Canvas element
     * @returns {boolean} True if canvas was resized
     */
    clampToTextureLimit(gl, canvas) {
        try {
            const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
            if (maxTex > 0 && (canvas.width > maxTex || canvas.height > maxTex)) {
                const scale = Math.min(maxTex / canvas.width, maxTex / canvas.height);
                canvas.width = Math.max(1, Math.floor(canvas.width * scale));
                canvas.height = Math.max(1, Math.floor(canvas.height * scale));
                console.warn('[Anime4K] Clamped to MAX_TEXTURE_SIZE:', maxTex, '->', canvas.width, 'x', canvas.height);
                return true;
            }
        } catch (e) {
            // Some environments restrict getParameter
        }
        return false;
    },

    /**
     * Cleans up WebGL resources
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {Object} resources - Object containing resources to clean up
     */
    cleanup(gl, resources) {
        if (!gl) return;

        try {
            if (resources.posBuffer) gl.deleteBuffer(resources.posBuffer);
        } catch (e) { }

        try {
            if (resources.texBuffer) gl.deleteBuffer(resources.texBuffer);
        } catch (e) { }

        try {
            if (resources.texture) gl.deleteTexture(resources.texture);
        } catch (e) { }

        try {
            if (resources.program) gl.deleteProgram(resources.program);
        } catch (e) { }

        try {
            if (resources.vs) gl.deleteShader(resources.vs);
        } catch (e) { }

        try {
            if (resources.fs) gl.deleteShader(resources.fs);
        } catch (e) { }

        // Lose context to free GPU memory
        try {
            const ext = gl.getExtension('WEBGL_lose_context');
            if (ext) ext.loseContext();
        } catch (e) { }
    }
};

// Make available on window
if (typeof window !== 'undefined') {
    window.WebGLUtils = WebGLUtils;
}

// For worker context
if (typeof self !== 'undefined' && typeof window === 'undefined') {
    self.WebGLUtils = WebGLUtils;
}
