import { memo, useRef, useState, type CSSProperties, type PointerEvent } from "react";

type Point = { x: number; y: number; z: number };
type Face = { path: string; color: string; depth: number };

function surface(u: number, v: number): Point {
  const radius = 142 + 12 * Math.cos(3 * u);
  const tube = 57 + 8 * Math.sin(3 * u);
  const x = (radius + tube * Math.cos(v)) * Math.cos(u);
  const y = (radius + tube * Math.cos(v)) * Math.sin(u);
  const z = tube * Math.sin(v) + 18 * Math.sin(2 * u);
  const yaw = -0.34;
  const pitch = 0.58;
  const roll = -0.52;
  const rx = x * Math.cos(yaw) + z * Math.sin(yaw);
  const rz = -x * Math.sin(yaw) + z * Math.cos(yaw);
  const ry = y * Math.cos(pitch) - rz * Math.sin(pitch);
  return {
    x: rx * Math.cos(roll) - ry * Math.sin(roll),
    y: rx * Math.sin(roll) + ry * Math.cos(roll),
    z: y * Math.sin(pitch) + rz * Math.cos(pitch),
  };
}

function createSculpture(): Face[] {
  const faces: Face[] = [];
  const segments = 96;
  const sides = 40;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < sides; j++) {
      const u = (i / segments) * Math.PI * 2;
      const v = (j / sides) * Math.PI * 2;
      const nextU = ((i + 1) / segments) * Math.PI * 2;
      const nextV = ((j + 1) / sides) * Math.PI * 2;
      const points: [Point, Point, Point, Point] = [
        surface(u, v),
        surface(nextU, v),
        surface(nextU, nextV),
        surface(u, nextV),
      ];
      const a = points[0];
      const b = points[1];
      const d = points[3];
      const nx = (b.y - a.y) * (d.z - a.z) - (b.z - a.z) * (d.y - a.y);
      const ny = (b.z - a.z) * (d.x - a.x) - (b.x - a.x) * (d.z - a.z);
      const nz = (b.x - a.x) * (d.y - a.y) - (b.y - a.y) * (d.x - a.x);
      if (nz <= 0) continue;
      const length = Math.hypot(nx, ny, nz);
      const light = Math.max(0, (-0.38 * nx - 0.66 * ny + 0.65 * nz) / length);
      const rib = i % 2 === 0 ? 1 : 0.94;
      const shade = (0.22 + 0.78 * light) * rib;
      const shine = Math.pow(light, 16) * 55;
      const color = [207, 245, 108]
        .map((channel) => Math.min(255, Math.round(channel * shade + shine)))
        .join(" ");
      faces.push({
        path:
          points
            .map(
              (point, index) =>
                `${index === 0 ? "M" : "L"}${(300 + point.x * 1.23).toFixed(2)},${(292 + point.y * 1.23).toFixed(2)}`,
            )
            .join(" ") + "Z",
        color: `rgb(${color})`,
        depth: points.reduce((total, point) => total + point.z, 0) / 4,
      });
    }
  }
  // Paint back-to-front once; pointer interaction transforms the whole SVG, not its mesh.
  return faces.sort((a, b) => a.depth - b.depth);
}

const faces = createSculpture();

const SculptureMesh = memo(function SculptureMesh() {
  return (
    <svg className="sculpture-mesh" viewBox="0 0 600 600" aria-hidden="true">
      {faces.map((face, index) => (
        <path
          key={index}
          d={face.path}
          fill={face.color}
          stroke={face.color}
          strokeWidth="0.65"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
});

export function ClaritySculpture({ motion }: { motion: boolean }) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const style: CSSProperties & { "--rotation": string } = {
    "--rotation": `${rotation}deg`,
  };

  function tilt(event: PointerEvent<HTMLDivElement>) {
    if (!motion || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    surfaceRef.current?.style.setProperty(
      "--tilt-x",
      `${((event.clientY - bounds.top) / bounds.height - 0.5) * -14}deg`,
    );
    surfaceRef.current?.style.setProperty(
      "--tilt-y",
      `${((event.clientX - bounds.left) / bounds.width - 0.5) * 18}deg`,
    );
  }

  function resetTilt() {
    surfaceRef.current?.style.removeProperty("--tilt-x");
    surfaceRef.current?.style.removeProperty("--tilt-y");
  }

  return (
    <figure className="clarity-object" style={style}>
      <div className="object-topline" aria-hidden="true">
        <span>FIG. 01</span>
        <span>A DIFFERENT POINT OF VIEW</span>
        <span>+</span>
      </div>
      <div className="object-stage" onPointerMove={tilt} onPointerLeave={resetTilt}>
        <div className="object-aura" aria-hidden="true" />
        <div className="object-orbit" aria-hidden="true" />
        <span className="object-coordinate coordinate-top" aria-hidden="true">
          LESS NOISE
        </span>
        <span className="object-coordinate coordinate-bottom" aria-hidden="true">
          MORE SIGNAL
        </span>
        <div className="sculpture-float">
          <div className="sculpture-surface" ref={surfaceRef}>
            <div className="sculpture-turn">
              <SculptureMesh />
            </div>
          </div>
        </div>
        <div className="object-center" aria-hidden="true">
          <span>m</span>
          <span className="object-center-dot">.</span>
        </div>
        <span className="object-caption-tag" aria-hidden="true">
          FROM COMPLEXITY
          <br />
          TO CLARITY.
        </span>
      </div>
      <figcaption id="object-caption">
        <span className="object-caption">
          The clarity object.
          <small>Interactive artwork. Not a benchmark.</small>
        </span>
        <label className="rotation-control">
          <span>CHANGE YOUR PERSPECTIVE</span>
          <input
            type="range"
            min="-30"
            max="30"
            value={rotation}
            aria-label="Rotate the clarity object"
            aria-valuetext={`${rotation} ${Math.abs(rotation) === 1 ? "degree" : "degrees"}`}
            onChange={(event) => setRotation(Number(event.target.value))}
          />
        </label>
      </figcaption>
    </figure>
  );
}
