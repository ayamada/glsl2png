#version 300 es
precision highp float;
in vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 outColor;
void main() {
    vec2 uv = (v_uv + 1.0) * 0.5;
    vec3 col = 0.5 + 0.5 * cos(u_time + uv.xyx + vec3(0, 2, 4));
    outColor = vec4(col, 1.0);
}
