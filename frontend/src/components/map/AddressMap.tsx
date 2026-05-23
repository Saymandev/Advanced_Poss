'use client';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { searchAddress, GeocodingResult } from './geocoding';

const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false });
const AddressMarker = dynamic(() => import('./AddressMarker'), { ssr: false });

interface AddressMapProps {
  value?: { lat?: number; lng?: number; address?: string };
  onChange?: (data: { lat: number; lng: number; address: string }) => void;
  height?: string;
}

export default function AddressMap({
  value,
  onChange,
  height = '300px',
}: AddressMapProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<{ lat: number; lng: number; address: string } | null>(
    value?.lat && value?.lng
      ? { lat: value.lat, lng: value.lng, address: value.address || '' }
      : null
  );

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchAddress(query);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleSelect = useCallback((result: GeocodingResult) => {
    const data = { lat: result.lat, lng: result.lon, address: result.displayName };
    setSelected(data);
    setResults([]);
    onChange?.(data);
  }, [onChange]);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    const data = { lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` };
    setSelected(data);
    onChange?.(data);
  }, [onChange]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search address..."
          className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-slate-900 dark:border-slate-700"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="border rounded-lg max-h-40 overflow-y-auto dark:border-slate-700">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-800 border-b last:border-0 dark:border-slate-700"
            >
              {r.displayName}
            </button>
          ))}
        </div>
      )}

      <MapComponent
        height={height}
        center={selected ? [selected.lat, selected.lng] : undefined}
        zoom={selected ? 16 : 12}
      >
        <AddressMarker
          position={selected ? [selected.lat, selected.lng] : null}
          onMapClick={handleMapClick}
        />
      </MapComponent>

      {selected && (
        <p className="text-xs text-gray-500 truncate">{selected.address}</p>
      )}
    </div>
  );
}
