import { Cpu } from "lucide-react";
import { trainingCities } from "@/lib/breathesafe";

// Simple equirectangular projection over India's rough bounding box.
const LON_MIN = 68;
const LON_MAX = 97;
const LAT_MIN = 6;
const LAT_MAX = 37;
const W = 380;
const H = 420;

function project(lat: number, lon: number) {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * W;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H;
  return { x, y };
}

// Rough, stylised outline of India (not survey-accurate) used as a backdrop
// so the markers read as "a map" rather than floating in empty space.
const INDIA_OUTLINE =
  "M91.7,40.6 L131.0,40.6 L117.9,94.8 L170.3,94.8 L262.1,135.5 L380,115.2 " +
  "L314.5,176.1 L327.6,203.2 L249.0,243.9 L157.2,298.1 L124.5,392.6 " +
  "L91.7,365.5 L78.6,324.9 L65.5,284.2 L13.1,203.2 L26.2,176.1 L26.2,121.9 Z";

const HUB = { x: 336, y: 372 };

export default function TrainingDataMap() {
  const points = trainingCities.map((c) => ({ ...c, ...project(c.lat, c.lon) }));
  const totalStations = trainingCities.reduce((n, c) => n + c.stations, 0);

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-6">
      <p className="text-sm text-muted-foreground">
        {totalStations} monitoring stations across {trainingCities.length} cities feed real hourly pollutant and
        weather readings into the model during training.
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto mt-5 w-full max-w-sm" role="img" aria-label="Map of India showing training-data cities flowing into the model">
        <path d={INDIA_OUTLINE} className="fill-secondary stroke-border" strokeWidth={1.5} strokeLinejoin="round" />

        {points.map((c, i) => {
          const midX = (c.x + HUB.x) / 2 - (c.y - HUB.y) * 0.12;
          const midY = (c.y + HUB.y) / 2 - (HUB.x - c.x) * 0.12;
          const d = `M${c.x},${c.y} Q${midX},${midY} ${HUB.x},${HUB.y}`;
          const dur = 2.6 + (i % 4) * 0.4;
          const delay = i * 0.35;
          return (
            <g key={c.name}>
              <path d={d} className="stroke-sunset" strokeWidth={1} fill="none" opacity={0.25} />
              <circle r={2.6} className="fill-sunset" style={{ filter: "drop-shadow(0 0 3px var(--primary))" }}>
                <animateMotion path={d} dur={`${dur}s`} begin={`${delay}s`} repeatCount="indefinite" />
                <animate
                  attributeName="opacity"
                  values="0;1;1;0"
                  keyTimes="0;0.1;0.85;1"
                  dur={`${dur}s`}
                  begin={`${delay}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          );
        })}

        {points.map((c) => (
          <g key={c.name}>
            <circle cx={c.x} cy={c.y} r={4} className="fill-sunset stroke-surface" strokeWidth={1.5} />
            <text
              x={c.x + 7}
              y={c.y + 3}
              className="fill-foreground font-sans"
              style={{ fontSize: 9 }}
            >
              {c.name}
            </text>
          </g>
        ))}

        <circle cx={HUB.x} cy={HUB.y} r={16} className="fill-sunset opacity-20" />
        <circle cx={HUB.x} cy={HUB.y} r={11} className="fill-sunset" />
        <foreignObject x={HUB.x - 7} y={HUB.y - 7} width={14} height={14}>
          <Cpu className="h-3.5 w-3.5 text-primary-foreground" />
        </foreignObject>
        <text x={HUB.x} y={HUB.y + 28} textAnchor="middle" className="fill-foreground font-display font-bold" style={{ fontSize: 11 }}>
          CNN-LSTM Model
        </text>
      </svg>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Each pulse represents station readings streaming into training — not a live feed.
      </p>
    </div>
  );
}
