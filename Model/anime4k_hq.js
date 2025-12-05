// Model/anime4k_hq.js - Anime4K v4.1 HQ Shader (Mode A+A - Restore CNN Strong)  
// Based on Anime4K algorithm: https://github.com/bloc97/Anime4K
// Simulates multi-pass CNN restoration for maximum quality

window.Anime4KShaders = window.Anime4KShaders || {};

window.Anime4KShaders.anime4k_v41_hq = function (precision) {
    return `precision ${precision} float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_texSize;

float getLuma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

// Gaussian-weighted gradient for smoother edge detection
float gaussWeight(float x) { return exp(-x * x * 0.5); }

void main() {
    vec2 px = 1.0 / u_texSize;
    
    // Extended 5x5 sampling for HQ mode
    vec3 c = texture2D(u_texture, v_texCoord).rgb;
    
    // 3x3 core
    vec3 n  = texture2D(u_texture, v_texCoord + vec2(0.0, -px.y)).rgb;
    vec3 s  = texture2D(u_texture, v_texCoord + vec2(0.0, px.y)).rgb;
    vec3 e  = texture2D(u_texture, v_texCoord + vec2(px.x, 0.0)).rgb;
    vec3 w  = texture2D(u_texture, v_texCoord + vec2(-px.x, 0.0)).rgb;
    vec3 ne = texture2D(u_texture, v_texCoord + vec2(px.x, -px.y)).rgb;
    vec3 nw = texture2D(u_texture, v_texCoord + vec2(-px.x, -px.y)).rgb;
    vec3 se = texture2D(u_texture, v_texCoord + vec2(px.x, px.y)).rgb;
    vec3 sw = texture2D(u_texture, v_texCoord + vec2(-px.x, px.y)).rgb;
    
    // Extended samples (2 pixels away)
    vec3 n2  = texture2D(u_texture, v_texCoord + vec2(0.0, -2.0*px.y)).rgb;
    vec3 s2  = texture2D(u_texture, v_texCoord + vec2(0.0, 2.0*px.y)).rgb;
    vec3 e2  = texture2D(u_texture, v_texCoord + vec2(2.0*px.x, 0.0)).rgb;
    vec3 w2  = texture2D(u_texture, v_texCoord + vec2(-2.0*px.x, 0.0)).rgb;
    
    // Luma values
    float lc = getLuma(c);
    float ln = getLuma(n), ls = getLuma(s), le = getLuma(e), lw = getLuma(w);
    float lne = getLuma(ne), lnw = getLuma(nw), lse = getLuma(se), lsw = getLuma(sw);
    float ln2 = getLuma(n2), ls2 = getLuma(s2), le2 = getLuma(e2), lw2 = getLuma(w2);
    
    // Gaussian-weighted Sobel for smoother gradients
    float gx = (lnw + 2.0*lw + lsw) - (lne + 2.0*le + lse);
    float gy = (lnw + 2.0*ln + lne) - (lsw + 2.0*ls + lse);
    float edge = sqrt(gx*gx + gy*gy);
    
    // Extended gradient for line detection
    float lineH = abs(lw2 - 2.0*lc + le2);
    float lineV = abs(ln2 - 2.0*lc + ls2);
    float lineStrength = max(lineH, lineV);
    
    // Local statistics
    float lmax3 = max(max(max(ln, ls), max(le, lw)), max(max(lne, lnw), max(lse, lsw)));
    float lmin3 = min(min(min(ln, ls), min(le, lw)), min(min(lne, lnw), min(lse, lsw)));
    
    vec3 result = c;
    
    // Pass 1: Strong edge thinning
    if (edge > 0.06) {
        float strength = clamp(edge * 2.5, 0.0, 0.5);
        
        vec3 brightMax = max(max(max(n, s), max(e, w)), max(max(ne, nw), max(se, sw)));
        vec3 darkMin = min(min(min(n, s), min(e, w)), min(min(ne, nw), min(se, sw)));
        
        if (lc > (lmax3 + lmin3) * 0.5) {
            result = mix(c, brightMax, strength * 0.7);
        } else {
            result = mix(c, darkMin, strength * 0.7);
        }
    }
    
    // Pass 2: Line art enhancement
    if (lineStrength > 0.03) {
        vec2 dir = lineH > lineV ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec3 along1 = texture2D(u_texture, v_texCoord + dir * px).rgb;
        vec3 along2 = texture2D(u_texture, v_texCoord - dir * px).rgb;
        
        float lineEnhance = clamp(lineStrength * 3.0, 0.0, 0.4);
        result = result * (1.0 + lineEnhance) - (along1 + along2) * lineEnhance * 0.5;
    }
    
    // Pass 3: Detail preservation with bilateral-style filtering
    vec3 avg = (n + s + e + w + ne + nw + se + sw) / 8.0;
    float similarity = 1.0 - clamp(distance(c, avg) * 4.0, 0.0, 1.0);
    
    // Smooth flat areas, sharpen detailed areas
    if (edge < 0.03) {
        result = mix(result, (c * 3.0 + avg) / 4.0, similarity * 0.5);
    } else {
        vec3 detail = c - avg;
        result = result + detail * 0.25;
    }
    
    // Pass 4: Final unsharp mask
    vec3 blur = (n + s + e + w) * 0.25;
    result = result + (result - blur) * 0.2;
    
    gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
}`;
};
