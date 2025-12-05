// Model/cas.js - AMD CAS Shader (Contrast Adaptive Sharpening)
// Based on AMD FidelityFX CAS

window.Anime4KShaders = window.Anime4KShaders || {};

window.Anime4KShaders.cas = function (precision) {
    return `precision ${precision} float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_texSize;
uniform float u_sharpen;

float getLuma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
    vec2 px = 1.0 / u_texSize;
    
    // 5-tap cross pattern
    vec3 c = texture2D(u_texture, v_texCoord).rgb;
    vec3 n = texture2D(u_texture, v_texCoord + vec2(0.0, -px.y)).rgb;
    vec3 s = texture2D(u_texture, v_texCoord + vec2(0.0, px.y)).rgb;
    vec3 e = texture2D(u_texture, v_texCoord + vec2(px.x, 0.0)).rgb;
    vec3 w = texture2D(u_texture, v_texCoord + vec2(-px.x, 0.0)).rgb;
    
    // Local min/max
    vec3 minC = min(min(min(n, s), min(e, w)), c);
    vec3 maxC = max(max(max(n, s), max(e, w)), c);
    
    // High-pass (edge)
    vec3 blur = (n + s + e + w) * 0.25;
    vec3 highPass = c - blur;
    
    // Contrast adaptive strength
    vec3 contrast = maxC - minC;
    float avgContrast = (contrast.r + contrast.g + contrast.b) / 3.0;
    float sharpAmount = 0.5 * (1.0 - avgContrast * 0.5) * (1.0 + u_sharpen);
    
    // Apply sharpening
    vec3 result = c + highPass * sharpAmount;
    
    // Clamp to neighborhood
    result = clamp(result, minC, maxC);
    
    gl_FragColor = vec4(result, 1.0);
}`;
};
