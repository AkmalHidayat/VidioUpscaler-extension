// Model/debug.js - Debug Shader (Grayscale effect for testing)
// If you see grayscale video, the shader system is working!

window.Anime4KShaders = window.Anime4KShaders || {};

window.Anime4KShaders.debug = function (precision) {
    return `precision ${precision} float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_texSize;
uniform float u_sharpen;

void main() {
    vec3 c = texture2D(u_texture, v_texCoord).rgb;
    
    // Convert to grayscale - VERY obvious effect
    float gray = dot(c, vec3(0.299, 0.587, 0.114));
    
    gl_FragColor = vec4(vec3(gray), 1.0);
}`;
};
