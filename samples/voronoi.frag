#version 300 es
precision highp float;
in vec2 v_uv;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 outColor;

// Hash function for random values
vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

// Float hash for color variation
float hash12(vec2 p) {
	vec3 p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

void main() {
    vec2 uv = v_uv * u_resolution / min(u_resolution.x, u_resolution.y);
    uv *= 4.0; // Scale the grid

    vec2 i_uv = floor(uv);
    vec2 f_uv = fract(uv);

    float m_dist = 8.0;
    vec2 m_neighbor;
    vec2 m_point;

    // Find the closest point
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash22(i_uv + neighbor);

            // Animate the point position
            point = 0.5 + 0.5 * sin(u_time + 6.2831 * point);

            vec2 diff = neighbor + point - f_uv;
            float dist = length(diff);

            if (dist < m_dist) {
                m_dist = dist;
                m_neighbor = neighbor;
                m_point = point;
            }
        }
    }

    // Use the unique ID of the cell to pick a color
    vec2 cell_id = i_uv + m_neighbor;
    float h = hash12(cell_id);
    
    // Generate a vibrant color based on the cell ID
    vec3 col = 0.6 + 0.4 * cos(h * 6.2831 + vec3(0, 2, 4) + u_time * 0.5);
    
    // Add shading based on distance to center (subtle)
    col *= 1.0 - m_dist * 0.2;
    
    // Highlight the center point
    col += smoothstep(0.05, 0.0, m_dist);

    // Second pass for borders
    float m_edge_dist = 8.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            if (length(m_neighbor - neighbor) < 0.001) continue;
            
            vec2 point = hash22(i_uv + neighbor);
            point = 0.5 + 0.5 * sin(u_time + 6.2831 * point);

            // Vector to the edge
            vec2 p1 = m_neighbor + m_point;
            vec2 p2 = neighbor + point;
            
            // Distance to the line bisecting p1 and p2
            float dist = dot(0.5 * (p1 + p2) - f_uv, normalize(p2 - p1));
            m_edge_dist = min(m_edge_dist, dist);
        }
    }
    
    // Draw thin black borders
    col *= smoothstep(0.0, 0.02, m_edge_dist);

    outColor = vec4(col, 1.0);
}
