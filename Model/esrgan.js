// Model/esrgan.js - Enhanced Super-Resolution GAN (ESRGAN)
// Improved neural network-inspired upscaling with better edge preservation
// Excellent for photorealistic content and anime

window.Anime4KShaders = window.Anime4KShaders || {};

window.Anime4KShaders.esrgan = function (precision) {
    return `precision ${precision} float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_texSize;
uniform float u_sharpen;

// ESRGAN-inspired edge-aware upscaling
// Uses gradient detection and adaptive sharpening

vec3 getRGB(vec2 tc) {
    return texture2D(u_texture, tc).rgb;
}

// Sobel edge detection
float detectEdge(vec2 tc) {
    vec2 px = 1.0 / u_texSize;
    
    float gx = -getRGB(tc + vec2(-px.x, -px.y)).g
             - 2.0 * getRGB(tc + vec2(-px.x, 0.0)).g
             - getRGB(tc + vec2(-px.x, px.y)).g
             + getRGB(tc + vec2(px.x, -px.y)).g
             + 2.0 * getRGB(tc + vec2(px.x, 0.0)).g
             + getRGB(tc + vec2(px.x, px.y)).g;
    
    float gy = -getRGB(tc + vec2(-px.x, -px.y)).g
             - 2.0 * getRGB(tc + vec2(0.0, -px.y)).g
             - getRGB(tc + vec2(px.x, -px.y)).g
             + getRGB(tc + vec2(-px.x, px.y)).g
             + 2.0 * getRGB(tc + vec2(0.0, px.y)).g
             + getRGB(tc + vec2(px.x, px.y)).g;
    
    return sqrt(gx*gx + gy*gy);
}

// Cubic interpolation for smooth upscaling
vec3 cubic(float t) {
    float t2 = t * t;
    float t3 = t2 * t;
    
    // Catmull-Rom cubic basis
    return 0.5 * vec3(
        -t3 + 2.0*t2 - t,           // B0
        3.0*t3 - 5.0*t2 + 2.0,      // B1
        -3.0*t3 + 4.0*t2 + t        // B2
    ) + 0.5 * vec3(
        t3 - t2,                    // B3
        0.0,
        0.0
    );
}

void main() {
    vec2 px = 1.0 / u_texSize;
    vec2 tc = v_texCoord * u_texSize - 0.5;
    vec2 fp = fract(tc);
    
    // Catmull-Rom interpolation (4x4 kernel)
    vec3 cx = cubic(fp.x);
    vec3 cy = cubic(fp.y);
    
    vec3 color = vec3(0.0);
    vec2 baseTC = (floor(tc) - 1.5) * px;
    
    for (int y = 0; y < 4; y++) {
        for (int x = 0; x < 4; x++) {
            vec2 sampleTC = baseTC + vec2(float(x), float(y)) * px;
            vec3 sample = getRGB(sampleTC);
            
            float wx = x == 0 ? cx.x : (x == 1 ? cx.y : (x == 2 ? cx.z : 0.5 * (1.0 - cx.x - cx.y - cx.z)));
            float wy = y == 0 ? cy.x : (y == 1 ? cy.y : (y == 2 ? cy.z : 0.5 * (1.0 - cy.x - cy.y - cy.z)));
            
            color += sample * wx * wy;
        }
    }
    
    // Edge-aware adaptive sharpening
    float edge = detectEdge(v_texCoord);
    float adaptiveSharp = mix(u_sharpen * 0.5, u_sharpen * 1.5, edge);
    
    if (adaptiveSharp > 0.01) {
        vec3 laplacian = -color
            - getRGB(v_texCoord + vec2(-px.x, 0.0))
            - getRGB(v_texCoord + vec2(px.x, 0.0))
            - getRGB(v_texCoord + vec2(0.0, -px.y))
            - getRGB(v_texCoord + vec2(0.0, px.y))
            + 4.0 * getRGB(v_texCoord);
        
        color += laplacian * adaptiveSharp * 0.2;
    }
    
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
};
