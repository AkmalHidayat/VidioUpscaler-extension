// Model/anime4k_fast.js - Anime4K v4.1 Fast Shader (Mode A - Restore CNN Soft)
// Based on Anime4K algorithm: https://github.com/bloc97/Anime4K

window.Anime4KShaders = window.Anime4KShaders || {};

window.Anime4KShaders.anime4k_v41_fast = function (precision) {
    return `precision ${precision} float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_texSize;

float getLuma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
    vec2 px = 1.0 / u_texSize;
    
    // Sample 3x3 neighborhood
    vec3 c  = texture2D(u_texture, v_texCoord).rgb;
    vec3 n  = texture2D(u_texture, v_texCoord + vec2(0.0, -px.y)).rgb;
    vec3 s  = texture2D(u_texture, v_texCoord + vec2(0.0, px.y)).rgb;
    vec3 e  = texture2D(u_texture, v_texCoord + vec2(px.x, 0.0)).rgb;
    vec3 w  = texture2D(u_texture, v_texCoord + vec2(-px.x, 0.0)).rgb;
    vec3 ne = texture2D(u_texture, v_texCoord + vec2(px.x, -px.y)).rgb;
    vec3 nw = texture2D(u_texture, v_texCoord + vec2(-px.x, -px.y)).rgb;
    vec3 se = texture2D(u_texture, v_texCoord + vec2(px.x, px.y)).rgb;
    vec3 sw = texture2D(u_texture, v_texCoord + vec2(-px.x, px.y)).rgb;
    
    // Get luma values
    float lc = getLuma(c);
    float ln = getLuma(n), ls = getLuma(s), le = getLuma(e), lw = getLuma(w);
    float lne = getLuma(ne), lnw = getLuma(nw), lse = getLuma(se), lsw = getLuma(sw);
    
    // Edge detection (Sobel)
    float gx = (lnw + 2.0*lw + lsw) - (lne + 2.0*le + lse);
    float gy = (lnw + 2.0*ln + lne) - (lsw + 2.0*ls + lse);
    float edge = sqrt(gx*gx + gy*gy);
    
    // Local min/max
    float lmax = max(max(max(ln, ls), max(le, lw)), max(max(lne, lnw), max(lse, lsw)));
    float lmin = min(min(min(ln, ls), min(le, lw)), min(min(lne, lnw), min(lse, lsw)));
    
    vec3 result = c;
    
    // Edge thinning
    if (edge > 0.05) {
        float strength = clamp(edge * 2.0, 0.0, 0.4);
        vec3 brightMax = max(max(max(n, s), max(e, w)), max(max(ne, nw), max(se, sw)));
        vec3 darkMin = min(min(min(n, s), min(e, w)), min(min(ne, nw), min(se, sw)));
        
        if (lc > (lmax + lmin) * 0.5) {
            result = mix(c, brightMax, strength * 0.6);
        } else {
            result = mix(c, darkMin, strength * 0.6);
        }
    }
    
    // Light sharpening
    vec3 blur = (n + s + e + w) * 0.25;
    result = result + (result - blur) * 0.15;
    
    gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
}`;
};
