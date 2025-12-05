// Model/bicubic.js - Bicubic Interpolation Shader
// Mitchell-Netravali kernel (B=1/3, C=1/3) for optimal quality

window.Anime4KShaders = window.Anime4KShaders || {};

window.Anime4KShaders.bicubic = function (precision) {
    return `precision ${precision} float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_texSize;
uniform float u_sharpen;

// Mitchell-Netravali cubic kernel
float mitchell(float x) {
    x = abs(x);
    float B = 0.333333;
    float C = 0.333333;
    
    if (x < 1.0) {
        return ((12.0 - 9.0*B - 6.0*C) * x*x*x + 
                (-18.0 + 12.0*B + 6.0*C) * x*x + 
                (6.0 - 2.0*B)) / 6.0;
    } else if (x < 2.0) {
        return ((-B - 6.0*C) * x*x*x + 
                (6.0*B + 30.0*C) * x*x + 
                (-12.0*B - 48.0*C) * x + 
                (8.0*B + 24.0*C)) / 6.0;
    }
    return 0.0;
}

void main() {
    vec2 px = 1.0 / u_texSize;
    vec2 tc = v_texCoord * u_texSize;
    vec2 fp = fract(tc);
    vec2 tc0 = (floor(tc) + 0.5) / u_texSize;
    
    // Kernel weights
    float wx0 = mitchell(fp.x + 1.0);
    float wx1 = mitchell(fp.x);
    float wx2 = mitchell(1.0 - fp.x);
    float wx3 = mitchell(2.0 - fp.x);
    float wy0 = mitchell(fp.y + 1.0);
    float wy1 = mitchell(fp.y);
    float wy2 = mitchell(1.0 - fp.y);
    float wy3 = mitchell(2.0 - fp.y);
    
    // Normalize
    float sumX = wx0 + wx1 + wx2 + wx3;
    float sumY = wy0 + wy1 + wy2 + wy3;
    wx0 /= sumX; wx1 /= sumX; wx2 /= sumX; wx3 /= sumX;
    wy0 /= sumY; wy1 /= sumY; wy2 /= sumY; wy3 /= sumY;
    
    // Sample 4x4 grid (unrolled for WebGL compatibility)
    vec3 result = vec3(0.0);
    
    // Row 0
    result += texture2D(u_texture, tc0 + vec2(-1.0, -1.0) * px).rgb * wx0 * wy0;
    result += texture2D(u_texture, tc0 + vec2(0.0, -1.0) * px).rgb * wx1 * wy0;
    result += texture2D(u_texture, tc0 + vec2(1.0, -1.0) * px).rgb * wx2 * wy0;
    result += texture2D(u_texture, tc0 + vec2(2.0, -1.0) * px).rgb * wx3 * wy0;
    
    // Row 1
    result += texture2D(u_texture, tc0 + vec2(-1.0, 0.0) * px).rgb * wx0 * wy1;
    result += texture2D(u_texture, tc0 + vec2(0.0, 0.0) * px).rgb * wx1 * wy1;
    result += texture2D(u_texture, tc0 + vec2(1.0, 0.0) * px).rgb * wx2 * wy1;
    result += texture2D(u_texture, tc0 + vec2(2.0, 0.0) * px).rgb * wx3 * wy1;
    
    // Row 2
    result += texture2D(u_texture, tc0 + vec2(-1.0, 1.0) * px).rgb * wx0 * wy2;
    result += texture2D(u_texture, tc0 + vec2(0.0, 1.0) * px).rgb * wx1 * wy2;
    result += texture2D(u_texture, tc0 + vec2(1.0, 1.0) * px).rgb * wx2 * wy2;
    result += texture2D(u_texture, tc0 + vec2(2.0, 1.0) * px).rgb * wx3 * wy2;
    
    // Row 3
    result += texture2D(u_texture, tc0 + vec2(-1.0, 2.0) * px).rgb * wx0 * wy3;
    result += texture2D(u_texture, tc0 + vec2(0.0, 2.0) * px).rgb * wx1 * wy3;
    result += texture2D(u_texture, tc0 + vec2(1.0, 2.0) * px).rgb * wx2 * wy3;
    result += texture2D(u_texture, tc0 + vec2(2.0, 2.0) * px).rgb * wx3 * wy3;
    
    // Light sharpening
    vec3 c = texture2D(u_texture, v_texCoord).rgb;
    vec3 n = texture2D(u_texture, v_texCoord + vec2(0.0, -px.y)).rgb;
    vec3 s = texture2D(u_texture, v_texCoord + vec2(0.0, px.y)).rgb;
    vec3 e = texture2D(u_texture, v_texCoord + vec2(px.x, 0.0)).rgb;
    vec3 w = texture2D(u_texture, v_texCoord + vec2(-px.x, 0.0)).rgb;
    
    vec3 blur = (n + s + e + w) * 0.25;
    float sharpStrength = 0.15 * (1.0 + u_sharpen);
    result = result + (c - blur) * sharpStrength;
    
    gl_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
}`;
};
