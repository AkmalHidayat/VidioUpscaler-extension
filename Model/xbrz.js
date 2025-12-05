// Model/xbrz.js - xBRZ Style Shader

window.Anime4KShaders = window.Anime4KShaders || {};

window.Anime4KShaders.xbrz = function (precision) {
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
    
    float dn = distance(c, n);
    float ds = distance(c, s);
    float de = distance(c, e);
    float dw = distance(c, w);
    float minD = min(min(dn, ds), min(de, dw));
    vec3 closest = dn==minD ? n : ds==minD ? s : de==minD ? e : w;
    float edge = max(max(dn, ds), max(de, dw)) - minD;
    
    vec3 result = edge > 0.1 ? mix(c, closest, 0.3) : c;
    gl_FragColor = vec4(result, 1.0);
}`;
};
