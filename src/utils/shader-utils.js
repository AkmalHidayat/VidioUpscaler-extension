/**
 * @fileoverview Shader utility functions for NextClarity
 * Contains functions for shader source manipulation and post-processing injection.
 * @version 2.8.1
 */

'use strict';

/**
 * Shader Utilities namespace
 * @namespace
 */
const ShaderUtils = {
    /**
     * Gets the appropriate fragment shader based on model selection
     * @param {string} model - Model name
     * @param {Object} [config={}] - Configuration object
     * @returns {string} Fragment shader source
     */
    getFragmentShader(model, config = {}) {
        const shaders = window.Anime4KShaders || {};
        const configModule = window.Anime4KConfig || {};

        console.log('[Anime4K] Available shaders:', Object.keys(shaders));
        console.log('[Anime4K] Looking for model:', model);

        let shaderSource = '';

        if (shaders[model]) {
            console.log('[Anime4K] ✓ Using external shader:', model);
            shaderSource = shaders[model]('highp');
        } else {
            console.log('[Anime4K] ⚠ Using built-in fallback shader (external not found)');
            shaderSource = configModule.BASIC_FRAGMENT_SHADER || this.getBasicShader();
        }

        // Inject post-processing
        shaderSource = this.injectPostProcessing(shaderSource);

        console.log('[Anime4K] Shader Post-Processing Injected.');
        return shaderSource;
    },

    /**
     * Gets basic fallback fragment shader
     * @returns {string} Basic fragment shader source
     */
    getBasicShader() {
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
    },

    /**
     * Injects post-processing uniforms and functions into shader
     * @param {string} shaderSource - Original shader source
     * @returns {string} Modified shader with post-processing
     */
    injectPostProcessing(shaderSource) {
        const postProcess = window.Anime4KConfig?.POST_PROCESSING_SHADER || {
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
        };

        // Inject uniforms before main
        shaderSource = shaderSource.replace('void main() {', `
            ${postProcess.uniforms}

            void main() {
        `);

        // Replace gl_FragColor assignment with post-processing
        shaderSource = shaderSource.replace(
            /gl_FragColor\s*=\s*(.*?);/s,
            postProcess.mainReplacement
        );

        return shaderSource;
    },

    /**
     * Gets vertex shader source
     * @returns {string} Vertex shader source
     */
    getVertexShader() {
        return window.Anime4KConfig?.VERTEX_SHADER_SOURCE || `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;
    }
};

// Make available on window
if (typeof window !== 'undefined') {
    window.ShaderUtils = ShaderUtils;
}

// For worker context
if (typeof self !== 'undefined' && typeof window === 'undefined') {
    self.ShaderUtils = ShaderUtils;
}
