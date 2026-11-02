"use client";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapPoint } from "./ParkMap";

const COLORS = { park: "#3d6b4b", other: "#b5603a", you: "#1e261f" };

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    const b: LatLngBoundsExpression = points.map((p) => [p.lat, p.lng] as [number, number]);
    map.fitBounds(b, { padding: [24, 24] });
  }, [map, points]);
  return null;
}

export default function ParkMapInner({ points, center, zoom = 6, fit }: {
  points: MapPoint[]; center?: [number, number]; zoom?: number; fit?: boolean;
}) {
  const c = center ?? (points[0] ? [points[0].lat, points[0].lng] : [39.5, -98.35]);
  return (
    <MapContainer center={c} zoom={zoom} scrollWheelZoom={false} className="h-full w-full rounded-sm">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {fit && <FitBounds points={points} />}
      {points.map((p, i) => (
        <CircleMarker
          key={i}
          center={[p.lat, p.lng]}
          radius={p.kind === "you" ? 6 : 7}
          pathOptions={{ color: "#fff", weight: 1.5, fillColor: COLORS[p.kind], fillOpacity: 0.9 }}
        >
          <Popup>{p.href ? <a href={p.href}>{p.label}</a> : p.label}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
