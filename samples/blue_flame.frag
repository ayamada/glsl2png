#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

// 2D Noise
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

// Fractional Brownian Motion
float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = m * p;
        a *= 0.5;
    }
    return v;
}

void main() {
    // 中央を原点とし、アスペクト比を考慮した座標系
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    // 炎のベース位置調整（少し下に下げる）
    vec2 p = uv;
    p.y += 0.6;
    
    // 炎の形状（少し広がりを持たせる）
    float shape = 1.0 - length(p * vec2(1.2, 0.5));
    shape = clamp(shape, 0.0, 1.0);
    
    // 立ち上る動きのノイズ
    vec2 q = p * 1.5;
    q.y -= u_time * 2.0;
    float n = fbm(q);
    
    // ノイズによる形状の歪み
    float flame = fbm(p * 1.2 - vec2(0.0, u_time * 1.5) + n * 0.5);
    
    // 強度の計算（輝度を大幅に上げるために指数を下げ、係数を調整）
    float intensity = pow(flame * shape, 1.2) * 2.5;
    
    // カラー：青い炎（芯に向かって明るく）
    vec3 col = vec3(0.1, 0.3, 1.0) * intensity;          // Base Blue
    col += vec3(0.0, 0.8, 1.0) * pow(intensity, 2.0);   // Cyan
    col += vec3(0.9, 1.0, 1.0) * pow(intensity, 4.0);   // White hot core
    
    // 底部のグロー効果を強化
    col += vec3(0.0, 0.2, 0.6) * exp(-length(p * 1.0) * 2.0);

    // 背景は黒
    fragColor = vec4(col, 1.0);
}
