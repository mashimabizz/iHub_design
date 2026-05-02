"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Leaflet ベースの地図ピッカー（クライアント専用）。
 *
 * - OpenStreetMap の標準タイルを使用
 * - center / radiusM を props として受け取り、変更を onChange で通知
 * - マーカードラッグ・地図クリックで center 更新
 * - iHub ブランドカラーの DivIcon ピン
 */

type Props = {
  center: [number, number]; // [lat, lng]
  radiusM: number;
  onCenterChange: (lat: number, lng: number) => void;
  className?: string;
};

// iHub lavender pin（DivIcon で完全カスタム）
const pinIcon = L.divIcon({
  className: "ihub-pin",
  html: `
    <div style="
      position: relative;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #a695d8;
      box-shadow: 0 0 0 5px #fff, 0 6px 14px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 9px;
        height: 9px;
        background: #fff;
        border-radius: 50%;
      "></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

/**
 * 地図クリック・地図ドラッグ後の center 通知用の inner component。
 * react-leaflet の hooks は MapContainer の中でしか使えない。
 */
function MapEventHandler({
  onCenterChange,
}: {
  onCenterChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onCenterChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * 外部から center が変わった時にビューを追従させる。
 */
function FlyToCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [map, center]);
  return null;
}

export default function MapPicker({
  center,
  radiusM,
  onCenterChange,
  className,
}: Props) {
  const markerRef = useRef<L.Marker | null>(null);

  // Marker drag end handler
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const m = markerRef.current;
        if (m) {
          const p = m.getLatLng();
          onCenterChange(p.lat, p.lng);
        }
      },
    }),
    [onCenterChange],
  );

  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={15}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <Circle
          center={center}
          radius={radiusM}
          pathOptions={{
            color: "#a695d8",
            fillColor: "#a695d8",
            fillOpacity: 0.15,
            weight: 2,
          }}
        />
        <Marker
          position={center}
          draggable
          icon={pinIcon}
          eventHandlers={eventHandlers}
          ref={markerRef}
        />
        <MapEventHandler onCenterChange={onCenterChange} />
        <FlyToCenter center={center} />
      </MapContainer>
    </div>
  );
}
