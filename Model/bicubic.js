// Model/bicubic.js - Bicubic Sharp Shader

window.Anime4KShaders = window.Anime4KShaders || {};

window.Anime4KShaders.bicubic = function (precision) {
    return `precision ${precision} float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_texSize;

void main() {
    vec2 px = 1.0 / u_texSize;
    vec3 c = texture2D(u_texture, v_texCoord).rgb;
    vec3 n = texture2D(u_texture, v_texCoord + vec2(0.0, -px.y)).rgb;
    vec3 s = texture2D(u_texture, v_texCoord + vec2(0.0, px.y)).rgb;
    vec3 e = texture2D(u_texture, v_texCoord + vec2(px.x, 0.0)).rgb;
    vec3 w = texture2D(u_texture, v_texCoord + vec2(-px.x, 0.0)).rgb;
    
    vec3 sharp = c * 1.5 - (n + s + e + w) * 0.125;
    vec3 minC = min(min(n, s), min(e, w)) - 0.02;
    vec3 maxC = max(max(n, s), max(e, w)) + 0.02;
    
    gl_FragColor = vec4(clamp(sharp, minC, maxC), 1.0);
}`;
};
