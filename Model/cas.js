// Model/cas.js - AMD CAS Shader

window.Anime4KShaders = window.Anime4KShaders || {};

window.Anime4KShaders.cas = function (precision) {
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
    
    vec3 minC = min(min(n, s), min(e, w));
    vec3 maxC = max(max(n, s), max(e, w));
    float contrast = getLuma(maxC - minC);
    float sharpness = mix(0.0, 0.5, clamp(contrast * 3.0, 0.0, 1.0));
    vec3 sharp = c + (c - (n + s + e + w) * 0.25) * sharpness;
    
    gl_FragColor = vec4(clamp(sharp, minC - 0.01, maxC + 0.01), 1.0);
}`;
};
