#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 outColor;

#define PI 3.14159265359

mat2 rotate2d(float _angle){
    return mat2(cos(_angle),-sin(_angle), sin(_angle),cos(_angle));
}

void main() {
    // 画面中心を原点(0,0)とし、-1.0〜1.0の範囲に正規化
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    uv = rotate2d(u_time*0.1)*uv;

    // 極座標変換
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    // トンネルの奥に進む感覚を出すための座標変換
    // 1.0 / r で中心に向かうほど座標が伸びる（パースペクティブ）
    // u_time を加算して奥に流れる
    vec2 p = vec2(0.5 / r + u_time * 0.5, a / PI);

    // チェッカーボード/グリッドパターンの作成
    vec3 col = vec3(0.0);
    float grid = step(0.5, fract(p.x * 2.0)) * step(0.5, fract(p.y * 5.0));
    grid += step(0.5, fract(p.x * 2.0 + 0.5)) * step(0.5, fract(p.y * 5.0 + 0.5));
    
    // 色付け: 奥に行くほど（rが小さいほど）暗く、かつ色を変化させる
    col = mix(vec3(0.1, 0.2, 0.4), vec3(0.5, 0.8, 1.0), grid);
    col *= r; // 奥を暗く（ヴィネット効果）
    
    // サイケデリックな加算
    col += vec3(0.2, 0.1, 0.3) / r * 0.2;

    outColor = vec4(col, 1.0);
}
