#version 300 es
precision highp float;
in vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

// 3D Noise function for cave walls
float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0, 0, 0)), hash(i + vec3(1, 0, 0)), f.x),
                   mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
                   mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}

float fbm(vec3 p) {
    float f = 0.0;
    f += 0.5000 * noise(p); p *= 2.02;
    f += 0.2500 * noise(p); p *= 2.03;
    f += 0.1250 * noise(p); p *= 2.01;
    f += 0.0625 * noise(p);
    return f;
}

// Distance estimation for the cave
float map(vec3 p) {
    // A distorted tunnel
    vec2 path = vec2(sin(p.z * 0.3) * 0.8, cos(p.z * 0.4) * 0.5);
    float tunnel = 1.5 - length(p.xy - path);
    
    // Add bumps/stalactites/stalagmites using noise
    float bumps = fbm(p * 1.5) * 0.9;
    
    return (tunnel - bumps) * 0.7; // Scale down for precision
}

void main() {
    vec2 uv = v_uv * u_resolution / min(u_resolution.x, u_resolution.y);
    uv += vec2(0.4, -0.4);
    
    // Movement over time
    float speed = 0.5;
    float z = u_time * speed;
    vec2 ro_path = vec2(sin(z * 0.3) * 0.8, cos(z * 0.4) * 0.5);
    vec3 ro = vec3(ro_path, z);
    
    float tz = z + 1.0;
    vec2 ta_path = vec2(sin(tz * 0.3) * 0.8, cos(tz * 0.4) * 0.5);
    vec3 ta = vec3(ta_path, tz);
    
    // Camera setup
    vec3 cw = normalize(ta - ro);
    vec3 cp = vec3(sin(u_time * 0.2)*0.1, 1.0, 0.0); // Slight roll
    vec3 cu = normalize(cross(cw, cp));
    vec3 cv = normalize(cross(cu, cw));
    vec3 rd = normalize(uv.x * cu + uv.y * cv + 0.5); // Slightly wider FOV
    
    // Raymarching
    float t = 0.0;
    float d = 0.0;
    for(int i = 0; i < 8; i++) {
        d = map(ro + rd * t);
        if(abs(d) < 0.0005 || t > 30.0) break;
        t += d;
    }
    
    // Lighting
    vec3 col = vec3(0.0);
    if(t < 40.0) {
        vec3 p = ro + rd * t;
        // Simple normal calculation
        vec2 e = vec2(0.01, 0.0);
        vec3 n = normalize(vec3(
            map(p + e.xyy) - map(p - e.xyy),
            map(p + e.yxy) - map(p - e.yxy),
            map(p + e.yyx) - map(p - e.yyx)
        ));
        
        // Dark, rocky color
        float diff = max(dot(n, -rd), 0.0);
        float amb = 0.1;
        col = vec3(0.28, 0.14, 0.16) * (diff + amb);
        
        // Fog/depth
        col *= exp(-0.1 * t);
        
        // Add some glowing moss or crystals?
        float moss = smoothstep(0.4, 0.6, fbm(p * 2.0));
        col += vec3(0.05, 0.1, 0.15) * moss * exp(-0.05 * t);
    }
    
    // Final color adjustment
    float gRatio = mix(0.4545, 1.0, t*0.9);
    //float gRatio = 1.0;
    col = pow(col, vec3(gRatio)); // Gamma correction
    
    fragColor = vec4(col, 1.0);
}
