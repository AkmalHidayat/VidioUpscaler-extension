// Model/realsr.js - Real-ESRGAN Lite Shader

window.Anime4KShaders = window.Anime4KShaders || {};

window.Anime4KShaders.realsr = function (precision) {
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
    vec3 ne = texture2D(u_texture, v_texCoord + vec2(px.x, -px.y)).rgb;
    vec3 nw = texture2D(u_texture, v_texCoord + vec2(-px.x, -px.y)).rgb;
    vec3 se = texture2D(u_texture, v_texCoord + vec2(px.x, px.y)).rgb;
    vec3 sw = texture2D(u_texture, v_texCoord + vec2(-px.x, px.y)).rgb;
    
    float edge = abs(getLuma(n) - getLuma(s)) + abs(getLuma(e) - getLuma(w));
    vec3 avg = (n + s + e + w + ne + nw + se + sw) / 8.0;
    vec3 detail = c - avg;
    vec3 enhanced = c + detail * clamp(1.5 - edge * 2.0, 0.5, 1.5);
    vec3 result = edge > 0.1 ? enhanced : mix(c, avg, clamp(0.3 - edge, 0.0, 0.2));
    
    gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
}`;
};
