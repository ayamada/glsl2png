/**
 * Initializes WebGL2 context and compiles shaders.
 * This function is intended to be run in a browser environment.
 * @param {string} vs - Vertex shader source.
 * @param {string} fs - Fragment shader source.
 * @param {object} opt - WebGL context options.
 * @returns {object} - Status and error message if any.
 */
export function setupWebGL(vs, fs, opt = {}) {
  const canvas = document.getElementById("canvas");
  if (!canvas) return { error: "Canvas element not found" };

  const gl = canvas.getContext("webgl2", opt);
  if (!gl) return { error: "WebGL2 not supported" };

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return { error: gl.getShaderInfoLog(s) };
    return { shader: s };
  }

  const vsRes = compile(gl.VERTEX_SHADER, vs);
  if (vsRes.error) return { error: "in vertexShaderSource: \n" + vsRes.error };
  const fsRes = compile(gl.FRAGMENT_SHADER, fs);
  if (fsRes.error) return { error: "in fragmentShaderSource: \n" + fsRes.error };

  const prog = gl.createProgram();
  gl.attachShader(prog, vsRes.shader);
  gl.attachShader(prog, fsRes.shader);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return { error: "Link: " + gl.getProgramInfoLog(prog) };

  // Prepare locations
  const locations = {
    position: gl.getAttribLocation(prog, "a_position"),
    resolution: gl.getUniformLocation(prog, "u_resolution"),
    time: gl.getUniformLocation(prog, "u_time"),
  };

  // Buffer setup (full-screen quad)
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, 1, 1, 1, -1, -1, 1, -1]), gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(locations.position);
  gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);

  /**
   * Renders a single frame.
   * @param {number} time - Current time in seconds.
   */
  const render = (time) => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog);
    gl.bindVertexArray(vao);

    // Set standard uniforms
    if (locations.resolution) gl.uniform2f(locations.resolution, canvas.width, canvas.height);
    if (locations.time) gl.uniform1f(locations.time, time);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  /**
   * Starts an animation loop using requestAnimationFrame.
   */
  const startLoop = () => {
    const startTime = performance.now();
    const loop = (now) => {
      render((now - startTime) / 1000);
      window._loopId = requestAnimationFrame(loop);
    };
    window._loopId = requestAnimationFrame(loop);
  };

  // Expose to window for external control (like Puppeteer)
  window.render = render;
  window.startLoop = startLoop;

  return { ok: true };
}
