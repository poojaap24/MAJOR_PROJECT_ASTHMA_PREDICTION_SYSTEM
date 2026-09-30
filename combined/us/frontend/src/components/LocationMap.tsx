import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

type Pin = { lat: number; lon: number } | null;

type Props = {
  pin: Pin;
  onPick: (lat: number, lon: number) => void;
};

// Interactive OpenStreetMap. Click anywhere to drop the pin; the parent
// decides what to do with the coordinates. When the parent changes `pin`
// (city search / My location) the map flies there and moves the marker.
export default function LocationMap({ pin, onPick }: Props) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const onPickRef = useRef(onPick);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  // Create the map once (browser only — Leaflet needs `window`).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !elRef.current || mapRef.current) return;

      leafletRef.current = L;

      const map = L.map(elRef.current, { center: [22.5, 79], zoom: 5, scrollWheelZoom: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      map.on("click", (e) => {
        onPickRef.current(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
      setReady(false);
    };
  }, []);

  // Keep the marker + view in sync with the selected pin.
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!ready || !map || !L || !pin) return;

    const latlng: [number, number] = [pin.lat, pin.lon];

    if (markerRef.current) {
      markerRef.current.setLatLng(latlng);
    } else {
      const icon = L.divIcon({
        className: "",
        html:
          '<div style="width:22px;height:22px;border-radius:50%;background:#f5a623;border:3px solid #fff;' +
          'box-shadow:0 0 0 4px rgba(245,166,35,.35),0 2px 6px rgba(0,0,0,.4)"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      markerRef.current = L.marker(latlng, { icon }).addTo(map);
    }

    map.flyTo(latlng, Math.max(map.getZoom(), 11), { duration: 0.8 });
  }, [pin, ready]);

  return (
    <div
      ref={elRef}
      className="isolate h-80 w-full overflow-hidden rounded-2xl"
      style={{ cursor: "crosshair" }}
      aria-label="Map — click to choose a location"
    />
  );
}