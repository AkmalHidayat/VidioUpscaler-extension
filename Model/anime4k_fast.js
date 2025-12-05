// Model/anime4k_fast.js - Anime4K v4.1 Fast Shader

window.Anime4KShaders = window.Anime4KShaders || {};

window.Anime4KShaders.anime4k_v41_fast = function (precision) {
    return `precision ${precision} float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_texSize;

float getLuma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

void main() {
    vec2 px = 1.0 / u_texSize;
    vec3 c = texture2D(u_texture, v_texCoord).rgb;
    vec3 n = texture2D(u_texture, v_texCoord + vec2(0.0, -px.y)).rgb;
    vec3 s = texture2D(u_texture, v_texCoord + vec2(0.0, px.y)).rgb;
    vec3 e = texture2D(u_texture, v_texCoord + vec2(px.x, 0.0)).rgb;
    vec3 w = texture2D(u_texture, v_texCoord + vec2(-px.x, 0.0)).rgb;
    
    float edge = max(abs(getLuma(n) - getLuma(s)), abs(getLuma(e) - getLuma(w)));
    vec3 result = c;
    
    if (edge > 0.05) {
        float lc = getLuma(c);
        float lmax = getLuma(max(max(n, s), max(e, w)));
        float lmin = getLuma(min(min(n, s), min(e, w)));
        float str = clamp(edge * 1.5, 0.0, 0.25);
        result = lc > (lmax + lmin) * 0.5 ? mix(c, max(max(n,s),max(e,w)), str) : mix(c, min(min(n,s),min(e,w)), str);
    }
    
    result = c * 1.12 - (n + s + e + w) * 0.03;
    gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
}`;
};
