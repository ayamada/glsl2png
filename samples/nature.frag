#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 outColor;

// --- Noise Functions ---
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; ++i) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

// --- Terrain and Scene ---
float get_terrain_height(vec2 p) {
    float h = fbm(p * 0.5) * 2.0;
    h += fbm(p * 2.0) * 0.2;
    return h - 0.7; // Lower overall height to create valleys for water
}

float get_height(vec2 p) {
    return max(get_terrain_height(p), 0.0);
}

vec3 get_normal(vec3 p) {
    vec2 e = vec2(0.01, 0.0);
    return normalize(vec3(
        get_height(p.xz - e.xy) - get_height(p.xz + e.xy),
        2.0 * e.x,
        get_height(p.xz - e.yx) - get_height(p.xz + e.yx)
    ));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    // Camera
    float time = u_time * 0.2;
    vec2 camPos = vec2(time, time);
    
    // High-altitude cruising for smooth movement and avoiding collisions
    float camH = 1.8 + sin(time * 0.3) * 0.2; 
    vec3 ro = vec3(camPos.x, camH, camPos.y); // ray origin
    vec3 lookat = ro + vec3(cos(time), -0.4, sin(time)); // Look slightly downwards
    vec3 forward = normalize(lookat - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);
    vec3 rd = normalize(forward + uv.x * right + uv.y * up); // ray direction

    // Raymarching (Simple terrain)
    float t = 0.1;
    float hit = -1.0;
    for(int i = 0; i < 100; i++) {
        vec3 p = ro + rd * t;
        float h = get_height(p.xz);
        if(p.y < h) {
            hit = t;
            break;
        }
        t += (p.y - h) * 0.5 + 0.01;
        if(t > 20.0) break;
    }

    // Coloring
    vec3 col;
    vec3 sunDir = normalize(vec3(0.5, 0.5, -0.5));
    
    if(hit > 0.0) {
        // Terrain or Water
        vec3 p = ro + rd * hit;
        vec3 norm = get_normal(p);
        
        // Base color based on height/slope
        vec3 sand = vec3(0.8, 0.7, 0.5);
        vec3 grass = vec3(0.2, 0.3, 0.1);
        vec3 rock = vec3(0.4, 0.35, 0.3);
        vec3 snow = vec3(0.9, 0.9, 1.0);
        vec3 water = vec3(0.2, 0.3, 0.4);
        
        float th = get_terrain_height(p.xz);
        if (th < 0.02) {
            // Water/Beach
            col = mix(water, sand, smoothstep(-0.05, 0.0, th));
            if (th < 0.0) {
                // Add some wave movement to water normal
                norm.xz += vec2(sin(p.x * 10.0 + u_time), cos(p.z * 10.0 + u_time)) * 0.1;
                norm = normalize(norm);
            }
        } else {
            col = mix(sand, grass, smoothstep(0.02, 0.1, th));
            col = mix(col, rock, smoothstep(0.4, 0.7, norm.y));
            col = mix(col, snow, smoothstep(1.5, 1.8, p.y));
        }
        
        float diff = max(dot(norm, sunDir), 0.0);
        col *= diff + 0.2; // lighting
        
        // Fog
        col = mix(col, vec3(0.6, 0.7, 0.8), smoothstep(5.0, 20.0, hit));
    } else {
        // Sky
        col = mix(vec3(0.4, 0.6, 1.0), vec3(0.7, 0.85, 1.0), rd.y * 0.5 + 0.5);
        
        // Clouds (Simple FBM)
        float cloud = fbm(rd.xz / (rd.y + 0.01) + time * 0.1);
        col = mix(col, vec3(1.0), smoothstep(0.4, 0.8, cloud) * max(rd.y, 0.0));
        
        // Sun
        float sun = pow(max(dot(rd, sunDir), 0.0), 32.0);
        col += vec3(1.0, 0.9, 0.7) * sun;
    }

    // Gamma correction
    col = pow(col, vec3(0.4545));

    outColor = vec4(col, 1.0);
}
