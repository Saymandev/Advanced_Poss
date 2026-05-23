'use client';
import { useEffect, useRef, useState } from 'react';
import {
  useMapEvents,
  Polygon,
  Circle,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface PolygonEditorProps {
  coordinates: number[][];
  onChange: (coords: number[][]) => void;
  center: [number, number];
  onCenterChange: (center: [number, number]) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  mode: 'polygon' | 'radius';
}

function MapClickHandler({
  mode,
  onAddPoint,
}: {
  mode: 'polygon' | 'radius';
  onAddPoint: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (mode === 'polygon') {
        onAddPoint(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function CenterMarker({
  center,
  onCenterChange,
  radius,
  mode,
}: {
  center: [number, number];
  onCenterChange: (center: [number, number]) => void;
  radius: number;
  mode: 'polygon' | 'radius';
}) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const pos = marker.getLatLng();
        onCenterChange([pos.lat, pos.lng]);
      }
    },
  };

  if (mode !== 'radius') return null;

  return (
    <>
      <Circle
        center={center}
        radius={radius}
        pathOptions={{
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 2,
        }}
      />
      <Marker
        draggable
        position={center}
        ref={markerRef}
        eventHandlers={eventHandlers}
      >
        <Popup>Drag to adjust zone center. Radius: {radius}m</Popup>
      </Marker>
    </>
  );
}

export default function PolygonEditor({
  coordinates,
  onChange,
  center,
  onCenterChange,
  radius,
  onRadiusChange,
  mode,
}: PolygonEditorProps) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length > 0 && mode === 'polygon') {
      const bounds = L.latLngBounds(coordinates.map(([lat, lng]) => [lat, lng] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, []);

  const addPoint = (lat: number, lng: number) => {
    onChange([...coordinates, [lat, lng]]);
  };

  const removePoint = (index: number) => {
    onChange(coordinates.filter((_, i) => i !== index));
  };

  const updatePoint = (index: number, lat: number, lng: number) => {
    const updated = [...coordinates];
    updated[index] = [lat, lng];
    onChange(updated);
  };

  if (mode === 'radius') {
    return (
      <>
        <MapClickHandler mode={mode} onAddPoint={() => {}} />
        <CenterMarker
          center={center}
          onCenterChange={onCenterChange}
          radius={radius}
          mode={mode}
        />
      </>
    );
  }

  return (
    <>
      <MapClickHandler mode={mode} onAddPoint={addPoint} />
      {coordinates.length > 2 && (
        <Polygon
          positions={coordinates.map(([lat, lng]) => [lat, lng] as [number, number])}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            weight: 2,
          }}
        />
      )}
      {coordinates.map(([lat, lng], index) => (
        <Marker
          key={index}
          position={[lat, lng]}
          draggable
          eventHandlers={{
            dragend(e) {
              const marker = e.target;
              const pos = marker.getLatLng();
              updatePoint(index, pos.lat, pos.lng);
            },
            contextmenu() {
              removePoint(index);
            },
          }}
        >
          <Popup>
            Point {index + 1}<br />
            [{lat.toFixed(4)}, {lng.toFixed(4)}]
            <br />
            <button
              onClick={() => removePoint(index)}
              className="text-red-600 text-xs mt-1 underline"
            >
              Remove
            </button>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
