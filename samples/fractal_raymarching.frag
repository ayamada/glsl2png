#version 300 es
precision highp float;
in vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 outColor;

float map(vec3 p) {
    float s = 1.0;
    for (int i = 0; i < 4; i++) {
        p = abs(p) - 1.0;
        // Rotate around axes
        float a = u_time * 0.1;
        float s1 = sin(a);
        float c1 = cos(a);
        p.xy *= mat2(c1, -s1, s1, c1);
        p.xz *= mat2(c1, -s1, s1, c1);
        
        float scale = 1.5;
        p *= scale;
        s *= scale;
    }
    return (length(p) - 1.0) / s;
}

void main() {
    vec2 uv = v_uv * u_resolution / min(u_resolution.x, u_resolution.y);

    vec3 ro = vec3(0, 0, -3); // Ray origin
    vec3 rd = normalize(vec3(uv, 1.5)); // Ray direction
    
    float t = 0.0;
    int i;
    for (i = 0; i < 64; i++) {
        float d = map(ro + rd * t);
        if (d < 0.001 || t > 10.0) break;
        t += d;
    }
    
    vec3 col = vec3(0);
    if (t < 10.0) {
        float glow = float(i) / 64.0;
        col = 0.5 + 0.5 * cos(u_time + glow * 5.0 + vec3(0, 2, 4));
        col *= (1.0 - glow);
    }
    
    outColor = vec4(col, 1.0);
}
