"use client";
import dynamic from "next/dynamic";

export interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  href?: string;
  kind: "park" | "other" | "you";
}

const Inner = dynamic(() => import("./ParkMapInner"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-sm bg-paper-2" />,
});

export function ParkMap(props: { points: MapPoint[]; center?: [number, number]; zoom?: number; fit?: boolean }) {
  return <Inner {...props} />;
}
