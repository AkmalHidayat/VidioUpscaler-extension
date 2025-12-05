// Model/realsr.js - Real-ESRGAN Style Shader
// Texture/detail enhancement with edge-aware processing

window.Anime4KShaders = window.Anime4KShaders || {};

window.Anime4KShaders.realsr = function (precision) {
    return `precision ${precision} float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_texSize;
uniform float u_sharpen;

float getLuma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
    vec2 px = 1.0 / u_texSize;
    
    // Sample neighborhood
    vec3 c  = texture2D(u_texture, v_texCoord).rgb;
    vec3 n  = texture2D(u_texture, v_texCoord + vec2(0.0, -px.y)).rgb;
    vec3 s  = texture2D(u_texture, v_texCoord + vec2(0.0, px.y)).rgb;
    vec3 e  = texture2D(u_texture, v_texCoord + vec2(px.x, 0.0)).rgb;
    vec3 w  = texture2D(u_texture, v_texCoord + vec2(-px.x, 0.0)).rgb;
    vec3 ne = texture2D(u_texture, v_texCoord + vec2(px.x, -px.y)).rgb;
    vec3 nw = texture2D(u_texture, v_texCoord + vec2(-px.x, -px.y)).rgb;
    vec3 se = texture2D(u_texture, v_texCoord + vec2(px.x, px.y)).rgb;
    vec3 sw = texture2D(u_texture, v_texCoord + vec2(-px.x, px.y)).rgb;
    
    // Luma for edge detection
    float lc = getLuma(c);
    float ln = getLuma(n), ls = getLuma(s), le = getLuma(e), lw = getLuma(w);
    
    // Edge detection
    float edge = abs(ln - ls) + abs(le - lw);
    
    // Average and detail
    vec3 avg = (n + s + e + w + ne + nw + se + sw) / 8.0;
    vec3 detail = c - avg;
    
    // Enhance detail on edges with adjustable strength
    float detailStrength = clamp(1.5 - edge * 2.0, 0.5, 1.5) * (1.0 + u_sharpen);
    vec3 result = c;
    if (edge > 0.1) {
        result = c + detail * detailStrength;
    } else {
        result = mix(c, avg, clamp(0.3 - edge, 0.0, 0.2));
    }
    
    gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
}`;
};
