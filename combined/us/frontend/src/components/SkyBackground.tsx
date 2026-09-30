import { useEffect, useRef, useState } from "react";
import { RISK_META, type RiskTier } from "@/lib/breathesafe";

type Layer = { id: number; src: string; visible: boolean };

/** Full-bleed atmospheric photo that crossfades when the risk tier changes. */
export function SkyBackground({ tier, className = "" }: { tier: RiskTier; className?: string }) {
  const src = RISK_META[tier].image;
  const [layers, setLayers] = useState<Layer[]>([{ id: 0, src, visible: true }]);
  const counter = useRef(0);
  const currentSrc = useRef(src);

  useEffect(() => {
    if (src === currentSrc.current) return;
    currentSrc.current = src;
    counter.current += 1;
    const id = counter.current;
    setLayers((prev) => [...prev.slice(-1), { id, src, visible: false }]);
    const raf = requestAnimationFrame(() =>
      setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, visible: true } : l))),
    );
    const t = setTimeout(() => setLayers((prev) => prev.filter((l) => l.id === id)), 1100);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [src]);

  return (
    <div className={`absolute inset-0 overflow-hidden bg-[#0b1620] ${className}`}>
      {layers.map((layer) => (
        <div
          key={layer.id}
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-out"
          style={{ backgroundImage: `url(${layer.src})`, opacity: layer.visible ? 1 : 0 }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/15 to-black/55" />
    </div>
  );
}
