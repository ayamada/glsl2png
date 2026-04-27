#!/usr/bin/env node

import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { dirname, join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { setupWebGL } from "../src/gl-renderer.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(await readFile(join(__dirname, "../package.json"), "utf-8"));

const options = {
  width: { type: "string", default: "512" },
  height: { type: "string", default: "512" },
  time: { type: "string", multiple: true, default: ["0.0"] },
  "webgl-options": { type: "string", default: "{}" },
  "no-headless": { type: "boolean", default: false },
  out: { type: "string", default: "output.png" },
  help: { type: "boolean", short: "h" },
  version: { type: "boolean", short: "v" },
};

function showHelp() {
  console.log(`
glsl2png v${pkg.version} - Render GLSL shaders to PNG using Puppeteer and WebGL2.

Usage:
  glsl2png [options] <fragment_shader_path>

Options:
  --width <number>     Canvas width (default: 512).
  --height <number>    Canvas height (default: 512).
  --time <number>      Time value to pass as u_time. Can be specified multiple times.
  --out <path>         Output PNG path (default: output.png). Ignored in --no-headless mode.
  --webgl-options <js> JSON string for WebGL context options.
  --no-headless        Launch browser in non-headless mode.
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
  - Errors: Shader compilation/link errors are output to the console for debugging.

Example:
  glsl2png samples/basic.frag --time 1.0 --out result.png
  glsl2png samples/basic.frag --time 0.0 --time 0.5 --time 1.0 --out animation.png
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
  let browser;
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
    const times = values.time.map(t => parseFloat(t));
    const outPath = values.out;
    const isHeadless = !values["no-headless"];
    const webglOptions = JSON.parse(values["webgl-options"]);

    const vsSource = DEFAULT_VS;
    const fsSource = await readFile(positionals[0], "utf-8");

    console.log("Starting glsl2png...");
    browser = await puppeteer.launch({
      headless: isHeadless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height });

    page.on("console", msg => console.log(`[Browser ${msg.type()}] ${msg.text()}`));
    page.on("pageerror", err => console.log(`[Browser Error] ${err.message}`));

    await page.setContent(`<html><body style="margin:0"><canvas id="canvas" width="${width}" height="${height}"></canvas></body></html>`);

    console.log("Initializing WebGL2...");
    const result = await page.evaluate(setupWebGL, vsSource, fsSource, webglOptions);

    if (result.error) {
      console.log("WebGL2 Error:", result.error.replace(/\0/g, ''));
      process.exit(1);
    }

    if (isHeadless) {
      for (let i = 0; i < times.length; i++) {
        await page.evaluate((t) => window.render(t), times[i]);
        const path = times.length > 1 ? outPath.replace(/\.png$/, `_${i}.png`) : outPath;
        await (await page.$("#canvas")).screenshot({ path, omitBackground: true });
        console.log("Saved:", path);
      }
    } else {
      await page.evaluate(() => window.startLoop());
      console.log("Keep-alive: Browser is open. Close the browser window to exit.");
      await new Promise(resolve => browser.on("disconnected", resolve));
    }
  } catch (err) {
    console.log("FATAL:", err.message || err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main();
