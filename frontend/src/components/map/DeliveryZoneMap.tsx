'use client';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { LatLng, Map as LeafletMap } from 'leaflet';

const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false });
const PolygonEditor = dynamic(() => import('./PolygonEditor'), { ssr: false });

interface DeliveryZoneMapProps {
  initialCoordinates?: number[][];
  initialRadius?: number;
  initialCenter?: [number, number];
  onChange?: (data: {
    coordinates?: number[][];
    radius?: number;
    center?: [number, number];
  }) => void;
  mode?: 'polygon' | 'radius';
  height?: string;
}

export default function DeliveryZoneMap({
  initialCoordinates,
  initialRadius,
  initialCenter,
  onChange,
  mode: initialMode = 'polygon',
  height = '400px',
}: DeliveryZoneMapProps) {
  const [mode, setMode] = useState<'polygon' | 'radius'>(initialMode);
  const [coordinates, setCoordinates] = useState<number[][]>(initialCoordinates || []);
  const [center, setCenter] = useState<[number, number]>(initialCenter || [23.8103, 90.4125]);
  const [radius, setRadius] = useState<number>(initialRadius || 1000);

  const handleCoordinatesChange = useCallback((coords: number[][]) => {
    setCoordinates(coords);
    onChange?.({ coordinates: coords });
  }, [onChange]);

  const handleCenterChange = useCallback((newCenter: [number, number]) => {
    setCenter(newCenter);
    onChange?.({ center: newCenter, radius });
  }, [onChange, radius]);

  const handleRadiusChange = useCallback((newRadius: number) => {
    setRadius(newRadius);
    onChange?.({ center, radius: newRadius });
  }, [onChange, center]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={mode === 'polygon'}
            onChange={() => setMode('polygon')}
            className="text-primary-600"
          />
          Polygon Zone
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={mode === 'radius'}
            onChange={() => setMode('radius')}
            className="text-primary-600"
          />
          Radius Zone
        </label>
        {coordinates.length > 0 && (
          <span className="text-xs text-gray-500 ml-auto">
            {coordinates.length} points
          </span>
        )}
      </div>

      <MapComponent height={height}>
        <PolygonEditor
          coordinates={coordinates}
          onChange={handleCoordinatesChange}
          center={center}
          onCenterChange={handleCenterChange}
          radius={radius}
          onRadiusChange={handleRadiusChange}
          mode={mode}
        />
      </MapComponent>

      {mode === 'polygon' && coordinates.length > 0 && (
        <div className="text-xs text-gray-500 space-y-1">
          <p>Click on the map to add points. Drag points to adjust. Right-click to remove.</p>
          {coordinates.map((point, i) => (
            <span key={i} className="inline-block mr-2">
              [{point[0].toFixed(4)}, {point[1].toFixed(4)}]
            </span>
          ))}
        </div>
      )}

      {mode === 'radius' && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Radius (meters):</label>
          <input
            type="number"
            value={radius}
            onChange={(e) => handleRadiusChange(Number(e.target.value) || 500)}
            min={100}
            max={50000}
            step={100}
            className="px-3 py-1 border rounded text-sm w-32"
          />
          <span className="text-xs text-gray-400">
            Center: [{center[0].toFixed(4)}, {center[1].toFixed(4)}]
          </span>
        </div>
      )}
    </div>
  );
}
