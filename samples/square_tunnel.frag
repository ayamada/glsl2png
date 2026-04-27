#version 300 es
precision highp float;
in vec2 v_uv;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

// Simple hash function for texture-like patterns
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

void main() {
    // Normalized and centered coordinates
    vec2 uv = v_uv * u_resolution / min(u_resolution.x, u_resolution.y);
    
    // Calculate distance to the "edges" of the square
    float dist = max(abs(uv.x), abs(uv.y));
    
    // Depth calculation (1/dist gives the perspective effect)
    float z = 1.0 / (dist + 0.01);
    
    // Movement along the Z axis
    float travel = u_time * 2.0;
    float current_z = z + travel;
    
    // Determine which wall we are on
    vec2 wall_uv;
    if (abs(uv.x) > abs(uv.y)) {
        wall_uv = vec2(uv.y / uv.x, current_z);
    } else {
        wall_uv = vec2(uv.x / uv.y, current_z);
    }
    
    // Create a grid/brick pattern for the walls
    vec2 grid = fract(wall_uv * vec2(2.0, 4.0));
    float brick = step(0.1, grid.x) * step(0.1, grid.y);
    
    // Add some noise/dirt to the walls
    float n = hash(floor(wall_uv * vec2(2.0, 4.0)));
    vec3 wallColor = vec3(0.3, 0.3, 0.35) * (0.5 + 0.5 * n);
    
    // Lighting: darken as we get deeper into the center
    float light = exp(-dist * 0.5) * 0.8;
    
    // Edge highlighting for the square shape
    float edge = smoothstep(0.01, 0.0, abs(grid.x - 0.1)) + smoothstep(0.01, 0.0, abs(grid.y - 0.1));
    
    vec3 finalColor = wallColor * brick * light;
    finalColor += edge * 0.1 * light;
    
    // Add a bit of "distant light" at the center
    finalColor += vec3(0.1, 0.1, 0.2) / (dist + 0.1);
    
    // Fog effect
    finalColor = mix(finalColor, vec3(0.02, 0.02, 0.05), smoothstep(5.0, 20.0, z));

    fragColor = vec4(finalColor, 1.0);
}
