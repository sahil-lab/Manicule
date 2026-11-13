/**
 * The hero "lens": a ray-marched liquid bead drawn on a transparent WebGL canvas above the
 * headline. Only lens pixels are opaque, so the real DOM text stays crisp everywhere else.
 * Inside the lens the headline is re-drawn from a mask texture and magnified by the bead's
 * surface, which is why the texture must mirror the DOM layout exactly.
 */

export type LensController = {
  /** Settles once the first frame can be drawn; false means the lens will not appear. */
  ready: Promise<boolean>;
  setMotion(enabled: boolean): void;
  destroy(): void;
};

type Context = WebGLRenderingContext | WebGL2RenderingContext;

type Layout = {
  width: number;
  height: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  spanX: number;
  spanY: number;
  radius: number;
};

const VERTEX_SOURCE = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT_SOURCE = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uScale;
uniform float uTime;
uniform float uGlow;
uniform float uBlend;
uniform float uPlane;
uniform vec4 uB0;
uniform vec4 uB1;
uniform vec4 uB2;
uniform vec4 uB3;
uniform vec3 uIor;
uniform vec3 uAcid;
uniform vec3 uInk;
uniform sampler2D uScene;

float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}

float map(vec3 q) {
  float d = length(q - uB0.xyz) - uB0.w;
  d = smin(d, length(q - uB1.xyz) - uB1.w, uBlend);
  d = smin(d, length(q - uB2.xyz) - uB2.w, uBlend);
  d = smin(d, length(q - uB3.xyz) - uB3.w, uBlend);
  d += 0.03 * uGlow * sin(q.x * 2.9 + uTime * 0.83) * sin(q.y * 2.6 - uTime * 0.67)
    * cos(q.z * 2.2 + uTime * 0.51);
  return d;
}

vec3 normalAt(vec3 q) {
  vec2 e = vec2(0.004, -0.004);
  return normalize(
    e.xyy * map(q + e.xyy) + e.yyx * map(q + e.yyx) + e.yxy * map(q + e.yxy)
      + e.xxx * map(q + e.xxx)
  );
}

vec3 sampleScene(vec2 unit) {
  vec2 pixel = unit * uScale + 0.5 * uRes;
  return texture2D(uScene, vec2(pixel.x / uRes.x, 1.0 - pixel.y / uRes.y)).rgb;
}

// One refraction at the front surface, then straight on to the headline plane behind the
// bead. That magnifies the letters; refracting again on the way out would flip them.
float channel(vec3 pos, vec3 n, float ior, float acid, float ink) {
  vec3 bent = refract(vec3(0.0, 0.0, -1.0), n, 1.0 / ior);
  float travel = (pos.z + uPlane) / max(-bent.z, 0.25);
  vec3 scene = sampleScene(pos.xy + bent.xy * travel);
  float base = acid * (1.0 - 0.2 * scene.g) * (1.0 - 0.08 * scene.b);
  return mix(base, ink, scene.r);
}

float roundBox(vec2 p, vec2 size, float radius) {
  vec2 q = abs(p) - size + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uScale;
  float bound = min(
    min(length(p - uB0.xy) - uB0.w, length(p - uB1.xy) - uB1.w),
    min(length(p - uB2.xy) - uB2.w, length(p - uB3.xy) - uB3.w)
  );
  vec3 halo = uAcid * (0.15 * uGlow * exp(-max(bound, 0.0) * 2.6));
  // Blending can swell the surface past each sphere's own outline by up to half uBlend.
  if (bound > uBlend * 0.5 + 0.06) {
    gl_FragColor = vec4(halo, 0.0);
    return;
  }

  vec3 origin = vec3(p, 1.7);
  vec3 ray = vec3(0.0, 0.0, -1.0);
  float travelled = 0.0;
  float nearest = 1000.0;
  float hit = 0.0;
  vec3 pos = origin;
  for (int i = 0; i < 40; i++) {
    pos = origin + ray * travelled;
    float d = map(pos);
    nearest = min(nearest, d);
    if (d < 0.002) {
      hit = 1.0;
      break;
    }
    travelled += d * 0.92;
    if (travelled > 3.6) break;
  }

  float pixel = 1.5 / uScale;
  // Grazing rays converge slowly; a near miss inside the march range still is the surface.
  if (hit < 0.5 && travelled <= 3.6 && map(pos) < 0.03) hit = 1.0;
  float alpha = hit > 0.5 ? 1.0 : 1.0 - smoothstep(0.0, pixel, nearest);
  if (alpha < 0.002) {
    gl_FragColor = vec4(halo, 0.0);
    return;
  }

  vec3 color = uAcid * 0.42;
  if (hit > 0.5) {
    vec3 n = normalAt(pos);
    float facing = clamp(n.z, 0.0, 1.0);

    // Each colour bends by a slightly different amount, which fringes the letter edges.
    vec3 body = vec3(
      channel(pos, n, uIor.x, uAcid.r, uInk.r),
      channel(pos, n, uIor.y, uAcid.g, uInk.g),
      channel(pos, n, uIor.z, uAcid.b, uInk.b)
    );

    vec3 light = normalize(vec3(-0.55, 0.65, 0.55));
    float wrap = dot(n, light) * 0.5 + 0.5;
    body *= mix(0.8, 1.08, wrap);
    body *= mix(1.03, 0.9, clamp(pos.z, 0.0, 1.0));

    float rim = 1.0 - facing;
    float opposite = clamp(dot(n.xy, normalize(vec2(0.55, -0.65))), 0.0, 1.0);
    float crescent = smoothstep(0.3, 0.95, opposite) * smoothstep(0.1, 0.5, rim)
      * (1.0 - smoothstep(0.76, 1.0, rim));
    body += vec3(0.22, 0.1, 0.03) * crescent;
    body *= 1.0 - 0.6 * pow(rim, 2.6) * (1.0 - 0.7 * crescent);

    vec3 halfway = normalize(light + vec3(0.0, 0.0, 1.0));
    float gloss = max(dot(n, halfway), 0.0);
    float window = 1.0 - smoothstep(0.0, 0.035,
      roundBox(n.xy - vec2(-0.34, 0.4), vec2(0.14, 0.085), 0.05));
    float edgeLight = pow(rim, 4.0) * clamp(dot(normalize(n.xy + 0.0001),
      normalize(vec2(0.75, -0.55))), 0.0, 1.0);
    color = body + vec3(1.0) * (pow(gloss, 150.0) * 0.9 + pow(gloss, 16.0) * 0.14
      + window * 0.34) + vec3(0.95, 1.0, 0.8) * edgeLight * 0.5;
  }

  color = clamp(color, 0.0, 1.0);
  gl_FragColor = vec4(color * alpha + halo * (1.0 - alpha), alpha);
}
`;

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i;
const ACID = [0.792, 0.965, 0.227] as const;
const INK = [0.043, 0.047, 0.039] as const;
const QUALITY_STEPS = [1, 0.8, 0.64, 0.5] as const;
const MAX_PIXEL_RATIO = 1.5;
const BLEND = 0.65;
// Distance from the bead's centre to the headline plane, in bead radii. Close enough that
// the image magnifies without folding back on itself near the rim.
const PLANE = 0.45;
// The lens arrives once the headline lines have finished sliding into place (1.74 s).
const INTRO_DELAY_MS = 1800;
const INTRO_MS = 1500;
const POINTER_IDLE_MS = 3500;
// The pose drawn when motion is off: over the end of the headline, across its two lines.
const STILL_TIME = 3.79;
// Roughly how long the preloader and entrance run, so the lens arrives near that pose.
const INTRO_SECONDS = 5.2;
const MASK_PIXEL_BUDGET = 6_000_000;
const SAMPLE_FRAMES = 24;
const SLOW_FRAME_MS = 24;
const POLL_MS = 16;
// The fence only smooths the first frame, so a GPU that never reports is not waited for.
const FENCE_LIMIT_MS = 4000;
const WARM_PIXELS = 8;
const CONTEXT_OPTIONS: WebGLContextAttributes = {
  alpha: true,
  premultipliedAlpha: true,
  antialias: false,
  depth: false,
  stencil: false,
  powerPreference: "high-performance",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function overshoot(value: number): number {
  const back = 1.70158;
  const shifted = value - 1;
  return 1 + (back + 1) * shifted * shifted * shifted + back * shifted * shifted;
}

function stretchKeyword(value: string): CanvasFontStretch {
  const percent = Number.parseFloat(value);
  if (!Number.isFinite(percent)) return "normal";
  if (percent <= 56) return "ultra-condensed";
  if (percent <= 68) return "extra-condensed";
  if (percent <= 81) return "condensed";
  if (percent <= 93) return "semi-condensed";
  if (percent <= 106) return "normal";
  if (percent <= 118) return "semi-expanded";
  if (percent <= 137) return "expanded";
  if (percent <= 175) return "extra-expanded";
  return "ultra-expanded";
}

/** WebGL 2 runs the same shader and adds fences, which report when the GPU has caught up. */
function getContext(canvas: HTMLCanvasElement): Context | null {
  return (
    canvas.getContext("webgl2", CONTEXT_OPTIONS) ??
    canvas.getContext("webgl", CONTEXT_OPTIONS)
  );
}

/**
 * Starts compiling and linking without asking how it went. Any status query blocks until
 * the driver has finished, which on a cold shader cache can take seconds.
 */
function startProgram(gl: Context): WebGLProgram | null {
  const program = gl.createProgram();
  const vertex = gl.createShader(gl.VERTEX_SHADER);
  const fragment = gl.createShader(gl.FRAGMENT_SHADER);
  if (program && vertex && fragment) {
    gl.shaderSource(vertex, VERTEX_SOURCE);
    gl.shaderSource(fragment, FRAGMENT_SOURCE);
    gl.compileShader(vertex);
    gl.compileShader(fragment);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, "aPosition");
    gl.linkProgram(program);
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (program && vertex && fragment) return program;
  gl.deleteProgram(program);
  return null;
}

function usesSoftwareRenderer(gl: Context): boolean {
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  const name: unknown = gl.getParameter(
    info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER,
  );
  return SOFTWARE_RENDERER.test(String(name));
}

/** Returns null when WebGL is unavailable; the hero then keeps its CSS fallback. */
export function createLens(
  canvas: HTMLCanvasElement,
  hero: HTMLElement,
  initialMotion: boolean,
): LensController | null {
  if (typeof WebGLRenderingContext === "undefined") return null;
  const gl = getContext(canvas);
  const scene = document.createElement("canvas");
  const context = scene.getContext("2d");
  if (!gl || !context || gl.isContextLost()) return null;
  // The mask must be typeset exactly like the headline, which needs these canvas features.
  if (!("letterSpacing" in context) || !("fontStretch" in context)) return null;
  // A CPU rasteriser cannot hold a frame rate here; "?lens=software" opts in for captures.
  const softwareAllowed =
    new URLSearchParams(window.location.search).get("lens") === "software";
  if (!softwareAllowed && usesSoftwareRenderer(gl)) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  }

  const texts = Array.from(hero.querySelectorAll<HTMLElement>("[data-lens-text]"));
  const grid = hero.querySelector<HTMLElement>(".hero-grid");
  const root = document.documentElement;
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  const fences =
    typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext
      ? gl
      : null;

  let settle: (usable: boolean) => void = () => undefined;
  const ready = new Promise<boolean>((resolve) => {
    settle = resolve;
  });
  let linking: WebGLProgram | null = null;
  let fence: WebGLSync | null = null;
  let fenceAt = 0;
  let pollTimer = 0;
  let usable = false;
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let texture: WebGLTexture | null = null;
  let uniforms: Record<string, WebGLUniformLocation | null> = {};
  let layout: Layout | null = null;
  let motion = initialMotion;
  let lost = false;
  let blank = true;
  let handle = 0;
  let repaintTimer = 0;
  const timers: number[] = [];
  let previous = 0;
  let clock = STILL_TIME - INTRO_SECONDS;
  let introAt = -1;
  let growAt = -1;
  let introPainted = false;
  let quality = 0;
  let sampleStart = 0;
  let sampleFrames = 0;
  let slowSamples = 0;
  let dropSize = 0;
  const pointer = { x: 0, y: 0, active: false, movedAt: 0 };
  const body = { x: 0, y: 0 };
  const drop = { x: 0, y: 0 };

  /** Runs once the program has linked: everything the first frame needs. */
  const configure = (linked: WebGLProgram): boolean => {
    if (!gl.getProgramParameter(linked, gl.LINK_STATUS)) return false;
    buffer = gl.createBuffer();
    texture = gl.createTexture();
    if (!buffer || !texture) return false;
    program = linked;
    gl.useProgram(linked);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    uniforms = {};
    for (const name of [
      "uRes",
      "uScale",
      "uTime",
      "uGlow",
      "uBlend",
      "uPlane",
      "uB0",
      "uB1",
      "uB2",
      "uB3",
      "uIor",
      "uAcid",
      "uInk",
      "uScene",
    ]) {
      uniforms[name] = gl.getUniformLocation(linked, name);
    }
    gl.uniform1i(uniforms.uScene ?? null, 0);
    gl.uniform1f(uniforms.uBlend ?? null, BLEND);
    gl.uniform1f(uniforms.uPlane ?? null, PLANE);
    // The spread between the three channels is what fringes the letter edges.
    gl.uniform3f(uniforms.uIor ?? null, 1.28, 1.3, 1.32);
    gl.uniform3f(uniforms.uAcid ?? null, ACID[0], ACID[1], ACID[2]);
    gl.uniform3f(uniforms.uInk ?? null, INK[0], INK[1], INK[2]);
    return true;
  };

  const resize = () => {
    const step = QUALITY_STEPS[quality] ?? 1;
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO) * step;
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
  };

  /** Mirrors the headline into a mask: red = text, green = grid, blue = fine grid. */
  const paintScene = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (lost || !texture || !width || !height) return;
    const box = canvas.getBoundingClientRect();
    const scaleX = box.width ? width / box.width : 1;
    const scaleY = box.height ? height / box.height : 1;
    const limit = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 2048;
    // The lens magnifies the mask, so it is kept sharper than the screen where affordable.
    const ratio = Math.min(
      Math.max(window.devicePixelRatio || 1, 2),
      Math.sqrt(MASK_PIXEL_BUDGET / (width * height)),
      limit / width,
      limit / height,
    );
    scene.width = Math.max(1, Math.round(width * ratio));
    scene.height = Math.max(1, Math.round(height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.globalCompositeOperation = "source-over";
    context.fillStyle = "#000";
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = "lighter";

    const cell = grid ? Number.parseFloat(getComputedStyle(grid).backgroundSize) : 0;
    if (cell >= 8) {
      // Lines start one cell in, so clamped edge samples stay clear of them.
      context.fillStyle = "rgb(0 0 255)";
      for (let x = cell / 4; x < width; x += cell / 4)
        context.fillRect(x, 0, 0.6, height);
      for (let y = cell / 4; y < height; y += cell / 4)
        context.fillRect(0, y, width, 0.6);
      context.fillStyle = "rgb(0 255 0)";
      for (let x = cell; x < width; x += cell) context.fillRect(x, 0, 1, height);
      for (let y = cell; y < height; y += cell) context.fillRect(0, y, width, 1);
    }

    context.fillStyle = "rgb(255 0 0)";
    context.textBaseline = "alphabetic";
    context.fontKerning = "normal";
    context.textRendering = "optimizeLegibility";
    let left = Infinity;
    let top = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const element of texts) {
      const text = element.textContent ?? "";
      const range = document.createRange();
      range.selectNodeContents(element);
      const rect = range.getBoundingClientRect();
      if (!text || !rect.width) continue;
      const style = getComputedStyle(element);
      const x = (rect.left - box.left) * scaleX;
      const y = (rect.top - box.top) * scaleY;
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      context.fontStretch = stretchKeyword(style.fontStretch);
      context.letterSpacing =
        style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
      context.fillText(text, x, y + context.measureText(text).fontBoundingBoxAscent);
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x + rect.width * scaleX);
      bottom = Math.max(bottom, y + rect.height * scaleY);
    }
    if (!Number.isFinite(left)) return;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);
    const first = layout === null;
    layout = {
      width,
      height,
      top,
      bottom,
      centerX: (left + right) / 2,
      centerY: (top + bottom) / 2,
      spanX: right - left,
      spanY: bottom - top,
      radius: clamp((bottom - top) * 0.3, 48, Math.min(width, height) * 0.2),
    };
    if (first) {
      const home = homeAt(clock, layout);
      body.x = drop.x = home.x;
      body.y = drop.y = home.y;
    }
    if (!motion) drawStill();
  };

  const schedulePaint = () => {
    window.clearTimeout(repaintTimer);
    repaintTimer = window.setTimeout(() => {
      resize();
      paintScene();
    }, 90);
  };

  // The bead stays over the headline, clear of the copy and controls beneath it.
  const homeAt = (seconds: number, current: Layout) => ({
    x: current.centerX + Math.sin(seconds * 0.23 + 0.7) * current.spanX * 0.3,
    y: current.centerY + (Math.sin(seconds * 0.31) * 0.08 - 0.05) * current.spanY,
  });

  const draw = (seconds: number, grow: number) => {
    if (lost || !layout || !program) return;
    const ratio = canvas.width / layout.width;
    const unit = layout.radius * ratio;
    const ball = (name: string, x: number, y: number, z: number, radius: number) => {
      gl.uniform4f(
        uniforms[name] ?? null,
        (x * ratio - canvas.width / 2) / unit,
        (canvas.height / 2 - y * ratio) / unit,
        z,
        radius,
      );
    };
    const reach = layout.radius * grow;
    const first = seconds * 0.5;
    const second = 2.2 - seconds * 0.36;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    blank = false;
    gl.uniform2f(uniforms.uRes ?? null, canvas.width, canvas.height);
    gl.uniform1f(uniforms.uScale ?? null, unit);
    gl.uniform1f(uniforms.uTime ?? null, seconds);
    gl.uniform1f(uniforms.uGlow ?? null, clamp(grow, 0, 1));
    // Every length follows the entrance, so the bead swells from a point. With a fixed
    // blend radius its first frame was already a third of the final size.
    gl.uniform1f(uniforms.uBlend ?? null, Math.max(0.001, BLEND * grow));
    ball("uB0", body.x, body.y, 0, grow);
    ball(
      "uB1",
      body.x + Math.cos(first) * reach * 0.9,
      body.y + Math.sin(first) * reach * 0.6,
      Math.sin(seconds * 0.41) * 0.3 * grow,
      0.52 * grow,
    );
    ball(
      "uB2",
      body.x + Math.cos(second) * reach * 1.15,
      body.y + Math.sin(second) * reach * 0.7,
      Math.cos(seconds * 0.37) * 0.25 * grow,
      0.38 * grow,
    );
    ball("uB3", drop.x, drop.y, 0.1 * grow, 0.5 * dropSize * grow);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  /** One full-quality frame for paused or reduced motion. */
  const drawStill = () => {
    if (!layout) return;
    const home = homeAt(STILL_TIME, layout);
    body.x = drop.x = home.x;
    body.y = drop.y = home.y;
    dropSize = 0;
    draw(STILL_TIME, 1);
  };

  /**
   * Draws a few pixels and discards them within the same task, so nothing is shown. A
   * driver finishes building its pipeline on the first draw; this moves that pause behind
   * the preloader instead of leaving it for the frame in which the bead appears.
   */
  const warmUp = () => {
    if (lost || !program) return;
    gl.viewport(0, 0, WARM_PIXELS, WARM_PIXELS);
    gl.uniform2f(uniforms.uRes ?? null, WARM_PIXELS, WARM_PIXELS);
    gl.uniform1f(uniforms.uScale ?? null, WARM_PIXELS / 2);
    gl.uniform1f(uniforms.uTime ?? null, 0);
    gl.uniform1f(uniforms.uGlow ?? null, 1);
    for (const name of ["uB0", "uB1", "uB2", "uB3"]) {
      gl.uniform4f(uniforms[name] ?? null, 0, 0, 0, 0.6);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.clear(gl.COLOR_BUFFER_BIT);
    blank = true;
  };

  const frame = (now: number) => {
    handle = requestAnimationFrame(frame);
    const elapsed = previous ? now - previous : 16;
    previous = now;
    const delta = Math.min(0.05, elapsed / 1000);
    clock += delta;
    if (introAt < 0 && root.classList.contains("is-loaded")) introAt = now;
    if (!layout || !usable) return;
    // The bead waits for the headline to settle, and for itself if linking took longer.
    if (introAt >= 0 && growAt < 0) growAt = Math.max(introAt + INTRO_DELAY_MS, now);
    const intro = growAt < 0 ? 0 : clamp((now - growAt) / INTRO_MS, 0, 1);
    if (intro > 0 && !introPainted) {
      // The mask was first painted while the headline was still off-stage. Mirror where it
      // settled before anything is drawn, and once more in case its entrance ran late.
      introPainted = true;
      paintScene();
      timers.push(window.setTimeout(paintScene, 700));
    }
    if (pointer.active && now - pointer.movedAt > POINTER_IDLE_MS) pointer.active = false;

    const home = homeAt(clock, layout);
    if (blank) {
      // Nothing is on screen, so the bead simply waits where it will next appear.
      body.x = drop.x = home.x;
      body.y = drop.y = home.y;
    }
    const follow = pointer.active ? 0.5 : 0;
    const ease = 1 - Math.exp(-delta * 2.6);
    body.x += (home.x + (pointer.x - home.x) * follow - body.x) * ease;
    body.y += (home.y + (pointer.y - home.y) * follow - body.y) * ease;
    const chase = 1 - Math.exp(-delta * (pointer.active ? 12 : 3.5));
    drop.x += ((pointer.active ? pointer.x : body.x) - drop.x) * chase;
    drop.y += ((pointer.active ? pointer.y : body.y) - drop.y) * chase;
    dropSize += ((pointer.active ? 1 : 0) - dropSize) * (1 - Math.exp(-delta * 5));

    const covered = clamp(window.scrollY / Math.max(1, hero.offsetHeight), 0, 1);
    if (intro <= 0 || covered > 0.97) {
      if (!blank) gl.clear(gl.COLOR_BUFFER_BIT);
      blank = true;
      sampleStart = 0;
      return;
    }
    draw(clock, overshoot(intro) * (1 - 0.3 * covered));

    // Trade resolution for frame rate when the GPU cannot keep up; one hitch is ignored.
    if (!sampleStart) {
      sampleStart = now;
      sampleFrames = 0;
    } else if (++sampleFrames >= SAMPLE_FRAMES) {
      const average = (now - sampleStart) / sampleFrames;
      canvas.dataset.frameMs = average.toFixed(1);
      slowSamples = average > SLOW_FRAME_MS ? slowSamples + 1 : 0;
      const last = QUALITY_STEPS.length - 1;
      if (quality < last && (slowSamples >= 2 || average > SLOW_FRAME_MS * 2)) {
        quality = Math.min(last, quality + (average > SLOW_FRAME_MS * 2 ? 2 : 1));
        slowSamples = 0;
        resize();
      }
      sampleStart = now;
      sampleFrames = 0;
    }
  };

  const start = () => {
    if (handle || lost) return;
    previous = 0;
    sampleStart = 0;
    handle = requestAnimationFrame(frame);
  };

  const stop = () => {
    cancelAnimationFrame(handle);
    handle = 0;
  };

  const pollFence = () => {
    pollTimer = 0;
    if (lost) return;
    if (fences && fence) {
      const waiting =
        fences.getSyncParameter(fence, fences.SYNC_STATUS) !== fences.SIGNALED &&
        performance.now() - fenceAt < FENCE_LIMIT_MS;
      if (waiting) {
        pollTimer = window.setTimeout(pollFence, POLL_MS);
        return;
      }
      fences.deleteSync(fence);
      fence = null;
    }
    usable = true;
    settle(true);
  };

  const pollLink = () => {
    pollTimer = 0;
    if (lost || !linking) return;
    // With the extension the link finishes off the main thread and is polled; without it
    // the status query below simply blocks, as it always did.
    if (parallel && !gl.getProgramParameter(linking, parallel.COMPLETION_STATUS_KHR)) {
      pollTimer = window.setTimeout(pollLink, POLL_MS);
      return;
    }
    const linked = linking;
    linking = null;
    if (!configure(linked)) {
      gl.deleteProgram(linked);
      release();
      return;
    }
    resize();
    paintScene();
    if (motion) warmUp();
    if (fences) {
      fence = fences.fenceSync(fences.SYNC_GPU_COMMANDS_COMPLETE, 0);
      fenceAt = performance.now();
      fences.flush();
    }
    // A fence can only become signalled between tasks, so the first look is a later one.
    pollTimer = window.setTimeout(pollFence, fence ? POLL_MS : 0);
  };

  const launch = () => {
    linking = startProgram(gl);
    if (!linking) {
      release();
      return;
    }
    pollLink();
    if (motion) start();
  };

  const onPointerMove = (event: PointerEvent) => {
    const box = canvas.getBoundingClientRect();
    if (!layout || !box.width || !box.height) return;
    const x = ((event.clientX - box.left) / box.width) * canvas.clientWidth;
    const y = ((event.clientY - box.top) / box.height) * canvas.clientHeight;
    // The bead only reaches for the pointer around the headline, never over the controls.
    const inside =
      x >= 0 &&
      x <= canvas.clientWidth &&
      y >= Math.max(0, layout.top - layout.spanY * 0.12) &&
      y <= layout.bottom + layout.spanY * 0.04;
    pointer.active = inside;
    if (!inside) return;
    pointer.x = x;
    pointer.y = y;
    pointer.movedAt = performance.now();
  };
  const onPointerEnd = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") pointer.active = false;
  };
  const onPointerOut = () => {
    pointer.active = false;
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    usable = false;
    stop();
    window.clearTimeout(pollTimer);
    // Everything made by the lost context is gone with it.
    linking = null;
    fence = null;
    program = null;
    buffer = null;
    texture = null;
  };
  const onContextRestored = () => {
    lost = false;
    launch();
  };

  const observer = new ResizeObserver(schedulePaint);
  observer.observe(canvas);
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerup", onPointerEnd, { passive: true });
  window.addEventListener("pointercancel", onPointerEnd, { passive: true });
  root.addEventListener("pointerleave", onPointerOut);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  document.fonts.addEventListener("loadingdone", schedulePaint);
  void document.fonts.ready.then(schedulePaint);

  /** Lets go of everything, whether the page is done with the lens or it cannot work. */
  const release = () => {
    stop();
    lost = true;
    usable = false;
    settle(false);
    window.clearTimeout(pollTimer);
    window.clearTimeout(repaintTimer);
    for (const timer of timers) window.clearTimeout(timer);
    observer.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerEnd);
    window.removeEventListener("pointercancel", onPointerEnd);
    root.removeEventListener("pointerleave", onPointerOut);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    canvas.removeEventListener("webglcontextrestored", onContextRestored);
    document.fonts.removeEventListener("loadingdone", schedulePaint);
    if (fences && fence) fences.deleteSync(fence);
    gl.deleteTexture(texture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(linking);
    gl.deleteProgram(program);
    fence = linking = program = buffer = texture = null;
  };

  resize();
  launch();

  return {
    ready,
    setMotion(enabled) {
      if (motion === enabled) return;
      motion = enabled;
      if (enabled) {
        // Switched on after the page has loaded: there is no entrance left to wait for.
        if (growAt < 0 && root.classList.contains("is-loaded")) {
          introAt = performance.now();
          growAt = introAt - INTRO_MS;
        }
        start();
        return;
      }
      stop();
      quality = 0;
      resize();
      drawStill();
    },
    destroy: release,
  };
}
