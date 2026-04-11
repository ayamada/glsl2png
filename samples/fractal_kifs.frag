#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 outColor;

// A simple recursive folding fractal (KIFS)
void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    vec3 col = vec4(0.0).rgb;
    vec2 gv = uv;

    float t = u_time * 0.2;
    float m = 0.0;
    
    for(float i = 0.0; i < 4.0; i++) {
        gv = abs(gv) - 0.5;
        // Rotation
        float a = t + i * 0.5;
        float s = sin(a);
        float c = cos(a);
        gv *= mat2(c, -s, s, c);
        
        gv = abs(gv) - 0.2;
        
        float d = length(gv);
        float mask = smoothstep(0.01, 0.0, abs(d - 0.3));
        
        vec3 layerCol = 0.5 + 0.5 * cos(t + i * 2.0 + vec3(0, 2, 4));
        col += layerCol * mask * (1.0 / (i + 1.0));
    }

    // Add some background glow
    col += 0.1 / length(uv);

    outColor = vec4(col, 1.0);
}
