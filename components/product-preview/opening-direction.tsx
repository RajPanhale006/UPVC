import type { DoorOpeningDirection, DoorOpeningSide } from "@/lib/cutting/door";

type OpeningDirectionProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  openingSide: DoorOpeningSide;
  openingDirection: DoorOpeningDirection;
  viewFrom?: "inside" | "outside";
  compact?: boolean;
};

/** Directional arc — preview only; does not affect cutting dimensions. */
export function OpeningDirection({
  x,
  y,
  width,
  height,
  openingSide,
  openingDirection,
  viewFrom = "inside",
  compact = false,
}: OpeningDirectionProps) {
  const cx = openingSide === "left" ? x + width * 0.78 : x + width * 0.22;
  const cy = y + height * 0.55;
  const r = Math.min(width, height) * (compact ? 0.18 : 0.22);
  const inward = openingDirection === "inward";
  const flip = viewFrom === "outside" ? -1 : 1;
  const sweep = openingSide === "left" ? (inward ? 1 : 0) : inward ? 0 : 1;
  const startAngle = openingSide === "left" ? 200 : -20;
  const endAngle = startAngle + 70 * flip * (inward ? 1 : -1);

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));

  return (
    <g aria-label={`${openingSide} hand, ${openingDirection} opening`}>
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 0 ${sweep} ${x2} ${y2}`}
        fill="none"
        stroke="#2563EB"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <polygon
        points={`${x2},${y2} ${x2 - 4},${y2 - 2} ${x2 - 2},${y2 - 6}`}
        fill="#2563EB"
      />
    </g>
  );
}
