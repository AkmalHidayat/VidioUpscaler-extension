// Model/lanczos3.js - Lanczos3 Resampling Filter
// High-quality reconstruction filter with excellent frequency response
// Best for general-purpose upscaling with minimal artifacts

window.Anime4KShaders = window.Anime4KShaders || {};

window.Anime4KShaders.lanczos3 = function (precision) {
    return `precision ${precision} float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_texSize;
uniform float u_sharpen;

// Lanczos3 kernel
float lanczos3(float x) {
    x = abs(x);
    if (x >= 3.0) return 0.0;
    
    float pi = 3.14159265359;
    if (x < 0.0001) return 1.0;
    
    float sinc = sin(pi * x) / (pi * x);
    float window = sin(pi * x / 3.0) / (pi * x / 3.0);
    return sinc * window;
}

void main() {
    vec2 px = 1.0 / u_texSize;
    vec2 tc = v_texCoord * u_texSize - 0.5;
    vec2 fp = fract(tc);
    vec2 tc0 = (floor(tc) + 0.5) * px;
    
    vec3 color = vec3(0.0);
    float totalWeight = 0.0;
    
    // 6x6 kernel for Lanczos3
    for (int y = -2; y <= 3; y++) {
        for (int x = -2; x <= 3; x++) {
            vec2 samplePos = tc0 + vec2(float(x), float(y)) * px;
            float wx = lanczos3(float(x) - fp.x);
            float wy = lanczos3(float(y) - fp.y);
            float weight = wx * wy;
            
            color += texture2D(u_texture, samplePos).rgb * weight;
            totalWeight += weight;
        }
    }
    
    color /= totalWeight;
    
    // Apply sharpening if requested
    if (u_sharpen > 0.01) {
        vec2 pixelSize = px;
        vec3 laplacian = vec3(0.0);
        
        // Simple 3x3 Laplacian
        laplacian -= texture2D(u_texture, v_texCoord + vec2(-pixelSize.x, 0.0)).rgb;
        laplacian -= texture2D(u_texture, v_texCoord + vec2(pixelSize.x, 0.0)).rgb;
        laplacian -= texture2D(u_texture, v_texCoord + vec2(0.0, -pixelSize.y)).rgb;
        laplacian -= texture2D(u_texture, v_texCoord + vec2(0.0, pixelSize.y)).rgb;
        laplacian += 4.0 * color;
        
        color += laplacian * u_sharpen * 0.3;
    }
    
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
};
