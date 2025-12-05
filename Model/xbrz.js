// Model/xbrz.js - xBRZ Style Shader
// Based on xBRZ by Zenju - Pattern-based pixel art scaler
// Detects edges and corners, applies smart interpolation

window.Anime4KShaders = window.Anime4KShaders || {};

window.Anime4KShaders.xbrz = function (precision) {
    return `precision ${precision} float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform vec2 u_texSize;

#define XBRZ_THRESHOLD 0.05

// Weighted color distance (YCbCr-aware for perceptual accuracy)
float colorDist(vec3 a, vec3 b) {
    vec3 d = a - b;
    float y = dot(d, vec3(0.299, 0.587, 0.114));
    float u = dot(d, vec3(-0.147, -0.289, 0.436));
    float v = dot(d, vec3(0.615, -0.515, -0.100));
    return sqrt(y*y*2.0 + u*u + v*v);
}

// Check if two colors are similar
bool similar(vec3 a, vec3 b) {
    return colorDist(a, b) < XBRZ_THRESHOLD;
}

void main() {
    vec2 px = 1.0 / u_texSize;
    vec2 fp = fract(v_texCoord * u_texSize); // Sub-pixel position
    
    // 5x5 neighborhood sampling for pattern detection
    vec3 c  = texture2D(u_texture, v_texCoord).rgb;
    vec3 n  = texture2D(u_texture, v_texCoord + vec2(0.0, -px.y)).rgb;
    vec3 s  = texture2D(u_texture, v_texCoord + vec2(0.0, px.y)).rgb;
    vec3 e  = texture2D(u_texture, v_texCoord + vec2(px.x, 0.0)).rgb;
    vec3 w  = texture2D(u_texture, v_texCoord + vec2(-px.x, 0.0)).rgb;
    vec3 ne = texture2D(u_texture, v_texCoord + vec2(px.x, -px.y)).rgb;
    vec3 nw = texture2D(u_texture, v_texCoord + vec2(-px.x, -px.y)).rgb;
    vec3 se = texture2D(u_texture, v_texCoord + vec2(px.x, px.y)).rgb;
    vec3 sw = texture2D(u_texture, v_texCoord + vec2(-px.x, px.y)).rgb;
    
    // Extended samples for better edge detection
    vec3 n2 = texture2D(u_texture, v_texCoord + vec2(0.0, -2.0*px.y)).rgb;
    vec3 s2 = texture2D(u_texture, v_texCoord + vec2(0.0, 2.0*px.y)).rgb;
    vec3 e2 = texture2D(u_texture, v_texCoord + vec2(2.0*px.x, 0.0)).rgb;
    vec3 w2 = texture2D(u_texture, v_texCoord + vec2(-2.0*px.x, 0.0)).rgb;
    
    // Compute color distances
    float dN = colorDist(c, n);
    float dS = colorDist(c, s);
    float dE = colorDist(c, e);
    float dW = colorDist(c, w);
    float dNE = colorDist(c, ne);
    float dNW = colorDist(c, nw);
    float dSE = colorDist(c, se);
    float dSW = colorDist(c, sw);
    
    // Pattern detection: edge types
    bool edgeN = dN > XBRZ_THRESHOLD;
    bool edgeS = dS > XBRZ_THRESHOLD;
    bool edgeE = dE > XBRZ_THRESHOLD;
    bool edgeW = dW > XBRZ_THRESHOLD;
    
    // Corner detection
    bool cornerNE = edgeN && edgeE && similar(n, e);
    bool cornerNW = edgeN && edgeW && similar(n, w);
    bool cornerSE = edgeS && edgeE && similar(s, e);
    bool cornerSW = edgeS && edgeW && similar(s, w);
    
    // Line detection (horizontal or vertical runs)
    bool hLine = similar(w, c) && similar(c, e) && !similar(n, c) && !similar(s, c);
    bool vLine = similar(n, c) && similar(c, s) && !similar(w, c) && !similar(e, c);
    
    vec3 result = c;
    
    // xBRZ interpolation rules
    if (cornerNE && !cornerSW && fp.x > 0.5 && fp.y < 0.5) {
        // NE corner blend
        float blend = smoothstep(0.3, 0.7, (fp.x + (1.0-fp.y)) * 0.5);
        result = mix(c, n, blend * 0.5);
    } else if (cornerNW && !cornerSE && fp.x < 0.5 && fp.y < 0.5) {
        // NW corner blend
        float blend = smoothstep(0.3, 0.7, ((1.0-fp.x) + (1.0-fp.y)) * 0.5);
        result = mix(c, n, blend * 0.5);
    } else if (cornerSE && !cornerNW && fp.x > 0.5 && fp.y > 0.5) {
        // SE corner blend
        float blend = smoothstep(0.3, 0.7, (fp.x + fp.y) * 0.5);
        result = mix(c, s, blend * 0.5);
    } else if (cornerSW && !cornerNE && fp.x < 0.5 && fp.y > 0.5) {
        // SW corner blend
        float blend = smoothstep(0.3, 0.7, ((1.0-fp.x) + fp.y) * 0.5);
        result = mix(c, s, blend * 0.5);
    } else if (hLine) {
        // Horizontal line: preserve sharpness vertically
        result = c;
    } else if (vLine) {
        // Vertical line: preserve sharpness horizontally  
        result = c;
    } else {
        // Default: smart anti-aliasing based on closest neighbor
        float minD = min(min(dN, dS), min(dE, dW));
        float maxD = max(max(dN, dS), max(dE, dW));
        float edgeStrength = maxD - minD;
        
        if (edgeStrength > 0.1) {
            // Find closest matching neighbor
            vec3 closest = dN == minD ? n : dS == minD ? s : dE == minD ? e : w;
            float blend = smoothstep(0.1, 0.3, edgeStrength) * 0.3;
            result = mix(c, closest, blend);
        }
    }
    
    gl_FragColor = vec4(result, 1.0);
}`;
};
