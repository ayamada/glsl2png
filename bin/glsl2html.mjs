#!/usr/bin/env node

import { parseArgs } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(await readFile(join(__dirname, "../package.json"), "utf-8"));

const options = {
  width: { type: "string", default: "512" },
  height: { type: "string", default: "512" },
  out: { type: "string", default: "output.html" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
};

function showHelp() {
  console.log(`
glsl2html v${pkg.version} - Generate a standalone HTML file to view GLSL shaders.

Usage:
  glsl2html [options] <fragment_shader_path>

Options:
  --width <number>     Original canvas width (default: 512).
  --height <number>    Original canvas height (default: 512).
  --out <path>         Output HTML path (default: output.html).
  -h, --help           Show this help message.
  -v, --version        Show version number.

Built-in Uniforms:
  uniform vec2 u_resolution;  // Viewport resolution (width, height) in pixels.
  uniform float u_time;       // Current time in seconds.

GLSL Requirements (WebGL2):
  - Header: #version 300 es
  - Precision: precision highp float;
  - Input: in vec2 v_uv; (Vertex position in range -1.0 to 1.0)
  - Output: out vec4 fragColor; (instead of using gl_FragColor)
  - Coordinate: vec2 uv = v_uv * u_resolution / min(u_resolution.x, u_resolution.y);

Notes:
  - Textures: Not supported yet (e.g., iChannel0-3 are unavailable).
  - Errors: Shader compilation/link errors are output to the console or browser log.

Example:
  glsl2html samples/basic.frag --out result.html
`);
}

const DEFAULT_VS = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

async function main() {
  try {
    const { values, positionals } = parseArgs({ options, allowPositionals: true });

    if (values.help) {
      showHelp();
      return;
    }
    if (values.version) {
      console.log(pkg.version);
      return;
    }

    if (positionals.length === 0) {
      console.error("Error: Fragment shader path is required.");
      showHelp();
      process.exit(1);
    }

    const width = parseInt(values.width, 10);
    const height = parseInt(values.height, 10);
    const outPath = values.out;

    const vsSource = DEFAULT_VS;
    const fsSource = await readFile(positionals[0], "utf-8");
    const rendererSource = await readFile(join(__dirname, "../src/gl-renderer.mjs"), "utf-8");

    // Generate HTML
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>glsl2html - ${positionals[0]}</title>
  <style>
    body {
      margin: 0;
      height: 100dvh;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #000;
      overflow: hidden;
    }
    canvas {
      aspect-ratio: ${width} / ${height};
      max-width: ${width}px;
      max-height: ${height}px;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  </style>
</head>
<body>
  <canvas id="canvas" width="${width}" height="${height}"></canvas>
  <script type="module">
    ${rendererSource}

    const vs = \`${vsSource.replace(/`/g, "\\`")}\`;
    const fs = \`${fsSource.replace(/`/g, "\\`")}\`;
    
    const result = setupWebGL(vs, fs);
    if (result.error) {
      console.error("WebGL Error:", result.error);
      const msg = document.createElement("div");
      msg.style.color = "red";
      msg.style.position = "absolute";
      msg.style.top = "10px";
      msg.style.left = "10px";
      msg.style.whiteSpace = "pre-wrap";
      msg.textContent = result.error;
      document.body.appendChild(msg);
    } else {
      startLoop();
    }
  </script>
</body>
</html>
`;

    await writeFile(outPath, html, "utf-8");
    console.log(`Successfully generated: ${outPath}`);
  } catch (err) {
    console.error("FATAL:", err.message || err);
    process.exit(1);
  }
}

main();
