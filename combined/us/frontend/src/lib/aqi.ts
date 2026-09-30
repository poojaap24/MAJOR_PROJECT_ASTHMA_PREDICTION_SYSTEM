// EPA PM2.5 -> AQI conversion (real breakpoint formula).
// Source: US EPA AQI technical spec (40 CFR Part 58, Appendix G).

const BREAKPOINTS: [number, number, number, number][] = [
  [0.0, 12.0, 0, 50],
  [12.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 150.4, 151, 200],
  [150.5, 250.4, 201, 300],
  [250.5, 350.4, 301, 400],
  [350.5, 500.4, 401, 500],
];

export function pm25ToAqi(pm25: number): number {
  const c = Math.max(0, Number(pm25) || 0);

  const top = BREAKPOINTS[BREAKPOINTS.length - 1]!;
  if (c > top[1]) {
    const [cLow, cHigh, aqiLow, aqiHigh] = top;
    return Math.round(((aqiHigh - aqiLow) / (cHigh - cLow)) * (c - cLow) + aqiLow);
  }

  for (const [cLow, cHigh, aqiLow, aqiHigh] of BREAKPOINTS) {
    if (c >= cLow && c <= cHigh) {
      return Math.round(((aqiHigh - aqiLow) / (cHigh - cLow)) * (c - cLow) + aqiLow);
    }
  }
  return 0;
}

// Backend returns "LOW" | "MODERATE" | "HIGH" | "VERY HIGH" — map onto
// the tier keys the Lovable UI already uses for coloring/badges.
export const BACKEND_RISK_MAP: Record<string, "safe" | "moderate" | "high" | "severe"> = {
  LOW: "safe",
  MODERATE: "moderate",
  HIGH: "high",
  "VERY HIGH": "severe",
};
