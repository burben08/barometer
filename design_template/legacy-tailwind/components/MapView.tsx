import React, { useEffect, useRef } from 'react';

/**
 * Leaflet map wrapper — the centerpiece of a geolocation game. Loads
 * Leaflet from a CDN at runtime (drop-in, no bundler config needed); swap
 * for `import L from 'leaflet'` if your project already bundles it.
 *
 * Markers use a teardrop pin shape with a hard border + offset shadow so
 * they read as part of the same UI language as every card and button.
 * The current-location dot uses the `.pulse-ring` utility from tokens.css.
 */

declare global {
  interface Window {
    L: any;
  }
}

const injectLeafletCSS = () => {
  if (document.getElementById('leaflet-css')) return;
  const link = document.createElement('link');
  link.id = 'leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  link.crossOrigin = '';
  document.head.appendChild(link);
};

const loadLeaflet = async () => {
  injectLeafletCSS();
  if (!window.L) {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    document.head.appendChild(script);
    await new Promise((resolve) => {
      script.onload = resolve;
    });
  }
};

/** Teardrop pin factory. Pass any brand/pastel color to match a category or activity type. */
export const createPinIcon = (L: any, color = '#FF6B6B', size = 32) =>
  L.divIcon({
    className: 'custom-pin',
    html: `<div style="
      background-color: ${color};
      border: 3px solid rgb(var(--color-border));
      border-radius: 50% 50% 50% 0;
      width: ${size}px;
      height: ${size}px;
      transform: rotate(-45deg);
      box-shadow: 3px 3px 0px rgb(var(--color-border));
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: ${Math.round(size * 0.35)}px;
        height: ${Math.round(size * 0.35)}px;
        background-color: white;
        border-radius: 50%;
        border: 2px solid rgb(var(--color-border));
      "></div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });

/** Pulsing "you are here" marker — pairs with the .pulse-ring keyframe. */
export const createCurrentLocationIcon = (L: any) =>
  L.divIcon({
    className: 'current-location-pin',
    html: `<div style="position:relative;width:20px;height:20px;">
      <div style="position:absolute;inset:0;border-radius:9999px;background:rgb(var(--color-secondary) / 0.5);animation:pulse-ring 1.8s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:absolute;inset:4px;border-radius:9999px;background:rgb(var(--color-secondary));border:2px solid white;box-shadow:0 0 0 2px rgb(var(--color-border));"></div>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

export interface MapPoint {
  id: string | number;
  lat: number;
  lng: number;
  color?: string;
}

export interface MapViewProps {
  points: MapPoint[];
  onPointClick?: (point: MapPoint) => void;
  currentLocation?: { lat: number; lng: number };
  center?: [number, number];
  zoom?: number;
  className?: string;
  /** Extra bottom padding so fitBounds doesn't hide pins behind a bottom sheet / nav. */
  bottomPadding?: number;
}

export const MapView = ({
  points,
  onPointClick,
  currentLocation,
  center = [52.52, 13.405],
  zoom = 13,
  className = '',
  bottomPadding = 260,
}: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const currentLocationMarkerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    loadLeaflet().then(() => {
      if (cancelled || mapInstanceRef.current || !mapRef.current || !window.L) return;
      const L = window.L;
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView(center, zoom);

      // Warm, low-saturation basemap so bright pins/markers stay the focal point.
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    Object.values(markersRef.current).forEach((m: any) => map.removeLayer(m));
    markersRef.current = {};

    points.forEach((point) => {
      const marker = L.marker([point.lat, point.lng], { icon: createPinIcon(L, point.color) }).addTo(map);
      if (onPointClick) marker.on('click', () => onPointClick(point));
      markersRef.current[point.id] = marker;
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { paddingBottomRight: [0, bottomPadding], paddingTopLeft: [20, 20] });
    }
  }, [points, onPointClick, bottomPadding]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !currentLocation) return;
    const L = window.L;
    if (currentLocationMarkerRef.current) {
      mapInstanceRef.current.removeLayer(currentLocationMarkerRef.current);
    }
    currentLocationMarkerRef.current = L.marker([currentLocation.lat, currentLocation.lng], {
      icon: createCurrentLocationIcon(L),
      zIndexOffset: 1000,
    }).addTo(mapInstanceRef.current);
  }, [currentLocation]);

  return (
    <div
      ref={mapRef}
      className={`w-full h-full bg-bg rounded-sheet border-thick border-border shadow-brutal-md overflow-hidden ${className}`}
      style={{ zIndex: 1 }}
    />
  );
};
