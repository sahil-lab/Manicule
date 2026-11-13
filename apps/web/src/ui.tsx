import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

const shapes = {
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  arrowDown: <path d="M12 4v15m-6-6 6 6 6-6" />,
  arrowUp: <path d="M12 20V5m-6 6 6-6 6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  warning: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5m0 3.4v.1" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
    </>
  ),
  refresh: <path d="M19.5 5v5h-5m5 0a8 8 0 1 0 .3 5.5" />,
  plus: <path d="M5 12h14M12 5v14" />,
  pause: <path d="M8.5 5v14m7-14v14" />,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  brackets: <path d="m8 7-5 5 5 5m8-10 5 5-5 5m-2.5-12-3 14" />,
  database: (
    <>
      <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
      <path d="M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13m-15 6.5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" />
    </>
  ),
  layers: <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9.5 9 5 9-5M3 17l9 5 9-5" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof shapes;

export function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {shapes[name]}
    </svg>
  );
}

/** The brand mark: a manicule, the pointing hand readers drew beside what mattered. */
export function Manicule({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 48 30" fill="currentColor">
      <rect x="0" y="5.5" width="5.5" height="19" rx="1" />
      <path d="M8 7h7.5C16.5 2.6 25.5 2.2 26.6 6.2L27 8.4h16.6a3.6 3.6 0 0 1 0 7.2H30.8h2.6a2.5 2.5 0 0 1 0 5h-1.2h.6a2.3 2.3 0 0 1 0 4.6H12C9.5 25.2 8 24.2 8 22.5Z" />
    </svg>
  );
}

const GRAIN_TILE = 256;

/** Film grain from one small generated tile; a full-screen SVG noise filter costs far more. */
export function Grain() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof CanvasRenderingContext2D === "undefined") return;
    const tile = document.createElement("canvas");
    tile.width = tile.height = GRAIN_TILE;
    const context = tile.getContext("2d");
    if (!context) return;
    const image = context.createImageData(GRAIN_TILE, GRAIN_TILE);
    for (let index = 0; index < image.data.length; index += 4) {
      const shade = Math.random() < 0.5 ? 0 : 255;
      image.data[index] = image.data[index + 1] = image.data[index + 2] = shade;
      image.data[index + 3] = Math.random() * 255;
    }
    context.putImageData(image, 0, 0);
    element.style.backgroundImage = `url(${tile.toDataURL()})`;
  }, []);

  return <div className="grain" ref={ref} aria-hidden="true" />;
}

/** Typed helper for CSS custom properties in React inline styles. */
export function vars(values: Record<`--${string}`, string | number>): CSSProperties {
  return values as CSSProperties;
}

/** Splits a heading into masked lines that slide up when revealed. */
export function Lines({ children }: { children: ReactNode[] }) {
  return (
    <>
      {children.map((line, index) => (
        <span className="line" key={index} style={vars({ "--i": index })}>
          <span className="line-inner">{line}</span>
        </span>
      ))}
    </>
  );
}
