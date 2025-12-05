// Model/fsr.js - AMD FSR 1.0 Shader

window.Anime4KShaders = window.Anime4KShaders || {};

window.Anime4KShaders.fsr = function (precision) {
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
    
    float lmax = max(max(getLuma(n), getLuma(s)), max(getLuma(e), getLuma(w)));
    float lmin = min(min(getLuma(n), getLuma(s)), min(getLuma(e), getLuma(w)));
    float contrast = lmax - lmin;
    float sharpness = clamp(contrast * 4.0, 0.0, 1.0);
    
    vec3 sharp = c * (1.0 + sharpness * 0.5) - (n + s + e + w) * sharpness * 0.125;
    sharp = clamp(sharp, min(min(n,s),min(e,w)), max(max(n,s),max(e,w)));
    
    gl_FragColor = vec4(mix(c, sharp, 0.7), 1.0);
}`;
};
