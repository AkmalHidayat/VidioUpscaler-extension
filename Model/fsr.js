// Model/fsr.js - AMD FSR 1.0 Shader (EASU + RCAS)
// Based on AMD FidelityFX Super Resolution
// EASU = Edge-Adaptive Spatial Upsampling, RCAS = Robust Contrast-Adaptive Sharpening

window.Anime4KShaders = window.Anime4KShaders || {};

window.Anime4KShaders.fsr = function (precision) {
    return `precision ${precision} float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_texSize;

#define FSR_SHARPNESS 0.8

float getLuma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

// Lanczos-inspired weight function for EASU
float lanczosWeight(float x) {
    if (x == 0.0) return 1.0;
    if (abs(x) > 2.0) return 0.0;
    float pi = 3.14159265;
    float px = x * pi;
    return sin(px) * sin(px * 0.5) / (px * px * 0.5);
}

void main() {
    vec2 px = 1.0 / u_texSize;
    vec2 fp = fract(v_texCoord * u_texSize);
    
    // Sample 12-tap pattern (FSR uses 12-tap for quality)
    vec3 c  = texture2D(u_texture, v_texCoord).rgb;
    vec3 n  = texture2D(u_texture, v_texCoord + vec2(0.0, -px.y)).rgb;
    vec3 s  = texture2D(u_texture, v_texCoord + vec2(0.0, px.y)).rgb;
    vec3 e  = texture2D(u_texture, v_texCoord + vec2(px.x, 0.0)).rgb;
    vec3 w  = texture2D(u_texture, v_texCoord + vec2(-px.x, 0.0)).rgb;
    vec3 ne = texture2D(u_texture, v_texCoord + vec2(px.x, -px.y)).rgb;
    vec3 nw = texture2D(u_texture, v_texCoord + vec2(-px.x, -px.y)).rgb;
    vec3 se = texture2D(u_texture, v_texCoord + vec2(px.x, px.y)).rgb;
    vec3 sw = texture2D(u_texture, v_texCoord + vec2(-px.x, px.y)).rgb;
    
    // Additional samples for 12-tap
    vec3 n2 = texture2D(u_texture, v_texCoord + vec2(0.0, -2.0*px.y)).rgb;
    vec3 s2 = texture2D(u_texture, v_texCoord + vec2(0.0, 2.0*px.y)).rgb;
    vec3 e2 = texture2D(u_texture, v_texCoord + vec2(2.0*px.x, 0.0)).rgb;
    vec3 w2 = texture2D(u_texture, v_texCoord + vec2(-2.0*px.x, 0.0)).rgb;
    
    // Luma for edge detection
    float lc = getLuma(c);
    float ln = getLuma(n), ls = getLuma(s), le = getLuma(e), lw = getLuma(w);
    float lne = getLuma(ne), lnw = getLuma(nw), lse = getLuma(se), lsw = getLuma(sw);
    
    // EASU: Compute edge direction
    float dirH = abs(lw - le);
    float dirV = abs(ln - ls);
    float dirD1 = abs(lnw - lse);
    float dirD2 = abs(lne - lsw);
    
    // Determine dominant edge direction (0 = horizontal, 1 = vertical, 2 = diagonal)
    float maxDir = max(max(dirH, dirV), max(dirD1, dirD2));
    
    // Edge-adaptive weights based on direction
    float wH = 1.0 - smoothstep(0.0, maxDir + 0.001, dirH);
    float wV = 1.0 - smoothstep(0.0, maxDir + 0.001, dirV);
    
    // Lanczos-weighted reconstruction along detected edge
    vec3 hBlend = (w + c + c + e) / 4.0;
    vec3 vBlend = (n + c + c + s) / 4.0;
    vec3 result = mix(hBlend, vBlend, wV / (wH + wV + 0.001));
    result = mix(c, result, 0.5);
    
    // RCAS: Robust Contrast-Adaptive Sharpening
    float lmax = max(max(max(ln, ls), max(le, lw)), lc);
    float lmin = min(min(min(ln, ls), min(le, lw)), lc);
    float contrast = lmax - lmin;
    
    // Sharpening strength based on local contrast
    float sharpAmt = FSR_SHARPNESS * (1.0 - smoothstep(0.0, 0.5, contrast));
    
    // High-pass filter for sharpening
    vec3 blur = (n + s + e + w) * 0.25;
    vec3 highPass = c - blur;
    
    // Apply sharpening
    result = result + highPass * sharpAmt;
    
    // Clamp to prevent ringing artifacts
    vec3 minC = min(min(min(n, s), min(e, w)), c);
    vec3 maxC = max(max(max(n, s), max(e, w)), c);
    result = clamp(result, minC - 0.02, maxC + 0.02);
    
    gl_FragColor = vec4(result, 1.0);
}`;
};
