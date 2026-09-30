import { useEffect, useRef, useState } from "react";
import { Radio } from "lucide-react";

type Reading = { location: string; parameter: string; value: number; unit: string; time: string };

const PARAM_LABEL: Record<string, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
  co: "CO",
  no2: "NO₂",
  so2: "SO₂",
  o3: "O₃",
};

// A curated sample of real rows from backend/master_dataset.csv (the model's
// actual training data) — not a live sensor feed. Cycled here to show the
// *volume and continuity* of readings the model trains on, the way a
// timeline shows a continuous stream of posts.
const FEED: Reading[] = [
  { location: "Worli, Mumbai", parameter: "pm10", value: 36.0, unit: "µg/m³", time: "14:15" },
  { location: "Bandra Kurla Complex, Mumbai", parameter: "so2", value: 7.11, unit: "ppb", time: "19:15" },
  { location: "BTM Layout, Bengaluru", parameter: "o3", value: 18.33, unit: "µg/m³", time: "10:00" },
  { location: "Worli, Mumbai", parameter: "pm25", value: 27.0, unit: "µg/m³", time: "06:45" },
  { location: "Lalbagh, Lucknow", parameter: "pm25", value: 90.9, unit: "µg/m³", time: "06:45" },
  { location: "Kodungaiyur, Chennai", parameter: "o3", value: 29.33, unit: "µg/m³", time: "05:27" },
  { location: "Kadri, Mangalore", parameter: "o3", value: 49.19, unit: "µg/m³", time: "18:45" },
  { location: "Ballygunge, Kolkata", parameter: "no2", value: 32.3, unit: "ppb", time: "05:30" },
  { location: "Nehru Nagar, Kanpur", parameter: "pm25", value: 119.0, unit: "µg/m³", time: "05:00" },
  { location: "Zoo Park, Hyderabad", parameter: "pm10", value: 125.0, unit: "µg/m³", time: "04:45" },
  { location: "Kodungaiyur, Chennai", parameter: "pm10", value: 85.17, unit: "µg/m³", time: "17:00" },
  { location: "Kukrail Picnic Spot-1, Lucknow", parameter: "pm10", value: 60.3, unit: "µg/m³", time: "08:45" },
  { location: "Kadri, Mangalore", parameter: "pm10", value: 47.1, unit: "µg/m³", time: "14:45" },
  { location: "Bandra Kurla Complex, Mumbai", parameter: "pm10", value: 205.3, unit: "µg/m³", time: "10:15" },
  { location: "Lalbagh, Lucknow", parameter: "co", value: 1.276, unit: "ppb", time: "06:30" },
  { location: "Vijay Nagar, Ramanagara", parameter: "pm25", value: 37.0, unit: "µg/m³", time: "16:15" },
  { location: "Kukrail Picnic Spot-1, Lucknow", parameter: "o3", value: 25.13, unit: "µg/m³", time: "13:45" },
  { location: "Kodungaiyur, Chennai", parameter: "no2", value: 13.39, unit: "ppb", time: "14:44" },
  { location: "R K Puram, Delhi", parameter: "so2", value: 27.4, unit: "ppb", time: "01:15" },
  { location: "Borivali East, Mumbai", parameter: "pm25", value: 51.95, unit: "µg/m³", time: "15:15" },
  { location: "NSI Kalyanpur, Kanpur", parameter: "o3", value: 15.2, unit: "µg/m³", time: "19:00" },
  { location: "NSI Kalyanpur, Kanpur", parameter: "no2", value: 17.67, unit: "ppb", time: "21:15" },
  { location: "R K Puram, Delhi", parameter: "o3", value: 8.2, unit: "µg/m³", time: "18:45" },
  { location: "Manali, Chennai", parameter: "co", value: 0.225, unit: "ppb", time: "11:30" },
  { location: "Ballygunge, Kolkata", parameter: "pm10", value: 220.6, unit: "µg/m³", time: "09:30" },
  { location: "Anand Vihar, New Delhi", parameter: "o3", value: 9.2, unit: "µg/m³", time: "06:15" },
];

const VISIBLE_COUNT = 6;
const INTERVAL_MS = 1500;

export default function DataStreamFeed() {
  const [items, setItems] = useState<{ key: number; reading: Reading }[]>(() =>
    FEED.slice(0, VISIBLE_COUNT).map((reading, i) => ({ key: i, reading })),
  );
  const cursor = useRef(VISIBLE_COUNT % FEED.length);
  const nextKey = useRef(VISIBLE_COUNT);

  useEffect(() => {
    const id = setInterval(() => {
      const reading = FEED[cursor.current] as Reading;
      cursor.current = (cursor.current + 1) % FEED.length;
      const key = nextKey.current++;
      setItems((prev) => [{ key, reading }, ...prev].slice(0, VISIBLE_COUNT));
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto flex h-full max-w-md flex-col rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sunset text-primary-foreground">
          <Radio className="h-3.5 w-3.5" />
        </span>
        <p className="text-sm font-semibold">Training data, row by row</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Real rows from the training set, replayed here as a stream to show volume — not a live sensor feed.
      </p>

      <div className="relative mt-4 flex-1 space-y-2 overflow-hidden">
        {items.map(({ key, reading }) => (
          <div
            key={key}
            className="enter-up flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{reading.location}</p>
              <p className="text-xs text-muted-foreground">
                {PARAM_LABEL[reading.parameter] ?? reading.parameter} · {reading.value.toLocaleString()} {reading.unit}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{reading.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
