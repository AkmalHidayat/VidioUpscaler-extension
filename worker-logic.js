(function(exports) {
    'use strict';

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

    exports.injectPostProcessing = injectPostProcessing;

})(typeof exports === 'undefined' ? this.a4k = {} : exports);
